namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static Task<List<RegistryFile>> GetAllFiles()
    {
        return Task.FromResult(new List<RegistryFile>
        {
            new(1, "abc", "def", 0, 0),
            new(2, "ghi", "jkl", 10, 20),
        });
    }

    public record RegistryFile(int Id, string Name, string? Url, decimal PercentCompletion, decimal PercentManualCompletion);
}

