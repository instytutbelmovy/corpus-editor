namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/api/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static ValueTask<ICollection<CorpusDocumentBasicInfo>> GetAllFiles()
    {
        return AwsFilesCache.GetAllDocumentHeaders();
    }
}
