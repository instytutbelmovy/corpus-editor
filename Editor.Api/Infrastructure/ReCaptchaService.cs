using System.Text.Json;

namespace Editor;

public class ReCaptchaService
{
    private readonly HttpClient _httpClient;
    private readonly ReCaptchaSettings _settings;
    private readonly ILogger<ReCaptchaService> _logger;

    public ReCaptchaService(HttpClient httpClient, ReCaptchaSettings settings, ILogger<ReCaptchaService> logger)
    {
        _httpClient = httpClient;
        _settings = settings;
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp = null)
    {
        if (!_settings.IsEnforced)
        {
            _logger.LogWarning("ReCaptcha check skipped due to settings");
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
        var response = await _httpClient.PostAsync("https://www.google.com/recaptcha/api/siteverify", formData);
        
        if (!response.IsSuccessStatusCode)
            return false;

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize(jsonResponse, InfrastructureJsonSerializerContext.Default.ReCaptchaResponse);;

        return result is { Success: true, Score: >= 0.5 };
    }
}

public class ReCaptchaResponse
{
    public bool Success { get; set; }
    public double Score { get; set; }
}
