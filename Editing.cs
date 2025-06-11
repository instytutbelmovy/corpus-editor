using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/{id:int}", GetDocument);
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
}

public record CorpusDocumentView(CorpusDocumentHeader Header, IEnumerable<ParagraphView> Paragraphs);

public record ParagraphView(int Id, Guid ConcurrencyStamp)
{
    public ParagraphView(Paragraph paragraph) : this(paragraph.Id, paragraph.ConcurrencyStamp) { 
    }

    public IEnumerable<SentenceView> Sentences { get; init; }
}

public record SentenceView(int Id, Guid ConcurrencyStamp)
{
    public SentenceView(Sentence sentence) : this(sentence.Id, sentence.ConcurrencyStamp) { }

    public IEnumerable<LinguisticItemView> SentenceItems { get; init; }
}

public record LinguisticItemView(LinguisticItem LinguisticItem, IEnumerable<GrammarInfo> Options);