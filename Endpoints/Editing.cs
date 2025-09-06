using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Editor;

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

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/api/registry-files");
        todosApi.MapGet("/{n:int}", GetDocument).Viewer();
        todosApi.MapGet("/{n:int}/download", DownloadDocument).Viewer();
        todosApi.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/paradigm-form-id", PutParadigmFormId).Editor();
        todosApi.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/lemma-tag", PutLemmaTags).Editor();
        todosApi.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/text", PutText).Editor();
        todosApi.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/comment", PutComment).Editor();
        todosApi.MapGet("/{id}/metadata", GetMetadata).Viewer();
        todosApi.MapPut("/{id}/metadata", PutMetadata).Editor();
    }

    public static async Task<CorpusDocumentView> GetDocument(int n, int skipUpToId = 0, int take = 20)
    {
        var corpusDocument = await AwsFilesCache.GetFile(n);
        return new CorpusDocumentView(
            corpusDocument.Header,
            corpusDocument.Paragraphs
                .SkipWhile(x => x.Id <= skipUpToId)
                .Take(take)
                .Select(p => new ParagraphView(p)
                {
                    Sentences = p.Sentences
                        .Select(s => new SentenceView(s)
                        {
                            SentenceItems = s.SentenceItems
                                .Select(si => new LinguisticItemView(si, si.Type == SentenceItemType.Word ? GrammarDB.LookupWord(si.Text).Select(x => x with { Lemma = Normalizer.NormalizeTypographicStress(x.Lemma) }) : [])),
                        }),
                }));
    }

    public static async Task<IResult> DownloadDocument(int n)
    {
        if (n < 0)
            throw new BadRequestException();

        try
        {
            var stream = await AwsFilesCache.GetRawFile(n);
            var fileName = $"{n}.verti";
            
            return Results.File(stream, "text/plain", fileName);
        }
        catch (FileNotFoundException)
        {
            throw new NotFoundException();
        }
    }

    public static async Task PutParadigmFormId(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] ParadigmFormId paradigmFormId)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await EditDocument(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, sentenceItem =>
        {
            var (lemma, linguisticTag) = GrammarDB.GetLemmaAndLinguisticTag(paradigmFormId);
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

    public static async Task PutLemmaTags(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LemmaTag lemmaTag)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await EditDocument(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
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

    public static async Task<IEnumerable<GrammarInfo>> PutText(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string text)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0 || string.IsNullOrEmpty(text))
            throw new BadRequestException();

        await EditDocument(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            ParadigmFormId = null,
            Text = text,
            Lemma = null,
            LinguisticTag = null,
            Metadata = si.Metadata == null
                ? null
                : si.Metadata with { ResolvedOn = null },
        });

        return GrammarDB.LookupWord(text);
    }

    public static async Task PutComment(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string comment)
    {
        if (n < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await EditDocument(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
        });
    }

    public static ValueTask<CorpusDocumentHeader> GetMetadata(int id)
    {
        return AwsFilesCache.GetDocumentHeader(id);
    }

    public static async Task PutMetadata(int id, UpdateMetadataRequest request)
    {
        var document = await AwsFilesCache.GetFile(id);
        lock (document)
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
        }

        AwsFilesCache.UpdateHeaderCache(id);
        await AwsFilesCache.FlushFile(id);
    }

    private static async Task EditDocument(int documentId, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, Func<LinguisticItem, LinguisticItem> transform)
    {
        var document = await AwsFilesCache.GetFile(documentId);
        lock (document)
        {
            var paragraphIndex = document.Paragraphs.BinarySearch(paragraphId, (pId, p) => pId - p.Id);
            if (paragraphIndex < 0)
                throw new NotFoundException();
            var paragraph = document.Paragraphs[paragraphIndex];
            if (paragraph.ConcurrencyStamp != paragraphStamp)
                throw new ConflictException();
            var sentenceIndex = paragraph.Sentences.BinarySearch(sentenceId, (sId, s) => sId - s.Id);
            if (sentenceIndex < 0)
                throw new NotFoundException();
            var sentence = paragraph.Sentences[sentenceIndex];
            if (sentence.ConcurrencyStamp != sentenceStamp)
                throw new ConflictException();

            if (sentence.SentenceItems.Count < wordIndex)
                throw new NotFoundException();

            var sentenceItem = sentence.SentenceItems[wordIndex];
            var transformedItem = transform(sentenceItem);
            sentence.SentenceItems[wordIndex] = transformedItem;
        }

        await AwsFilesCache.FlushFile(documentId);
    }
}