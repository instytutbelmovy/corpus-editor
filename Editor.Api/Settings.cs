namespace Editor.Api;

public class SentrySettings
{
    public string Dsn { get; set; } = string.Empty;
    public string FeDsn { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
}
