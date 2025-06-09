using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/{id}", GetDocument);
    }

    public static async Task<CorpusDocumentView> GetDocument(int id, [FromServices] FilesCache files, int skip = 0, int take = 20)
    {
        var corpusDocument = await files.GetFile(id);
        return new CorpusDocumentView(corpusDocument.Header, corpusDocument.Paragraphs.Skip(skip).Take(take));
    }
}

public record CorpusDocumentView(CorpusDocumentHeader Header, IEnumerable<Paragraph> Paragraphs);
