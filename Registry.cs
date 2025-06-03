using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static async Task<IEnumerable<RegistryFile>> GetAllFiles(SqliteConnection connection)
    {
        using (connection)
        {
            connection.Open();
            return await connection.QueryAsync<RegistryFile>($"select {nameof(RegistryFile.Id)}, {nameof(RegistryFile.Name)}, {nameof(RegistryFile.Url)}, {nameof(RegistryFile.PercentCompletion)}, {nameof(RegistryFile.PercentManualCompletion)} from RegistryFile");
        }
    }

    public record RegistryFile(int Id, string Name, string? Url, decimal PercentCompletion, decimal PercentManualCompletion);
}

