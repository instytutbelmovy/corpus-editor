using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Corpus;
using Editor.Services.Exceptions;
using Editor.Services.Grammar;

namespace Editor.Services.Editing;

public interface IEditingService
{
    Task<CorpusDocumentView> GetDocument(int n, int skipUpToId = 0, int take = 20);
    Task PutParadigmFormId(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, ParadigmFormId paradigmFormId);
    Task PutLemmaTags(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, LemmaTag lemmaTag);
    Task<IEnumerable<GrammarInfo>> PutText(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, string text);
    Task PutComment(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, string comment);
    Task PutErrorType(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, LinguisticErrorType errorType);
    Task<DocumentEditResponse> EditDocument(int n, DocumentEditRequest request);
    ValueTask<CorpusDocumentHeader> GetMetadata(int id);
    Task PutMetadata(int id, UpdateMetadataRequest request);
}

public class EditingService(IGrammarDb grammarDb, IAwsFilesCache awsFilesCache) : IEditingService
{
    public async Task<CorpusDocumentView> GetDocument(int n, int skipUpToId = 0, int take = 20)
    {
        var corpusDocument = await awsFilesCache.GetFileForRead(n);
        // Single snapshot of the list — a concurrent edit swaps the reference, but never mutates it
        var paragraphs = corpusDocument.Paragraphs;
        var pageParagraphs = paragraphs
            .SkipWhile(x => x.Id <= skipUpToId)
            .Take(take)
            .ToList();
        var options = await LookupParagraphWords(pageParagraphs);
        return new CorpusDocumentView(
            corpusDocument.Header,
            pageParagraphs.Select(p => MapParagraphToView(p, options)));
    }

