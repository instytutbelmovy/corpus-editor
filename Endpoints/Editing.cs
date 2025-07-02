using Microsoft.AspNetCore.Mvc;

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

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/api/registry-files");
        todosApi.MapGet("/{id:int}", GetDocument);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/paradigm-form-id", PutParadigmFormId);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/lemma-tag", PutLemmaTags);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/text", PutText);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/comment", PutComment);
    }

    public static async Task<CorpusDocumentView> GetDocument(int id, int skipUpToId = 0, int take = 20)
    {
        var corpusDocument = await FilesCache.GetFile(id);
        await GrammarDB.Initialized;
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
                                .Select(si => new LinguisticItemView(si, si.Type == SentenceItemType.Word ? GrammarDB.LookupWord(si.Text) : [])),
                        }),
                }));
    }

    public static async Task PutParadigmFormId(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] ParadigmFormId paradigmFormId)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await GrammarDB.Initialized;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await EditDocument(id, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, sentenceItem =>
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

    public static async Task PutLemmaTags(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LemmaTag lemmaTag)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await EditDocument(id, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
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

    public static async Task<IEnumerable<GrammarInfo>> PutText(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string text)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0 || string.IsNullOrEmpty(text))
            throw new BadRequestException();

        await EditDocument(id, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            ParadigmFormId = null,
            Text = text,
            Lemma = null,
            LinguisticTag = null,
            Metadata = si.Metadata == null
                ? null
                : si.Metadata with { ResolvedOn = null },
        });

        await GrammarDB.Initialized;
        return GrammarDB.LookupWord(text);
    }

    public static async Task PutComment(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string comment)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        await EditDocument(id, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, si => si with
        {
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
        });
    }

    private static async Task EditDocument(int documentId, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, Func<LinguisticItem, LinguisticItem> transform)
    {
        var document = await FilesCache.GetFile(documentId);
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

        await FilesCache.FlushFile(documentId);
    }
}