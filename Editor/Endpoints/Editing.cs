using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/registry-files");
        group.MapGet("/{n:int}", GetDocument).Viewer();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/paradigm-form-id", PutParadigmFormId).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/lemma-tag", PutLemmaTags).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/text", PutText).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/comment", PutComment).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/error-type", PutErrorType).Editor();
        group.MapPost("/{n:int}/edit", EditDocument).Validate<DocumentEditRequest>().Editor();
        group.MapGet("/{id}/metadata", GetMetadata).Viewer();
        group.MapPut("/{id}/metadata", PutMetadata).Editor();
    }

    public static async Task<CorpusDocumentView> GetDocument(int n, GrammarDb grammarDb, AwsFilesCache awsFilesCache, int skipUpToId = 0, int take = 20)
    {
        var corpusDocument = await awsFilesCache.GetFileForRead(n);
        foreach (var paragraph in corpusDocument.Paragraphs)
            foreach (var sentence in paragraph.Sentences)
                foreach (var sentenceItem in sentence.SentenceItems)
                    if (sentenceItem is { LinguisticTag: not null, ParadigmFormId: null })
                        grammarDb.AddCustomWord(sentenceItem.Text, new GrammarInfo(null, sentenceItem.LinguisticTag, sentenceItem.Lemma, null));
        return new CorpusDocumentView(
            corpusDocument.Header,
            corpusDocument.Paragraphs
                .SkipWhile(x => x.Id <= skipUpToId)
                .Take(take)
                .Select(p => MapParagraphToView(p, grammarDb)));
    }

    public static async Task PutParadigmFormId(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] ParadigmFormId paradigmFormId, GrammarDb grammarDb, AwsFilesCache awsFilesCache)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, awsFilesCache, sentenceItem =>
        {
            var (lemma, linguisticTag) = grammarDb.GetLemmaAndLinguisticTag(paradigmFormId);
            return sentenceItem with
            {
                ParadigmFormId = paradigmFormId,
                Lemma = lemma,
                LinguisticTag = linguisticTag,
                Metadata = sentenceItem.Metadata == null
                    ? new LinguisticItemMetadata(null, today)
                    : sentenceItem.Metadata with { ResolvedOn = today },
            };
        });
    }

    public static async Task PutLemmaTags(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LemmaTag lemmaTag, AwsFilesCache awsFilesCache)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, awsFilesCache, si => si with
        {
            ParadigmFormId = null,
            Lemma = lemmaTag.Lemma,
            // todo check fullness of linguistic tag and depending on that set ResolvedOn to null or today
            LinguisticTag = LinguisticTag.FromString(lemmaTag.LinguisticTag),
            Metadata = si.Metadata == null
                ? new LinguisticItemMetadata(null, today)
                : si.Metadata with { ResolvedOn = today },
        });
    }

    public static async Task<IEnumerable<GrammarInfo>> PutText(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string text, GrammarDb grammarDb, AwsFilesCache awsFilesCache)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0 || string.IsNullOrEmpty(text))
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, awsFilesCache, si => si with
        {
            ParadigmFormId = null,
            Text = text,
            Lemma = null,
            LinguisticTag = null,
            Metadata = si.Metadata == null
                ? null
                : si.Metadata with { ResolvedOn = null },
        });

        return grammarDb.LookupWord(text, pickCustomWords: true);
    }

    public static async Task PutComment(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string comment, AwsFilesCache awsFilesCache)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, awsFilesCache, si => si with
        {
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
        });
    }

    public static async Task PutErrorType(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LinguisticErrorType errorType, AwsFilesCache awsFilesCache)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, awsFilesCache, si => si with
        {
            Metadata = si.Metadata == null
                ? new LinguisticItemMetadata(null, null, errorType)
                : si.Metadata with { ErrorType = errorType },
        });
    }

    public static async Task<DocumentEditResponse> EditDocument(int n, DocumentEditRequest request, AwsFilesCache awsFilesCache, GrammarDb grammarDb)
    {
        var (documentLock, document) = await awsFilesCache.GetFileForWrite(n, markPendingChangesUponCompletion: false);
        using (documentLock)
        {
            var result = EditDocumentCore(document, request, paragraph => MapParagraphToView(paragraph, grammarDb));

            await awsFilesCache.FlushFile(n);
            return result;
        }
    }

    public static DocumentEditResponse EditDocumentCore(CorpusDocument document, DocumentEditRequest request, Func<Paragraph, ParagraphView> mapParagraphToView)
    {
        // Validation Phase
        var ongoingParagraphsCount = document.Paragraphs.Count;
        foreach (var paragraphOperation in request.Operations)
        {
            if (paragraphOperation.OperationType == OperationType.Create)
            {
                if (ongoingParagraphsCount + 1 < paragraphOperation.ParagraphId)
                    throw new NotFoundException();

                ongoingParagraphsCount++;

                continue;
            }

            if (paragraphOperation.OperationType is OperationType.Update or OperationType.Delete)
            {
                if (ongoingParagraphsCount < paragraphOperation.ParagraphId)
                    throw new NotFoundException();
                var idShift = ongoingParagraphsCount - document.Paragraphs.Count;
                var paragraphIndex = paragraphOperation.ParagraphId - 1 - idShift;
                if (document.Paragraphs[paragraphIndex].ConcurrencyStamp != paragraphOperation.ConcurrencyStamp)
                    throw new ConflictException();
            }

            if (paragraphOperation.OperationType == OperationType.Delete)
                ongoingParagraphsCount--;
        }

        // Execution Phase
        var editedParagraphs = new List<ParagraphView>();

        for (var operationIndex = 0; operationIndex < request.Operations.Count; operationIndex++)
        {
            var operation = request.Operations[operationIndex];

            if (operation.OperationType == OperationType.Create)
            {
                var newSentences = new List<Sentence>(operation.ReplacementSentences!.Count);
                foreach (var sentence in operation.ReplacementSentences)
                {
                    newSentences.Add(new Sentence(
                        Id: newSentences.Count + 1,
                        ConcurrencyStamp: Guid.NewGuid(),
                        SentenceItems: sentence
                    ));
                }

                var newParagraph = new Paragraph(
                    Id: operation.ParagraphId,
                    ConcurrencyStamp: Guid.NewGuid(),
                    Sentences: newSentences
                );

                document.Paragraphs.Insert(operation.ParagraphId - 1, newParagraph);

                editedParagraphs.Add(mapParagraphToView(newParagraph));
            }
            else if (operation.OperationType == OperationType.Delete)
            {
                document.Paragraphs.RemoveAt(operation.ParagraphId - 1);
            }
            else if (operation.OperationType == OperationType.Update)
            {
                var paragraph = document.Paragraphs[operation.ParagraphId - 1];

                var newSentences = new List<Sentence>(operation.ReplacementSentences!.Count);
                foreach (var sentence in operation.ReplacementSentences)
                {
                    newSentences.Add(new Sentence(
                        Id: newSentences.Count + 1,
                        ConcurrencyStamp: Guid.NewGuid(),
                        SentenceItems: sentence
                    ));
                }

                paragraph = new Paragraph(operation.ParagraphId, Guid.NewGuid(), newSentences);
                document.Paragraphs[operation.ParagraphId - 1] = paragraph;
                editedParagraphs.Add(mapParagraphToView(paragraph));
            }

            int nextTouchedParagraphId;
            if (operationIndex + 1 < request.Operations.Count)
            {
                var nextOperation = request.Operations[operationIndex + 1];
                nextTouchedParagraphId = nextOperation.ParagraphId;
            }
            else
                nextTouchedParagraphId = document.Paragraphs.Count + 1;

            var updateIdsFrom = operation.OperationType == OperationType.Delete ? operation.ParagraphId - 1 : operation.ParagraphId;
            for (var p = updateIdsFrom; p < nextTouchedParagraphId - 1; p++)
                document.Paragraphs[p] = document.Paragraphs[p] with { Id = p + 1 };
        }



        var result = new DocumentEditResponse(editedParagraphs);
        return result;
    }

    private static ParagraphView MapParagraphToView(Paragraph p, GrammarDb grammarDb)
    {
        return new ParagraphView(p)
        {
            Sentences = p.Sentences.Select(s => new SentenceView(s)
            {
                SentenceItems = s.SentenceItems.Select(si => new LinguisticItemView(
                    si,
                    si.Type == SentenceItemType.Word
                        ? grammarDb.LookupWord(si.Text, pickCustomWords: true)
                        : []
                ))
            })
        };
    }

    public static ValueTask<CorpusDocumentHeader> GetMetadata(int id, AwsFilesCache awsFilesCache)
    {
        return awsFilesCache.GetDocumentHeader(id);
    }

    public static async Task PutMetadata(int id, UpdateMetadataRequest request, AwsFilesCache awsFilesCache)
    {
        var (documentLock, document) = await awsFilesCache.GetFileForWrite(id, markPendingChangesUponCompletion: true);
        using (documentLock)
        {
            var header = document.Header;
            document.Header = header with
            {
                Title = request.Title,
                Url = request.Url,
                PublicationDate = request.PublicationDate,
                Type = request.Type,
                Style = request.Style,
            };
            awsFilesCache.UpdateHeaderCache(id, document.Header);
        }
    }

    private static async Task MarkupWord(int documentId, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, AwsFilesCache awsFilesCache, Func<LinguisticItem, LinguisticItem> transform)
    {
        var (documentLock, document) = await awsFilesCache.GetFileForWrite(documentId, markPendingChangesUponCompletion: true);
        using (documentLock)
        {
            var paragraphIndex = paragraphId - 1;
            if (paragraphIndex < 0 || document.Paragraphs.Count <= paragraphIndex)
                throw new NotFoundException();
            var paragraph = document.Paragraphs[paragraphIndex];
            if (paragraph.ConcurrencyStamp != paragraphStamp)
                throw new ConflictException();
            var sentenceIndex = sentenceId - 1;
            if (sentenceIndex < 0 || paragraph.Sentences.Count <= sentenceIndex)
                throw new NotFoundException();
            var sentence = paragraph.Sentences[sentenceIndex];
            if (sentence.ConcurrencyStamp != sentenceStamp)
                throw new ConflictException();

            // Should I make word indexes 1-based for consistency? Yes.
            if (wordIndex < 0 || sentence.SentenceItems.Count < wordIndex)
                throw new NotFoundException();

            var sentenceItem = sentence.SentenceItems[wordIndex];
            var transformedItem = transform(sentenceItem);
            sentence.SentenceItems[wordIndex] = transformedItem;
        }
    }
}

