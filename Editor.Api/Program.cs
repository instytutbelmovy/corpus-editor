using Editor;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using Editor.Api;
using Editor.Api.Infrastructure;
using Editor.DB;
using Editor.Domain;
using Editor.Services;
using Editor.Services.Auth;
using Editor.Services.Corpus;
using Editor.Services.Editing;
using Editor.Services.Email;
using Editor.Services.Linguistics;
using Editor.Services.Registry;
using Editor.Services.Users;
using InfrastructureJsonSerializerContext = Editor.Api.Infrastructure.InfrastructureJsonSerializerContext;
using ServicesJsonSerializerContext = Editor.Services.ServicesJsonSerializerContext;
using VertiJsonSerializerContext = Editor.Services.Corpus.VertiJsonSerializerContext;


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
    var sentrySettings = builder.RegisterSettings<SentrySettings>("Sentry");
    sentrySettings.Environment = builder.Environment.IsProduction() ? "production" : "development";
    builder.Services.AddSingleton(sentrySettings);
    if (!builder.Environment.IsDevelopment())
        builder.WebHost.UseSentry(o =>
        {
            o.Dsn = sentrySettings.Dsn;
            o.Release = sentrySettings.Version;
            o.Environment = sentrySettings.Environment;
        });

    builder.WebHost.UseStaticWebAssets();

    var appSettings = builder.RegisterSettings<AppSettings>("App");
    if (!builder.Environment.IsDevelopment() && string.IsNullOrEmpty(appSettings.BaseUrl))
        throw new InvalidOperationException("Public base URL is not configured. Please set 'App:BaseUrl' in the configuration.");

    var awsSettings = builder.RegisterSettings<AwsSettings>("Aws");
    if (string.IsNullOrEmpty(awsSettings.AccessKeyId) || string.IsNullOrEmpty(awsSettings.SecretAccessKey))
        throw new InvalidOperationException("AWS credentials are not configured. Please set 'AwsSettings:AccessKeyId' and 'AwsSettings:SecretAccessKey' in the configuration.");

    builder.Services.ConfigureHttpJsonOptions(options =>
    {
        options.SerializerOptions.TypeInfoResolverChain.Insert(0, InfrastructureJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(1, ServicesJsonSerializerContext.Default);
        options.SerializerOptions.TypeInfoResolverChain.Insert(2, VertiJsonSerializerContext.Default);
    });

    var editorConnectionString = builder.Configuration.GetConnectionString("EditorDb");
    if (string.IsNullOrEmpty(editorConnectionString))
        throw new InvalidOperationException("Editor database is not configured. Please set 'ConnectionStrings:EditorDb' in the configuration.");
    var grammarConnectionString = builder.Configuration.GetConnectionString("GrammarDb");
    if (string.IsNullOrEmpty(grammarConnectionString))
        throw new InvalidOperationException("Grammar database is not configured. Please set 'ConnectionStrings:GrammarDb' in the configuration.");

    builder.Services.AddDbContext<EditorDbContext>(options =>
        options.UseNpgsql(editorConnectionString).UseSnakeCaseNamingConvention()
            .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
    builder.Services.AddDbContext<GrammarDbContext>(options =>
        options.UseNpgsql(grammarConnectionString).UseSnakeCaseNamingConvention()
            .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

    builder.Services.AddScoped<EditorUserStore>();
    builder.Services.AddScoped<IUserStore<EditorUser>>(serviceProvider => serviceProvider.GetRequiredService<EditorUserStore>());

    var emailSettings = builder.RegisterSettings<EmailSettings>("Email");
    if (string.IsNullOrEmpty(emailSettings.Domain) || string.IsNullOrEmpty(emailSettings.ApiKey))
        throw new InvalidOperationException("Email SMTP settings are not configured. Please set 'EmailSettings:SmtpHost' and 'EmailSettings:SmtpPort' in the configuration.");
    builder.Services.AddHttpClient<IEmailService, EmailService>();

    var turnstileSettings = builder.RegisterSettings<TurnstileSettings>("Turnstile");
    if (string.IsNullOrEmpty(turnstileSettings.SecretKey))
        throw new InvalidOperationException("Cloudflare Turnstile secret key is not configured. Please set 'Turnstile:SecretKey' in the configuration.");
    builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();

    var stanzaSettings = builder.RegisterSettings<StanzaSettings>("Stanza");
    builder.Services.AddHttpClient<IStanzaService, StanzaService>(client => client.Timeout = TimeSpan.FromSeconds(stanzaSettings.TimeoutSeconds));

    builder.Services.AddValidatorsFromAssemblyContaining<SignInRequest>();

    builder.Services.AddSingleton<ICorpusStorage, S3CorpusStorage>();
    builder.Services.AddSingleton<IAwsFilesCache, AwsFilesCache>();

    builder.Services.AddSingleton<IUploadJobQueue, UploadJobQueue>();

    builder.Services.AddHostedService<AwsFilesCacheMaintenanceService>();
    builder.Services.AddHostedService<UploadJobWorker>();

    builder.Services.AddConventionalServices(typeof(EditingService).Assembly); // Editor.Services
    builder.Services.AddConventionalServices(typeof(UserRepository).Assembly); // Editor.DB

    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardedForHeaderName = "CF-Connecting-IP";
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();

        // Only trust X-Forwarded-* from these proxy networks (comma-separated CIDRs, e.g. "10.0.0.0/8, 172.16.0.0/12").
        // When empty, no source filtering is applied and all hops are trusted - set this in production to the reverse-proxy subnet(s).
        var knownNetworks = builder.Configuration["ForwardedHeaders:KnownNetworks"];
        if (!string.IsNullOrWhiteSpace(knownNetworks))
            foreach (var cidr in knownNetworks.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr));
    });

    // Per-IP throttling for the sensitive anonymous auth endpoints (complements per-account lockout).
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = (int)HttpStatusCode.TooManyRequests;
        options.AddPolicy(RateLimitPolicies.Auth, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5), QueueLimit = 0 }));
    });
}

