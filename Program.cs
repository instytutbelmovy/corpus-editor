using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Net;
using System.Text;

[module: DapperAot]


Console.OutputEncoding = Encoding.UTF8;
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;


var builder = WebApplication.CreateSlimBuilder(args);
ConfigureServices(builder);
ConfigureIdentity(builder);


var app = builder.Build();
ConfigurePipeline(app);

await app.RunAsync();

return;


static void ConfigureServices(WebApplicationBuilder builder)
{
    var sentrySettings = new SentrySettings();
    builder.Configuration.Bind("Sentry", sentrySettings);
    sentrySettings.Environment = builder.Environment.IsProduction() ? "production" : "development";
    builder.Services.AddSingleton(sentrySettings);
    builder.WebHost.UseSentry(o =>
    {
        o.Dsn = sentrySettings.Dsn;
        o.Release = sentrySettings.Version;
        o.Environment = sentrySettings.Environment;
    });

    builder.WebHost.UseStaticWebAssets();

    var settings = new Settings();
    builder.Configuration.Bind("Settings", settings);
    builder.Services.AddSingleton(settings);

    var awsSettings = new AwsSettings();
    builder.Configuration.Bind("Aws", awsSettings);
    builder.Services.AddSingleton(awsSettings);
    if (string.IsNullOrEmpty(awsSettings.AccessKeyId) || string.IsNullOrEmpty(awsSettings.SecretAccessKey))
        throw new InvalidOperationException("AWS credentials are not configured. Please set 'AwsSettings:AccessKeyId' and 'AwsSettings:SecretAccessKey' in the configuration.");

    builder.Services.AddSingleton(typeof(IDbSynchronizer), settings.SyncEditorDbWithAws ? typeof(DbSynchronizer) : typeof(NullDbSynchronizer));

    builder.Services.ConfigureHttpJsonOptions(options =>
    {
        options.SerializerOptions.TypeInfoResolverChain.Insert(0, InfrastructureJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(1, EditorJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(2, VertiJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(3, AuthJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(4, AdministrationJsonSerializerContext.Default);
    });

    var dbConnectionString = $"Data Source={settings.EditorDbPath}";
    var editorUserStore = new EditorUserStore(dbConnectionString);
    builder.Services.AddSingleton(editorUserStore);
    builder.Services.AddSingleton<IUserStore<EditorUser>>(editorUserStore);

    var emailSettings = new EmailSettings();
    builder.Configuration.Bind("Email", emailSettings);
    builder.Services.AddSingleton(emailSettings);
    if (string.IsNullOrEmpty(emailSettings.Domain) || string.IsNullOrEmpty(emailSettings.ApiKey))
        throw new InvalidOperationException("Email SMTP settings are not configured. Please set 'EmailSettings:SmtpHost' and 'EmailSettings:SmtpPort' in the configuration.");
    builder.Services.AddHttpClient<EmailService>();

    var reCaptchaSettings = new ReCaptchaSettings();
    builder.Configuration.Bind("ReCaptcha", reCaptchaSettings);
    builder.Services.AddSingleton(reCaptchaSettings);
    builder.Services.AddHttpClient<ReCaptchaService>();

    builder.Services.AddValidatorsFromAssemblyContaining<SignInRequest>();

    builder.Services.AddSingleton<AwsFilesCache>();
    builder.Services.AddSingleton(new GrammarDb(settings.GrammarDbPath));

    if (settings.SyncEditorDbWithAws)
        builder.Services.AddHostedService<EditorDbPushingService>(serviceProvider =>
            new EditorDbPushingService(settings.EditorDbPath, serviceProvider.GetRequiredService<IDbSynchronizer>(), serviceProvider.GetLoggerFor(nameof(EditorDbPushingService))));
}

static void ConfigureIdentity(WebApplicationBuilder builder)
{
    builder.Services
        .AddAuthentication()
        .AddCookie(IdentityConstants.ApplicationScheme, options =>
        {
            options.Cookie.HttpOnly = true;
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                return Task.CompletedTask;
            };
        });
    builder.Services.AddIdentityCore<EditorUser>(o =>
        {
            o.User.RequireUniqueEmail = true;

            builder.Configuration.Bind("Identity:Password", o.Password);
        })
        .AddDefaultTokenProviders();
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy(PolicyExtensions.ViewerPolicy, policy =>
            policy.RequireAssertion(context => context.User.GetRole() >= Roles.Viewer));
        options.AddPolicy(PolicyExtensions.EditorPolicy, policy =>
            policy.RequireAssertion(context => context.User.GetRole() >= Roles.Editor));
        options.AddPolicy(PolicyExtensions.AdminPolicy, policy =>
            policy.RequireAssertion(context => context.User.GetRole() >= Roles.Admin));
    });
    builder.Services.AddScoped<SignInManager<EditorUser>>();
    builder.Services.AddSingleton<IUserClaimsPrincipalFactory<EditorUser>, EditorClaimsPrincipalFactory>();
    builder.Services.AddHttpContextAccessor();
}

static void ConfigurePipeline(WebApplication app)
{
    var dbSynchronizer = app.Services.GetRequiredService<IDbSynchronizer>();
    var editorDbPath = app.Services.GetRequiredService<Settings>().EditorDbPath;
    dbSynchronizer.Fetch(editorDbPath).Wait();
    var dbConnectionString = $"Data Source={editorDbPath}";
    InitDatabase(dbConnectionString);

    app.Services.InitLoggerFor(nameof(ExceptionMiddleware), ExceptionMiddleware.InitializeLogging);
    app.Services.InitLoggerFor(nameof(VertiIO), VertiIO.InitializeLogging);
    app.Services.GetRequiredService<AwsFilesCache>().Initialize();

    app.UseRewriter(new RewriteOptions()
        .Add(context => SpaUrlRewrites.DoRewrite(context, app.Services)));
    app.MapStaticAssets();
    app.Use(ExceptionMiddleware.HandleException);
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapRegistry();
    app.MapEditing();
    app.MapAuth();
    app.MapUsers();

    app.Map("/api/{**path}", () => Results.NotFound());
    app.MapFallbackToFile("404.html", new StaticFileOptions { OnPrepareResponse = r => r.Context.Response.StatusCode = 404 });

    app.Services.GetRequiredService<IHostApplicationLifetime>()
        .ApplicationStarted.Register(() => app.Services.CheckValidators());
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