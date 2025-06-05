using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/{id}", GetDocument);
    }

    public static async Task<CorpusDocument> GetDocument(int id, int skip, int take, [FromServices] FilesCache files)
    {
        var corpusDocument = await files.GetFile(id);
        return corpusDocument with { Paragraphs = corpusDocument.Paragraphs.Skip(skip).Take(take) };
    }
}