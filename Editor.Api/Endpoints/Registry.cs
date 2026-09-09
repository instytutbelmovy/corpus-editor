using Editor.Api.Infrastructure;
using Editor.Domain.Corpus;
using Editor.Services.Registry;

namespace Editor.Api;

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

        var jobs = builder.MapGroup("/api/upload-jobs");
        jobs.MapGet("/{jobId:guid}", GetUploadJob).Editor();
    }

    private static ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles(IRegistryService registryService)
        => registryService.GetAllFiles();

    private static Task<IEnumerable<string>> GetAllTypes(IRegistryService registryService)
        => registryService.GetAllTypes();

    private static Task<IEnumerable<string>> GetAllStyles(IRegistryService registryService)
        => registryService.GetAllStyles();

    private static Task<IEnumerable<string>> GetAllCorpora(IRegistryService registryService)
        => registryService.GetAllCorpora();

    /// <summary> Максымальны памер файла. Самы вялікі рэальны зыходнік - раман на 2.5 МБ. </summary>
    private const long MaxUploadBytes = 50 * 1024 * 1024;

    private static async Task<IResult> UploadFile(
        HttpRequest request,
        IRegistryService registryService,
        IUploadJobQueue uploadJobQueue)
    {
        if (!request.HasFormContentType)
            return Results.BadRequest("Expected multipart/form-data");

        var form = await request.ReadFormAsync();
        var file = form.Files.GetFile("file");
        if (file == null)
            return Results.BadRequest("'file' not present in the form");

        if (file.Length > MaxUploadBytes)
            return Results.BadRequest($"Файл завялікі: максымум {MaxUploadBytes / (1024 * 1024)} МБ");
        if (!int.TryParse(form["n"], out var n))
            return Results.BadRequest("'n' must be an integer");

        var fileExtension = Path.GetExtension(file.FileName);

        // Відавочныя памылкі (занятыя нумар, чужое пашырэньне) вяртаем адразу, а не праз хвіліны фонавай апрацоўкі
        await registryService.PreflightUpload(n, fileExtension);

        var buffer = new MemoryStream();
        await using (var stream = file.OpenReadStream())
            await stream.CopyToAsync(buffer);
        buffer.Position = 0;

        var status = uploadJobQueue.Enqueue(
            new DocumentUploadRequest(
                N: n,
                FileExtension: fileExtension,
                Content: buffer,
                Title: form["title"].ToString(),
                Url: form["url"].ToString(),
                PublicationDate: form["publicationDate"].ToString(),
                Type: form["type"].ToString(),
                Style: form["style"].ToString(),
                Corpus: form["corpus"].ToString()));

        return Results.Accepted($"/api/upload-jobs/{status.Id}", new UploadJobAccepted(status.Id));
    }

    private static IResult GetUploadJob(Guid jobId, IUploadJobQueue uploadJobQueue)
    {
        var status = uploadJobQueue.TryGetStatus(jobId);
        return status == null ? Results.NotFound() : Results.Ok(status);
    }

    private static async Task<IResult> DownloadFile(int n, IRegistryService registryService)
    {
        var (stream, fileName) = await registryService.DownloadFile(n);
        return Results.File(stream, "text/plain", fileName);
    }

    private static Task<ICollection<CorpusDocumentHeader>> ReloadFilesList(IRegistryService registryService)
        => registryService.ReloadFilesList();

    private static Task<CorpusDocumentHeader> ReloadFile(int n, IRegistryService registryService)
        => registryService.ReloadFile(n);
}
