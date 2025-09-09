using Dapper;
using Editor;
using Editor.Migrations;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Identity;

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
    builder.WebHost.UseStaticWebAssets();

    var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
    InitDatabase(dbConnectionString);

    builder.Services.ConfigureHttpJsonOptions(options =>
    {
        options.SerializerOptions.TypeInfoResolverChain.Insert(0, InfrastructureJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(1, EditorJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(2, VertiJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(3, AuthJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(4, AdministrationJsonSerializerContext.Default);
    });


    var editorUserStore = new EditorUserStore(dbConnectionString);
    builder.Services.AddSingleton(editorUserStore);
    builder.Services.AddSingleton<IUserStore<EditorUser>>(editorUserStore);

    var settings = new Settings();
    builder.Configuration.Bind(nameof(Settings), settings);

    var awsSettings = new AwsSettings();
    builder.Configuration.Bind("Aws", awsSettings);
    builder.Services.AddSingleton(awsSettings);
    if (string.IsNullOrEmpty(awsSettings.AccessKeyId) || string.IsNullOrEmpty(awsSettings.SecretAccessKey))
        throw new InvalidOperationException("AWS credentials are not configured. Please set 'AwsSettings:AccessKeyId' and 'AwsSettings:SecretAccessKey' in the configuration.");

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

    GrammarDB.Initialize(settings.GrammarDbPath);
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
    return;
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
    app.UseAuthorization();
    app.MapRegistry();
    app.MapEditing();
    app.MapAuth();
    app.MapUsers();

    app.Map("/api/{**path}", () => Results.NotFound());
    app.MapFallbackToFile("404.html", new StaticFileOptions { OnPrepareResponse = r => r.Context.Response.StatusCode = 404 });
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