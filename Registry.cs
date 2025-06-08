using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;

namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/registry-files");
        todosApi.MapGet("/", GetAllFiles);
    }

    public static async Task<IEnumerable<RegistryFileDto>> GetAllFiles(SqliteConnection connection, [FromServices] Settings settings)
    {
        using (connection)
        {
            connection.Open();
            var registryFiles = await connection.QueryAsync<RegistryFile>($"select {nameof(RegistryFile.Id)}, {nameof(RegistryFile.PercentCompletion)}, {nameof(RegistryFile.PercentManualCompletion)} from RegistryFile");
            var documents = await VertiIO.GetDocuments(settings.FilesDirectory);
            return registryFiles.Join(documents, x => x.Id, x => x.N, (registryFile, corpusDocument) => new RegistryFileDto(registryFile.Id, corpusDocument.Title, registryFile.PercentCompletion, registryFile.PercentManualCompletion));
        }
    }
}