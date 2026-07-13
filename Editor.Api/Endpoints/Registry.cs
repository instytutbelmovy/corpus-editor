namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/registry-files");
        group.MapGet("/", GetAllFiles).Viewer();
        group.MapGet("/types", GetAllTypes).Viewer();
        group.MapGet("/styles", GetAllStyles).Viewer();
        group.MapGet("/corpora", GetAllCorpora).Viewer();
        group.MapPost("/", UploadFile).Editor();
        group.MapGet("/{n:int}/download", DownloadFile).Viewer();
        group.MapPost("/refresh", ReloadFilesList).Admin();
        group.MapPost("/{n:int}/refresh", ReloadFile).Admin();
    }

    private static ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles(RegistryService registryService)
        => registryService.GetAllFiles();

    private static Task<IEnumerable<string>> GetAllTypes(RegistryService registryService)
        => registryService.GetAllTypes();

    private static Task<IEnumerable<string>> GetAllStyles(RegistryService registryService)
        => registryService.GetAllStyles();

    private static Task<IEnumerable<string>> GetAllCorpora(RegistryService registryService)
        => registryService.GetAllCorpora();

    private static async Task<IResult> UploadFile(HttpRequest request, RegistryService registryService)
    {
        if (!request.HasFormContentType)
            return Results.BadRequest("Expected multipart/form-data");

        var form = await request.ReadFormAsync();
        var file = form.Files.GetFile("file");
        if (file == null)
            return Results.BadRequest("'file' not present in the form");

        await using var stream = file.OpenReadStream();
        await registryService.UploadFile(new DocumentUploadRequest(
            N: Convert.ToInt32(form["n"]),
            FileExtension: Path.GetExtension(file.FileName),
            Content: stream,
            Title: form["title"].ToString(),
            Url: form["url"].ToString(),
            PublicationDate: form["publicationDate"].ToString(),
            Type: form["type"].ToString(),
            Style: form["style"].ToString(),
            Corpus: form["corpus"].ToString()));

        return Results.Ok();
    }

    private static async Task<IResult> DownloadFile(int n, RegistryService registryService)
    {
        var (stream, fileName) = await registryService.DownloadFile(n);
        return Results.File(stream, "text/plain", fileName);
    }

    private static Task<ICollection<CorpusDocumentHeader>> ReloadFilesList(RegistryService registryService)
        => registryService.ReloadFilesList();

    private static Task<CorpusDocumentHeader> ReloadFile(int n, RegistryService registryService)
        => registryService.ReloadFile(n);
}
