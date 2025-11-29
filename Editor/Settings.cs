namespace Editor;

public class Settings
{
    public string EditorDbPath { get; set; } = null!;
    public bool SyncEditorDbWithAws { get; set; }
    public string GrammarDbPath { get; set; } = null!;
}

public class ReCaptchaSettings
{
    public bool IsEnforced { get; set; } = true;
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
