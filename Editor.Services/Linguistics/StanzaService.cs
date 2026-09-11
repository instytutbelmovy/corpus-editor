using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace Editor.Services.Linguistics;

/// <summary> Тое, што Stanza кажа пра адзін токен. </summary>
public readonly record struct StanzaToken(string? Upos, string? Lemma);

public interface IStanzaService
{
    bool IsEnabled { get; }

    /// <summary>
    /// Тэгуе ўжо разьбітыя на токены сказы.
    /// Вяртае null - і ніколі не кідае выключэньня - калі сэрвіс выключаны, недаступны, не адказаў у тэрмін, ці прыслаў іншую колькасьць словаў, чым было паслана.
    /// Загрузка дакумэнту ў такім выпадку працягваецца без падказак.
    /// </summary>
    Task<IReadOnlyList<IReadOnlyList<StanzaToken>>?> Tag(IReadOnlyList<IReadOnlyList<string>> sentences, CancellationToken cancellationToken = default);
}

public partial class StanzaService(HttpClient httpClient, StanzaSettings settings, ILogger<StanzaService> logger) : IStanzaService
{
    /// <summary>
    /// Кірыліца мусіць ісьці ў цела запыту як ёсьць.
    /// Прадвызначаны кадавальнік экранаваў бы кожную літару ў \uXXXX, разьдзімаючы запыт утрая: 2 байты UTF-8 -> 6 байтаў ASCII.
    /// "Unsafe" тут датычыцца толькі ўстаўкі ў HTML, а мы шлём JSON ва ўнутраны сэрвіс.
    /// </summary>
    private static readonly StanzaJsonSerializerContext Json = new(new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    });

    public bool IsEnabled => settings.IsEnabled;

    public async Task<IReadOnlyList<IReadOnlyList<StanzaToken>>?> Tag(IReadOnlyList<IReadOnlyList<string>> sentences, CancellationToken cancellationToken = default)
    {
        // Пра выключаны сэрвіс паведамляем адзін раз пры старце, а не на кожным кавалку дакумэнту
        if (!settings.IsEnabled || sentences.Count == 0)
            return null;

        var url = $"{settings.BaseUrl.TrimEnd('/')}/tag";

        try
        {
            var payload = new StanzaTagRequest { Sentences = sentences.Select(s => s.ToList()).ToList() };
            var json = JsonSerializer.Serialize(payload, Json.StanzaTagRequest);

            using var content = new StringContent(json, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
            using var response = await httpClient.PostAsync(url, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                LogStanzaErrorResponse((int)response.StatusCode, sentences.Count);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var parsed = await JsonSerializer.DeserializeAsync(stream, Json.StanzaTagResponse, cancellationToken);

            return Align(parsed, sentences);
        }
        catch (Exception e) when (e is HttpRequestException
                                      or JsonException
                                      or OperationCanceledException
                                      or TimeoutException
                                  && !cancellationToken.IsCancellationRequested)
        {
            // Скасаваньне заданьня выклікальнікам сюды не трапляе - яго трэба прапускаць наверх
            LogStanzaUnavailable(e);
            return null;
        }
    }

    /// <summary>
    /// Правярае, што адказ супадае з запытам токен у токен. Выраўноўваньне ідзе строга па індэксах, таму любая разыходнасьць робіць увесь кавалак непрыдатным.
    /// </summary>
    private IReadOnlyList<IReadOnlyList<StanzaToken>>? Align(StanzaTagResponse? response, IReadOnlyList<IReadOnlyList<string>> sentences)
    {
        if (response?.Sentences is not { } tagged)
        {
            LogStanzaNoSentencesInResponse();
            return null;
        }

        if (tagged.Count != sentences.Count)
        {
            LogStanzaSentenceCountMismatch(tagged.Count, sentences.Count);
            return null;
        }

        var result = new List<IReadOnlyList<StanzaToken>>(tagged.Count);

        for (var i = 0; i < tagged.Count; i++)
        {
            var taggedSentence = tagged[i];
            if (taggedSentence is null || taggedSentence.Count != sentences[i].Count)
            {
                LogStanzaWordCountMismatch(taggedSentence?.Count ?? 0, sentences[i].Count, i);
                return null;
            }

            var words = new StanzaToken[taggedSentence.Count];
            for (var j = 0; j < taggedSentence.Count; j++)
                words[j] = new StanzaToken(taggedSentence[j]?.Upos, taggedSentence[j]?.Lemma);

            result.Add(words);
        }

        return result;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza адказала {StatusCode} на {SentenceCount} сказаў - разьмячаем без падказак")]
    private partial void LogStanzaErrorResponse(int statusCode, int sentenceCount);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza недаступная - разьмячаем без падказак")]
    private partial void LogStanzaUnavailable(Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza вярнула адказ бяз сказаў")]
    private partial void LogStanzaNoSentencesInResponse();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza вярнула {Actual} сказаў замест {Expected}")]
    private partial void LogStanzaSentenceCountMismatch(int actual, int expected);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza вярнула {Actual} словаў замест {Expected} у сказе {Index}")]
    private partial void LogStanzaWordCountMismatch(int actual, int expected, int index);
}

internal sealed class StanzaTagRequest
{
    public List<List<string>> Sentences { get; set; } = [];
}

internal sealed class StanzaTagResponse
{
    public List<List<StanzaWord>?>? Sentences { get; set; }
}

internal sealed class StanzaWord
{
    public string? Upos { get; set; }
    public string? Lemma { get; set; }
}
