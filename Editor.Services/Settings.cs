namespace Editor;

public class AppSettings
{
    /// <summary> Canonical public origin (scheme + host) used to build links in outbound emails.
    /// Never derive these from the request Host header, which is attacker-controlled. </summary>
    public string BaseUrl { get; set; } = string.Empty;
}
