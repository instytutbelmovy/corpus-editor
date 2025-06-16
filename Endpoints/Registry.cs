using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Registry
{
    private static Settings _settings;

    public static void Initialize(Settings settings)
    {
        _settings = settings;
    }

    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/api/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static async Task<IEnumerable<CorpusDocumentBasicInfo>> GetAllFiles()
    {
        var documentHeaders = await VertiIO.GetDocumentHeaders(_settings.FilesDirectory);
        for (int i = 0; i < documentHeaders.Count; i++)
        {
            var header = documentHeaders[i];
            if (header.PercentCompletion != null) continue;

            var readDocument = await VertiIO.ReadDocument(_settings.FilesDirectory, header.N);

            header = header with { PercentCompletion = readDocument.ComputeCompletion() };
            documentHeaders[i] = header;
            await VertiIO.UpdateDocumentHeader(_settings.FilesDirectory, header);
        }

        return documentHeaders.Select(x => new CorpusDocumentBasicInfo(x.N, x.Title, x.PercentCompletion.Value));
    }
}

public record CorpusDocumentBasicInfo(int Id, string? Title, int PercentCompletion);