public record CorpusDocumentView(CorpusDocumentHeader Header, IEnumerable<ParagraphView> Paragraphs);

public record ParagraphView(int Id, Guid ConcurrencyStamp)
{
    public ParagraphView(Paragraph paragraph) : this(paragraph.Id, paragraph.ConcurrencyStamp)
    {
    }

    public required IEnumerable<SentenceView> Sentences { get; init; }
}

public record SentenceView(int Id, Guid ConcurrencyStamp)
{
    public SentenceView(Sentence sentence) : this(sentence.Id, sentence.ConcurrencyStamp) { }

    public required IEnumerable<LinguisticItemView> SentenceItems { get; init; }
}

public record LinguisticItemView(LinguisticItem LinguisticItem, IEnumerable<GrammarInfo> Options);

public record LemmaTag(string Lemma, string LinguisticTag);

public record UpdateMetadataRequest(
    string Title,
    string? Url,
    string? PublicationDate,
    string? Type,
    string? Style
);

public record DocumentEditRequest(List<ParagraphOperation> Operations);

public record ParagraphOperation
{
    /// <summary> For Create operations, this is the ID at which the new paragraph will be inserted, shifting the paragraph that previously had this id to have ID = ID + 1 </summary>
    public required int ParagraphId { get; set; }
    public required OperationType OperationType { get; set; }

