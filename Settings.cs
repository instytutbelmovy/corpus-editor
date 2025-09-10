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