namespace Editor;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddSettings<T>(this IServiceCollection services, ConfigurationManager configuration) where T : class, new()
    {
        var settings = new T();
        configuration.Bind(settings.GetType().Name, settings);
        services.AddSingleton(settings);
        return services;
    }

    public static IServiceProvider InitLoggerFor(this IServiceProvider serviceProvider, string @class, Action<ILogger> init)
    {
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
        var logger = loggerFactory.CreateLogger(@class);
        init(logger);
        return serviceProvider;
    }
}