static void ConfigureIdentity(WebApplicationBuilder builder)
{
    var googleAuthSettings = builder.RegisterSettings<GoogleAuthSettings>("Google");

    var authenticationBuilder = builder.Services
        .AddAuthentication(IdentityConstants.ApplicationScheme)
        .AddCookie(IdentityConstants.ApplicationScheme, options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            // Binds ExpireTimeSpan + SlidingExpiration from the 'Identity:Cookie' section, which was
            // previously declared in appsettings.json but never applied.
            builder.Configuration.Bind("Identity:Cookie", options);
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

    // Optional: only registered when a Google OAuth client is configured for this environment.
    if (!string.IsNullOrEmpty(googleAuthSettings.ClientId) && !string.IsNullOrEmpty(googleAuthSettings.ClientSecret))
        authenticationBuilder.AddGoogle(options =>
        {
            options.ClientId = googleAuthSettings.ClientId;
            options.ClientSecret = googleAuthSettings.ClientSecret;
            options.CallbackPath = "/api/auth/google-callback"; // under /api so the SPA rewriter leaves it alone
            options.ClaimActions.MapJsonKey("email_verified", "email_verified"); // not mapped by default
            options.Events.OnTicketReceived = GoogleSignInHandler.HandleTicketReceived;
        });
    builder.Services.AddIdentityCore<EditorUser>(o =>
        {
            o.User.RequireUniqueEmail = true;
            o.User.AllowedUserNameCharacters +=
                new string(Enumerable.Range(0x0400, 0x100).Select(c => (char)c).ToArray());

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
    var argon2Settings = builder.RegisterSettings<Argon2Settings>("Identity:Argon2");
    if (argon2Settings.MemoryKiB <= 0 || argon2Settings.Iterations <= 0 || argon2Settings.Parallelism <= 0
        || argon2Settings.HashLength <= 0 || argon2Settings.MaxConcurrentOperations <= 0 || argon2Settings.ConcurrencyTimeoutMs < 0)
        throw new InvalidOperationException("Argon2 settings are invalid. Please check the 'Identity:Argon2' configuration section.");
    builder.Services.Replace(ServiceDescriptor.Singleton<IPasswordHasher<EditorUser>, Argon2PasswordHasher>());
    builder.Services.AddHttpContextAccessor();
}

static void ConfigurePipeline(WebApplication app)
{
    // Міграцыі абедзвюх баз ужываюцца аўтаматычна пры старце дадатку
    using (var scope = app.Services.CreateScope())
    {
        scope.ServiceProvider.GetRequiredService<EditorDbContext>().Database.Migrate();
        scope.ServiceProvider.GetRequiredService<GrammarDbContext>().Database.Migrate();
    }

    app.Services.InitLoggerFor(nameof(ExceptionMiddleware), ExceptionMiddleware.InitializeLogging);
    app.Services.InitLoggerFor(nameof(VertiIO), VertiIO.InitializeLogging);
    app.Services.GetRequiredService<IAwsFilesCache>().Initialize();

    // Пра вымкнутую Stanza кажам адзін раз тут, а не на кожным кавалку кожнага дакумэнту
    if (!app.Services.GetRequiredService<StanzaSettings>().IsEnabled)
        app.Services.GetRequiredService<ILoggerFactory>()
            .CreateLogger(nameof(StanzaService))
            .LogWarning("Stanza tagging is disabled: 'Stanza:BaseUrl' is not configured. Uploads will be marked up from GrammarDB alone.");

    // Must run first so scheme/client-IP are correct behind the reverse proxy.
    app.UseForwardedHeaders();
    if (!app.Environment.IsDevelopment())
        app.UseHsts();
    app.Use(SecurityHeadersMiddleware.Handle);

    app.UseRewriter(new RewriteOptions()
        .Add(context => SpaUrlRewrites.DoRewrite(context, app.Services)));
    app.MapStaticAssets();
    app.Use(ExceptionMiddleware.HandleException);
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRateLimiter();
    app.MapRegistry();
    app.MapEditing();
    app.MapAuth();
    app.MapUsers();
    app.MapGrammar();

    app.Map("/api/{**path}", () => Results.NotFound());
    app.MapFallbackToFile("404.html", new StaticFileOptions { OnPrepareResponse = r => r.Context.Response.StatusCode = 404 });

    app.Services.GetRequiredService<IHostApplicationLifetime>()
        .ApplicationStarted.Register(() => app.Services.CheckValidators());
}