using System.Collections.Frozen;
using System.Diagnostics;
using System.Xml.Linq;

namespace Editor;

public record GrammarInfo(
    ParadigmFormId ParadigmFormId,
    LinguisticTag LinguisticTag,
    string Lemma,
    string? Meaning
);

public static class GrammarDB
{
    private static ILookup<string, GrammarInfo> _formLookup = null!;
    private static IDictionary<ParadigmFormId, GrammarInfo> _paradigmFormIdDictionary = null!;
    private static ILogger? _logger;
    private static TaskCompletionSource _initCompletionSource = new();

    public static void InitializeLogging(ILogger logger) => _logger = logger;

    public static void Initialize(string directory)
    {
        Task.Factory.StartNew(() =>
        {
            _logger?.LogInformation("Reading grammar db from {directory}", directory);
            var w = Stopwatch.StartNew();
            var grammarInfos = Directory.GetFiles(directory, "*.xml").AsParallel()
                .Select(xmlFile =>
                    {
                        var list = new List<(string, GrammarInfo)>();
                        _logger?.LogTrace("Reading grammar db file {file}", xmlFile);
                        var doc = XDocument.Load(xmlFile);
                        var root = doc.Root;

                        // Загружаем парадыгмы
                        foreach (var paradigm in root.Elements("Paradigm"))
                        {
                            var paradigmTag = paradigm.Attribute("tag")?.Value;
                            var paradigmId = paradigm.Attribute("pdgId").Value;
                            var paradigmMeaning = paradigm.Attribute("meaning")?.Value;

                            foreach (var variant in paradigm.Elements("Variant"))
                            {
                                var variantId = variant.Attribute("id").Value;
                                var lemma = variant.Attribute("lemma").Value;
                                var variantTag = variant.Attribute("tag")?.Value;

                                var effectiveTag = variantTag ?? paradigmTag;

                                foreach (var form in variant.Elements("Form"))
                                {
                                    var formTag = form.Attribute("tag").Value;
                                    var formValue = form.Value;

                                    if (!string.IsNullOrEmpty(formValue))
                                    {
                                        // Нармалізуем форму для індэксавання
                                        var normalizedForm = Normalizer.GrammarDbAggressiveNormalize(formValue);

                                        var grammarInfo = new GrammarInfo(
                                            ParadigmFormId: new ParadigmFormId(int.Parse(paradigmId), variantId, formTag),
                                            LinguisticTag: new LinguisticTag(effectiveTag, formTag),
                                            Lemma: lemma,
                                            Meaning: paradigmMeaning
                                        );

                                        list.Add((normalizedForm, grammarInfo));
                                    }
                                }
                            }
                        }

                        return list;
                    }
                )
                .ToList();

            _formLookup = grammarInfos
                .SelectMany(x => x)
                .ToLookup(x => x.Item1, x => x.Item2);

            // ToDictionary not used because grammarInfo.ParadigmFormId is not necessarily unique, namely adjective accusative (MAS) forms vary by animate/inanimate.
            // And I only about one those, so taking the last is acceptable
            var paradigmFormIdDictionary = new Dictionary<ParadigmFormId, GrammarInfo>();
            foreach (var grammarInfo in grammarInfos.SelectMany(x => x).Select(x => x.Item2))
                paradigmFormIdDictionary[grammarInfo.ParadigmFormId] = grammarInfo;
            _paradigmFormIdDictionary = paradigmFormIdDictionary.ToFrozenDictionary();

            _initCompletionSource.SetResult();
            _logger?.LogInformation("Reading grammar db complete. Took {elapsed}", w.Elapsed);
        }).ContinueWith(t =>
        {
            _logger?.LogError(t.Exception, "Failed to initialize grammar db.");
        }, TaskContinuationOptions.OnlyOnFaulted);
    }

    public static Task Initialized => _initCompletionSource.Task;

    public static IEnumerable<GrammarInfo> LookupWord(string word)
    {
        if (!_initCompletionSource.Task.IsCompleted)
            throw new InvalidOperationException("GrammarDB not initialized yet");

        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);
        return _formLookup[normalizedWord];
    }

    public static (string, LinguisticTag) GetLemmaAndLinguisticTag(ParadigmFormId paradigmFormId)
    {
        if (!_initCompletionSource.Task.IsCompleted)
            throw new InvalidOperationException("GrammarDB not initialized yet");

        return _paradigmFormIdDictionary.TryGetValue(paradigmFormId, out var result)
            ? (result.Lemma, result.LinguisticTag)
            : throw new NotFoundException("Paradigm Form Id not found");
    }
}