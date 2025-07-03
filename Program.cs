using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text;

[module: DapperAot]

Console.OutputEncoding = Encoding.UTF8;
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateSlimBuilder(args);
builder.WebHost.UseStaticWebAssets();

var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
InitDatabase(dbConnectionString);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, EditorJsonSerializerContext.Default);
    options.SerializerOptions.TypeInfoResolverChain.Insert(1, VertiJsonSerializerContext.Default);
});
builder.Services.AddTransient(_ => new SqliteConnection(dbConnectionString));

var settings = new Settings();
builder.Configuration.Bind(nameof(Settings), settings);

FilesCache.Initialize(settings);
GrammarDB.Initialize(settings.GrammarDbPath);

var app = builder.Build();

ExceptionMiddleware.Initialize(app.Environment, app.Services.GetLoggerFor(nameof(ExceptionMiddleware)));
app.Services.InitLoggerFor(nameof(VertiIO), VertiIO.InitializeLogging);
app.Services.InitLoggerFor(nameof(GrammarDB), GrammarDB.InitializeLogging);

app.UseRewriter(new RewriteOptions()
    .Add(context => SpaUrlRewrites.DoRewrite(context, app.Services)));
app.MapStaticAssets();
app.Use(ExceptionMiddleware.HandleException);
app.MapRegistry();
app.MapEditing();

app.MapFallbackToFile("404.html");

await app.RunAsync();

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