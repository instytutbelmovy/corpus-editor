namespace Editor;

public class Settings
{
    public string EditorDbPath { get; set; } = null!;
    public bool SyncEditorDbWithAws { get; set; }
    public string GrammarDbPath { get; set; } = null!;
}

public class ReCaptchaSettings
{
    public string SiteKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
}

public class SentrySettings
{
    public string Dsn { get; set; } = string.Empty;
    public string FeDsn { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
}

public static class SettingsExtensions
{
    public static T BindAndRegister<T>(this WebApplicationBuilder settings, Action<T>? optionalAssignment = null) where T: class, new()
    {
        var instance = new T();
        var name = typeof(T).Name;
        if (name.EndsWith("Settings") && name != "Settings")
            name = name[..^"Settings".Length];
        settings.Configuration.Bind(name, instance);
        optionalAssignment?.Invoke(instance);
        settings.Services.AddSingleton(instance);
        return instance;
    }
}