namespace Editor.Services.Linguistics;

/// <summary>
/// Наладкі вонкавага сэрвісу Stanza. Сэрвіс неабавязковы: пры пустым BaseUrl загрузка дакумэнтаў ідзе без падказак па часьцінах мовы.
/// </summary>
public class StanzaSettings
{
    /// <summary> Базавы URL сэрвісу. Пусты радок = сэрвіс не наладжаны. </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary> Дазваляе вымкнуць Stanza, не сьціраючы наладжаны URL. </summary>
    public bool Enabled { get; set; } = true;

    public int TimeoutSeconds { get; set; } = 180;

    /// <summary>
    /// Мяккая мяжа памеру запыту.
    /// Сказы ніколі не разразаюцца, таму адзін доўгі сказ можа гэтую мяжу перавысіць - сэрвіс мусіць яго ўсё роўна апрацаваць.
    /// </summary>
    public int MaxTokensPerRequest { get; set; } = 2000;

    public int MaxSentencesPerRequest { get; set; } = 200;

    /// <summary>
    /// Вылічаецца, а не чытаецца з канфігурацыі: не дае наладзіць стан "увамкнуты, але без адрасу".
    /// </summary>
    public bool IsEnabled => Enabled && !string.IsNullOrWhiteSpace(BaseUrl);
}
