namespace Editor.Api.Infrastructure;

public static class InfrastructureExtensions
{
    public static ILogger GetLoggerFor(this IServiceProvider serviceProvider, string @class)
    {
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
        return loggerFactory.CreateLogger(@class);
    }

    public static IServiceProvider InitLoggerFor(this IServiceProvider serviceProvider, string @class, Action<ILogger> init)
    {
        var logger = serviceProvider.GetLoggerFor(@class);
        init(logger);
        return serviceProvider;
    }

    public static T RegisterSettings<T>(this WebApplicationBuilder builder, string sectionName) where T : class, new()
    {
        var settings = new T();
        builder.Configuration.Bind(sectionName, settings);
        builder.Services.AddSingleton(settings);
        return settings;
    }
}