    public async Task PutParadigmFormId(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, ParadigmFormId paradigmFormId)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (lemma, linguisticTag) = await grammarDb.GetLemmaAndLinguisticTag(paradigmFormId);
        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, sentenceItem =>
            sentenceItem with
            {
                ParadigmFormId = paradigmFormId,
                Lemma = lemma,
                LinguisticTag = linguisticTag,
                Metadata = sentenceItem.Metadata == null
                    ? new LinguisticItemMetadata(null, today)
                    : sentenceItem.Metadata with { ResolvedOn = today },
            });
    }

    public async Task PutLemmaTags(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, LemmaTag lemmaTag)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
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

    public async Task<IEnumerable<GrammarInfo>> PutText(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, string text)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0 || string.IsNullOrEmpty(text))
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            ParadigmFormId = null,
            Text = text,
            Lemma = null,
            LinguisticTag = null,
            Metadata = si.Metadata == null
                ? null
                : si.Metadata with { ResolvedOn = null },
        });

        return await grammarDb.LookupWord(text);
    }

    public async Task PutComment(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, string comment)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
        });
    }

    public async Task PutErrorType(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, LinguisticErrorType errorType)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await MarkupWord(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            Metadata = si.Metadata == null
                ? new LinguisticItemMetadata(null, null, errorType)
                : si.Metadata with { ErrorType = errorType },
        });
    }

    public async Task<DocumentEditResponse> EditDocument(int n, DocumentEditRequest request)
    {
        var (documentLock, document) = await awsFilesCache.GetFileForWrite(n, markPendingChangesUponCompletion: false);
        using (documentLock)
        {
            // Адзін пакетны пошук граматыкі загадзя, каб мапэр абзацаў застаўся сынхронным
            var words = request.Operations
                .Where(op => op.ReplacementSentences != null)
                .SelectMany(op => op.ReplacementSentences!)
                .SelectMany(sentence => sentence)
                .Where(si => si.Type == SentenceItemType.Word)
                .Select(si => si.Text)
                .ToList();
            var options = await grammarDb.LookupWords(words);

            var result = EditDocumentCore(document, request,
                paragraph => MapParagraphToView(paragraph, options));

            await awsFilesCache.FlushFile(n);
            return result;
        }
    }

    public static DocumentEditResponse EditDocumentCore(CorpusDocument document, DocumentEditRequest request, Func<Paragraph, ParagraphView> mapParagraphToView)
    {
        // Edits are applied to a copy of the list and swapped in atomically at the end, so concurrent
        // readers never see a half-edited document and a failed request leaves it untouched
        var paragraphs = new List<Paragraph>(document.Paragraphs);

        // Validation Phase
        var ongoingParagraphsCount = paragraphs.Count;
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
                var idShift = ongoingParagraphsCount - paragraphs.Count;
                var paragraphIndex = paragraphOperation.ParagraphId - 1 - idShift;
                if (paragraphs[paragraphIndex].ConcurrencyStamp != paragraphOperation.ConcurrencyStamp)
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

                paragraphs.Insert(operation.ParagraphId - 1, newParagraph);

                editedParagraphs.Add(mapParagraphToView(newParagraph));
            }
            else if (operation.OperationType == OperationType.Delete)
            {
                paragraphs.RemoveAt(operation.ParagraphId - 1);
            }
            else if (operation.OperationType == OperationType.Update)
            {
                var paragraph = paragraphs[operation.ParagraphId - 1];

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
                paragraphs[operation.ParagraphId - 1] = paragraph;
                editedParagraphs.Add(mapParagraphToView(paragraph));
            }

            int nextTouchedParagraphId;
            if (operationIndex + 1 < request.Operations.Count)
            {
                var nextOperation = request.Operations[operationIndex + 1];
                nextTouchedParagraphId = nextOperation.ParagraphId;
            }
            else
                nextTouchedParagraphId = paragraphs.Count + 1;

            var updateIdsFrom = operation.OperationType == OperationType.Delete ? operation.ParagraphId - 1 : operation.ParagraphId;
            for (var p = updateIdsFrom; p < nextTouchedParagraphId - 1; p++)
                paragraphs[p] = paragraphs[p] with { Id = p + 1 };
        }

        document.Paragraphs = paragraphs;

        var result = new DocumentEditResponse(editedParagraphs);
        return result;
    }

    public ValueTask<CorpusDocumentHeader> GetMetadata(int id)
    {
        return awsFilesCache.GetDocumentHeader(id);
    }

    public async Task PutMetadata(int id, UpdateMetadataRequest request)
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
                Corpus = request.Corpus,
            };
            awsFilesCache.UpdateHeaderCache(id, document.Header);
        }
    }

    private static ParagraphView MapParagraphToView(Paragraph p, IReadOnlyDictionary<string, List<GrammarInfo>> options)
    {
        return new ParagraphView(p)
        {
            Sentences = p.Sentences.Select(s => new SentenceView(s)
            {
                SentenceItems = s.SentenceItems.Select(si => new LinguisticItemView(
                    si,
                    si.Type == SentenceItemType.Word && options.TryGetValue(si.Text, out var wordOptions)
                        ? wordOptions
                        : []
                ))
            })
        };
    }

    /// <summary> Збор словаў абзацаў і адзін пакетны пошук граматыкі на ўсе іх </summary>
    private async Task<Dictionary<string, List<GrammarInfo>>> LookupParagraphWords(IEnumerable<Paragraph> paragraphs)
    {
        var words = paragraphs
            .SelectMany(p => p.Sentences)
            .SelectMany(s => s.SentenceItems)
            .Where(si => si.Type == SentenceItemType.Word)
            .Select(si => si.Text)
            .ToList();
        return await grammarDb.LookupWords(words);
    }

    private async Task MarkupWord(int documentId, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, Func<LinguisticItem, LinguisticItem> transform)
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
            if (wordIndex < 0 || sentence.SentenceItems.Count <= wordIndex)
                throw new NotFoundException();

            var sentenceItem = sentence.SentenceItems[wordIndex];
            var transformedItem = transform(sentenceItem);
            sentence.SentenceItems[wordIndex] = transformedItem;
        }
    }
}
