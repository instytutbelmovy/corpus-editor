using Microsoft.AspNetCore.Mvc;

namespace Editor;

public record CorpusDocumentView(CorpusDocumentHeader Header, IEnumerable<ParagraphView> Paragraphs);

public record ParagraphView(int Id, Guid ConcurrencyStamp)
{
    public ParagraphView(Paragraph paragraph) : this(paragraph.Id, paragraph.ConcurrencyStamp)
    {
    }

    public IEnumerable<SentenceView> Sentences { get; init; } = null!;
}

public record SentenceView(int Id, Guid ConcurrencyStamp)
{
    public SentenceView(Sentence sentence) : this(sentence.Id, sentence.ConcurrencyStamp) { }

    public IEnumerable<LinguisticItemView> SentenceItems { get; init; } = null!;
}

public record LinguisticItemView(LinguisticItem LinguisticItem, IEnumerable<GrammarInfo> Options);

public record LemmaTag(string Lemma, string LinguisticTag);

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/{id:int}", GetDocument);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/paradigm-form-id", PutParadigmFormId);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/lemma-tag", PutLemmaTags);
        todosApi.MapPut("/{id:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/text", PutText);
    }

    public static async Task<CorpusDocumentView> GetDocument(int id, [FromServices] FilesCache files, int skipUpToId = 0, int take = 10)
    {
        var corpusDocument = await files.GetFile(id);
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

    public static async Task PutParadigmFormId(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] ParadigmFormId paradigmFormId, [FromServices] FilesCache files)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var corpusDocument = await files.GetFile(id);
        var paragraphIndex = corpusDocument.Paragraphs.BinarySearch(paragraphId, (pId, p) => pId - p.Id);
        if (paragraphIndex < 0)
            throw new NotFoundException();
        var paragraph = corpusDocument.Paragraphs[paragraphIndex];
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
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var grammarInfo = GrammarDB.GetBy(paradigmFormId);
        sentenceItem = sentenceItem with
        {
            ParadigmFormId = paradigmFormId,
            Lemma = grammarInfo.Lemma,
            LinguisticTag = grammarInfo.LinguisticTag,
            Metadata = sentenceItem.Metadata == null
                ? new LinguisticItemMetadata(null, today)
                : sentenceItem.Metadata with { ResolvedOn = today },
        };
        sentence.SentenceItems[sentenceIndex] = sentenceItem;
    }

    public static async Task PutLemmaTags(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LemmaTag lemmaTag, [FromServices] FilesCache files)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0)
            throw new BadRequestException();

        var corpusDocument = await files.GetFile(id);
        var paragraphIndex = corpusDocument.Paragraphs.BinarySearch(paragraphId, (pId, p) => pId - p.Id);
        if (paragraphIndex < 0)
            throw new NotFoundException();
        var paragraph = corpusDocument.Paragraphs[paragraphIndex];
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
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        sentenceItem = sentenceItem with
        {
            ParadigmFormId = null,
            Lemma = lemmaTag.Lemma,
            // todo check fullness of linguistic tag and depending on that set ResolvedOn to null or today
            LinguisticTag = LinguisticTag.FromString(lemmaTag.LinguisticTag),
            Metadata = sentenceItem.Metadata == null
                ? new LinguisticItemMetadata(null, today)
                : sentenceItem.Metadata with { ResolvedOn = today },
        };
        sentence.SentenceItems[sentenceIndex] = sentenceItem;
    }

    public static async Task<IEnumerable<GrammarInfo>> PutText(int id, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string text, [FromServices] FilesCache files)
    {
        if (id < 0 || paragraphId < 0 || sentenceId < 0 || string.IsNullOrEmpty(text))
            throw new BadRequestException();

        var corpusDocument = await files.GetFile(id);
        var paragraphIndex = corpusDocument.Paragraphs.BinarySearch(paragraphId, (pId, p) => pId - p.Id);
        if (paragraphIndex < 0)
            throw new NotFoundException();
        var paragraph = corpusDocument.Paragraphs[paragraphIndex];
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
        sentenceItem = sentenceItem with
        {
            ParadigmFormId = null,
            Text = text,
            Lemma = null,
            LinguisticTag = null,
            Metadata = sentenceItem.Metadata == null
                ? null
                : sentenceItem.Metadata with { ResolvedOn = null },
        };
        sentence.SentenceItems[sentenceIndex] = sentenceItem;

        return GrammarDB.LookupWord(text);
    }
}