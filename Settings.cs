namespace Editor;

public class Settings
{
    public string GrammarDbPath { get; set; } = null!;
}

public class ReCaptchaSettings
{
    public string SiteKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
}