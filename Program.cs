using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Identity;

[module: DapperAot]


Console.OutputEncoding = Encoding.UTF8;
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;


var builder = WebApplication.CreateSlimBuilder(args);
ConfigureServices(builder);


var app = builder.Build();
ConfigurePipeline(app);


await app.RunAsync();

return;


static void ConfigureServices(WebApplicationBuilder builder)
{
    builder.WebHost.UseStaticWebAssets();

    var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
    InitDatabase(dbConnectionString);

    builder.Services.ConfigureHttpJsonOptions(options =>
    {
        options.SerializerOptions.TypeInfoResolverChain.Insert(0, EditorJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(1, VertiJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(2, AuthJsonSerializerContext.Default);
    });

    builder.Services.AddAuthentication();
    builder.Services.AddAuthorization();
    builder.Services.AddIdentityCore<EditorUser>(o =>
        {
            o.User.RequireUniqueEmail = true;

            builder.Configuration.Bind("Identity:Password", o.Password);
        })
        .AddDefaultTokenProviders()
        ;

    var editorUserStore = new EditorUserStore(dbConnectionString);
    builder.Services.AddSingleton(editorUserStore);
    builder.Services.AddSingleton<IUserStore<EditorUser>>(editorUserStore);

    var settings = new Settings();
    builder.Configuration.Bind(nameof(Settings), settings);

    var awsSettings = new AwsSettings();
    builder.Configuration.Bind(nameof(AwsSettings), awsSettings);
    builder.Services.AddSingleton(awsSettings);
    if (string.IsNullOrEmpty(awsSettings.AccessKeyId) || string.IsNullOrEmpty(awsSettings.SecretAccessKey))
        throw new InvalidOperationException("AWS credentials are not configured. Please set 'AwsSettings:AccessKeyId' and 'AwsSettings:SecretAccessKey' in the configuration.");

    GrammarDB.Initialize(settings.GrammarDbPath);
}

static void ConfigurePipeline(WebApplication app)
{
    ExceptionMiddleware.Initialize(app.Services.GetLoggerFor(nameof(ExceptionMiddleware)));
    app.Services.InitLoggerFor(nameof(VertiIO), VertiIO.InitializeLogging);
    app.Services.InitLoggerFor(nameof(GrammarDB), GrammarDB.InitializeLogging);
    app.Services.InitLoggerFor(nameof(AwsFilesCache), AwsFilesCache.InitializeLogging);
    AwsFilesCache.Initialize(app.Services.GetRequiredService<AwsSettings>());

    app.UseRewriter(new RewriteOptions()
        .Add(context => SpaUrlRewrites.DoRewrite(context, app.Services)));
    app.MapStaticAssets();
    app.Use(ExceptionMiddleware.HandleException);
    app.UseAuthentication();
    app.MapRegistry();
    app.MapEditing();
    app.MapAuth();

    app.MapFallbackToFile("404.html");
}

static void InitDatabase(string connectionString)
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