using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.Data.Sqlite;

[module:DapperAot]

var builder = WebApplication.CreateSlimBuilder(args);

var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
using (var connection = new SqliteConnection(dbConnectionString))
{
    connection.Open();
    Migrator.Migrate(connection);
}

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, Editor.EditorJsonSerializerContext.Default);
});
builder.Services.AddTransient(_ => new SqliteConnection(dbConnectionString));

var app = builder.Build();

app.MapRegistry();

app.Run();

