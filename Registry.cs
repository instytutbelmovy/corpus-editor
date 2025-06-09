using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static async Task<IEnumerable<CorpusDocumentBasicInfo>> GetAllFiles([FromServices] Settings settings)
    {
        var documentHeaders = await VertiIO.GetDocumentHeaders(settings.FilesDirectory);
        for (int i = 0; i < documentHeaders.Count; i++)
        {
            var header = documentHeaders[i];
            if (header.PercentCompletion != null) continue;

            var readDocument = await VertiIO.ReadDocument(settings.FilesDirectory, header.N);

            header = header with { PercentCompletion = readDocument.ComputeCompletion() };
            documentHeaders[i] = header;
            await VertiIO.UpdateDocumentHeader(settings.FilesDirectory, header);
        }

        return documentHeaders.Select(x => new CorpusDocumentBasicInfo(x.N, x.Title, x.PercentCompletion.Value));
    }
}

public record CorpusDocumentBasicInfo(int Id, string? Title, int PercentCompletion);