    /// <summary> Will be null only for deletion </summary>
    public List<List<LinguisticItem>>? ReplacementSentences { get; set; } = null;
    public Guid? ConcurrencyStamp { get; set; }
}

public enum OperationType
{
    Delete = -1,
    Update = 0,
    Create = 1,
}

public record DocumentEditResponse(IList<ParagraphView> EditedParagraphs);

public record IdShift(int Id, int Shift);

public class DocumentEditRequestValidator : AbstractValidator<DocumentEditRequest>
{
    public DocumentEditRequestValidator()
    {
        RuleFor(x => x.Operations).NotEmpty();
        RuleFor(x => x.Operations)
            .Must(x =>
            {
                var previousId = -1;
                var previousOperationType = (OperationType)42; // invalid
                foreach (var op in x)
                {
                    if (op.ParagraphId < previousId || (op.ParagraphId == previousId && previousOperationType != OperationType.Delete))
                        return false;
                    previousId = op.ParagraphId;
                    previousOperationType = op.OperationType;
                }
                return true;
            })
            .WithMessage($"{nameof(ParagraphOperation.ParagraphId)} must go in non-decreasing order, and can only equal previous if it's a {nameof(OperationType.Delete)}");
        RuleForEach(x => x.Operations).SetValidator(new ParagraphOperationValidator());
    }
}

public class ParagraphOperationValidator : AbstractValidator<ParagraphOperation>
{
    public ParagraphOperationValidator()
    {
        RuleFor(x => x.ParagraphId).GreaterThan(0);
        RuleFor(x => x.OperationType).IsInEnum();
        RuleFor(x => x.ReplacementSentences).NotEmpty().When(x => x.OperationType is OperationType.Create or OperationType.Update);
        RuleFor(x => x.ConcurrencyStamp).NotEmpty().When(x => x.OperationType == OperationType.Update);
    }
}

public class LinguisticItemValidator : AbstractValidator<LinguisticItem>
{
    public LinguisticItemValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Text).NotEmpty().When(x => x.Type is SentenceItemType.Word or SentenceItemType.Punctuation);
    }
}