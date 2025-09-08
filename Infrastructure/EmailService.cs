using System.Text;

namespace Editor;

public class EmailService
{
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    public EmailService(EmailSettings emailSettings, ILogger<EmailService> logger, HttpClient httpClient)
    {
        _emailSettings = emailSettings;
        _logger = logger;
        _httpClient = httpClient;

        // Настройка базовой аутентификации
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"api:{_emailSettings.ApiKey}"));
        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
    }

    public async Task SendAsync(EmailMessage message)
    {
        _logger.LogInformation("Sending \"{Subject}\" to \"{To}\"", message.Subject, message.To);

        var url = $"https://api.eu.mailgun.net/v3/{_emailSettings.Domain}/messages";
        
        var formData = new List<KeyValuePair<string, string>>
        {
            new("from", _emailSettings.From),
            new("to", message.To),
            new("subject", message.Subject),
            new("text", message.Body)
        };

        var content = new FormUrlEncodedContent(formData);

        try
        {
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Failed to send email to {message.To}. Status: {response.StatusCode}, Content: {responseContent}");
            }
        }
        catch (Exception e) when (e is not InvalidOperationException)
        {
            throw new InvalidOperationException($"Failed to send email to {message.To}", e);
        }
    }
}

public class EmailMessage
{
    public string To { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string Body { get; set; } = null!;
}

public class EmailSettings
{
    public string Domain { get; set; } = null!;
    public string ApiKey { get; set; } = null!;
    public string From { get; set; } = null!;
}