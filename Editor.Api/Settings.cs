namespace Editor;

public class AppSettings
{
    /// <summary> Canonical public origin (scheme + host) used to build links in outbound emails.
    /// Never derive these from the request Host header, which is attacker-controlled. </summary>
    public string BaseUrl { get; set; } = string.Empty;
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
