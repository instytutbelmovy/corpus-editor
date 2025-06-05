using System.Globalization;
using System.Text;
using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.Data.Sqlite;

[module:DapperAot]

Console.OutputEncoding = Encoding.UTF8;
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateSlimBuilder(args);

var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
InitDatabase(dbConnectionString);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, EditorJsonSerializerContext.Default);
});
builder.Services.AddTransient(_ => new SqliteConnection(dbConnectionString));
builder.Services.AddSettings<Settings>(builder.Configuration);
builder.Services.AddSingleton<FilesCache>();

var app = builder.Build();

app.Services.InitLoggerFor(nameof(VertiReader), VertiReader.Initialize);
app.MapRegistry();
app.MapEditing();

app.Run();

return;

static void InitDatabase(string? connectionString)
{
    var connectionStringBuilder = new SqliteConnectionStringBuilder(connectionString);
    var dataSource = connectionStringBuilder.DataSource;

    var directory = Path.GetDirectoryName(dataSource);
    if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        Directory.CreateDirectory(directory);

    using var connection = new SqliteConnection(connectionString);
    connection.Open();
    Migrator.Migrate(connection);
}

