using System.Text.Json;
using System.Text.Json.Serialization;

namespace Editor.Services.Auth;

public interface ITurnstileService
{
    Task<bool> VerifyTokenAsync(string token, string? remoteIp = null);
}

public partial class TurnstileService : ITurnstileService
{
    private readonly HttpClient _httpClient;
    private readonly TurnstileSettings _settings;
    private readonly ILogger<TurnstileService> _logger;

    public TurnstileService(HttpClient httpClient, TurnstileSettings settings, ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _settings = settings;
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp = null)
    {
        if (!_settings.IsEnforced)
        {
            LogTurnstileCheckSkipped();
            return true;
        }

        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(_settings.SecretKey))
            return false;

        var requestData = new Dictionary<string, string>
        {
            { "secret", _settings.SecretKey },
            { "response", token },
        };

        if (!string.IsNullOrEmpty(remoteIp))
            requestData["remoteip"] = remoteIp;

        var formData = new FormUrlEncodedContent(requestData);
        var response = await _httpClient.PostAsync("https://challenges.cloudflare.com/turnstile/v0/siteverify", formData);

        if (!response.IsSuccessStatusCode)
            return false;

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize(jsonResponse, TurnstileJsonSerializerContext.Default.TurnstileResponse);

        if (result is not { Success: true })
        {
            LogTurnstileVerificationFailed(string.Join(", ", result?.ErrorCodes ?? []));
            return false;
        }

        return true;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Turnstile check skipped due to settings")]
    private partial void LogTurnstileCheckSkipped();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Turnstile verification failed: {ErrorCodes}")]
    private partial void LogTurnstileVerificationFailed(string errorCodes);
}

public class TurnstileResponse
{
    public bool Success { get; set; }

    [JsonPropertyName("error-codes")]
    public string[] ErrorCodes { get; set; } = [];
}

public class TurnstileSettings
{
    public bool IsEnforced { get; set; } = true;
    public string SiteKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
}
