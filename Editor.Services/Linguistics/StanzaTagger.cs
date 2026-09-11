using Editor.Domain.Corpus;

namespace Editor.Services.Linguistics;

/// <summary>
/// Падрыхтаваны ўвод для Stanza: токены сказаў і мапа "пазыцыя токена -> нумар слова" (-1 для не-словаў).
/// Не спасылаецца на дрэва дакумэнту, таму перажывае любыя праўкі, зробленыя пакуль сэрвіс думае.
/// </summary>
public sealed record StanzaInput(List<IReadOnlyList<string>> Sentences, List<int[]> Slots, int TotalWords);

public interface IStanzaTagger
{
    bool IsEnabled { get; }

    /// <summary>
    /// Абыходзіць дрэва абзацаў і складае ўвод для тэгера. Выклікаць толькі пад блякаваньнем дакумэнту.
    /// Вяртае null, калі сэрвіс выключаны або тэгаваць няма чаго.
    /// </summary>
    StanzaInput? Prepare(IEnumerable<Paragraph> paragraphs, int totalWords);

    /// <summary>
    /// Пытаецца ў Stanza кавалак за кавалкам. Дакумэнту не кранае, таму бяжыць без блякаваньня.
    /// Вяртае масіў падказак, выраўнаваны зь нумарамі словаў. Кавалак, які не ўдалося атрымаць, застаецца без падказак.
    /// </summary>
    Task<StanzaToken?[]?> Run(StanzaInput input, Action<int>? onProgress = null, CancellationToken cancellationToken = default);
}

public partial class StanzaTagger(
    IStanzaService stanzaService,
    StanzaSettings stanzaSettings,
    ILogger<StanzaTagger> logger) : IStanzaTagger
{
    public bool IsEnabled => stanzaService.IsEnabled;

    /// <summary> Спасылкі на ўсе словы дакумэнту ў парадку абыходу. </summary>
    public static List<(List<LinguisticItem> Items, int Index)> CollectWordSlots(IEnumerable<Paragraph> paragraphs)
    {
        var slots = new List<(List<LinguisticItem>, int)>();

        foreach (var paragraph in paragraphs)
            foreach (var sentence in paragraph.Sentences)
                for (var i = 0; i < sentence.SentenceItems.Count; i++)
                    if (sentence.SentenceItems[i].Type == SentenceItemType.Word)
                        slots.Add((sentence.SentenceItems, i));

        return slots;
    }

    public StanzaInput? Prepare(IEnumerable<Paragraph> paragraphs, int totalWords)
    {
        if (!stanzaService.IsEnabled)
            return null;

        // Разьбіваем на сказы: словы і знакі прыпынку разам (пунктуацыя - карысны кантэкст для тэгера), пераносы радка прапускаем. Slots вядуць ад пазыцыі токена да нумару слова.
        var sentences = new List<IReadOnlyList<string>>();
        var slots = new List<int[]>();
        var wordOrdinal = 0;

        foreach (var paragraph in paragraphs)
        {
            foreach (var sentence in paragraph.Sentences)
            {
                var tokens = new List<string>(sentence.SentenceItems.Count);
                var sentenceSlots = new List<int>(sentence.SentenceItems.Count);

                foreach (var item in sentence.SentenceItems)
                {
                    if (item.Type == SentenceItemType.LineBreak)
                        continue;

                    var isWord = item.Type == SentenceItemType.Word;
                    var cleaned = StanzaTextNormalizer.Clean(item.Text);

                    tokens.Add(cleaned ?? StanzaTextNormalizer.Placeholder);
                    // Ад слова, ад якога пасьля чысткі нічога не засталося, вынік не бяром
                    sentenceSlots.Add(isWord && cleaned is not null ? wordOrdinal : -1);

                    if (isWord)
                        wordOrdinal++;
                }

                if (tokens.Count == 0)
                    continue;

                sentences.Add(tokens);
                slots.Add(sentenceSlots.ToArray());
            }
        }

        return sentences.Count == 0 ? null : new StanzaInput(sentences, slots, totalWords);
    }

    public async Task<StanzaToken?[]?> Run(StanzaInput input, Action<int>? onProgress = null, CancellationToken cancellationToken = default)
    {
        if (!stanzaService.IsEnabled)
            return null;

        var (sentences, slots, totalWords) = input;

        onProgress?.Invoke(0);

        var hints = new StanzaToken?[totalWords];
        var taggedWords = 0;
        var failedChunks = 0;

        foreach (var (start, count) in Chunk(sentences))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var chunk = sentences.GetRange(start, count);
            var tagged = await stanzaService.Tag(chunk, cancellationToken);

            if (tagged is null)
            {
                failedChunks++;
            }
            else
            {
                for (var i = 0; i < count; i++)
                {
                    var sentenceSlots = slots[start + i];
                    var taggedSentence = tagged[i];

                    for (var j = 0; j < sentenceSlots.Length; j++)
                        if (sentenceSlots[j] >= 0)
                            hints[sentenceSlots[j]] = taggedSentence[j];
                }
            }

            for (var i = 0; i < count; i++)
                taggedWords += slots[start + i].Count(slot => slot >= 0);

            onProgress?.Invoke(taggedWords);
        }

        if (failedChunks > 0)
            LogStanzaChunksFailed(failedChunks);

        return hints;
    }

    /// <summary>
    /// Пакуе цэлыя сказы ў кавалкі. Сказ ніколі не разразаецца: адзін занадта доўгі сказ ідзе асобным кавалкам і перавышае мяжу - кантракт сэрвісу гэта дазваляе.
    /// </summary>
    private IEnumerable<(int Start, int Count)> Chunk(List<IReadOnlyList<string>> sentences)
    {
        var start = 0;
        var tokens = 0;

        for (var i = 0; i < sentences.Count; i++)
        {
            var wouldExceed = i > start
                              && (tokens + sentences[i].Count > stanzaSettings.MaxTokensPerRequest
                                  || i - start >= stanzaSettings.MaxSentencesPerRequest);

            if (wouldExceed)
            {
                yield return (start, i - start);
                start = i;
                tokens = 0;
            }

            tokens += sentences[i].Count;
        }

        if (start < sentences.Count)
            yield return (start, sentences.Count - start);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza не апрацавала {FailedChunks} кавалкаў - тыя словы разьмечаныя без падказак")]
    private partial void LogStanzaChunksFailed(int failedChunks);
}
