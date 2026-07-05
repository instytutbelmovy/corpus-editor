namespace Editor;

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
