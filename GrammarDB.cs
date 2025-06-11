using System.Diagnostics;
using System.Xml.Linq;

namespace Editor;

public record GrammarInfo(
    ParadigmFormId ParadigmFormId,
    LinguisticTag LinguisticTag,
    string Lemma,
    string NormalizedLemma,
    string? Meaning
);

public static class GrammarDB
{
    private static ILookup<string, GrammarInfo> _wordForms;
    private static ILogger? _logger;

    public static void InitializeLogging(ILogger logger) => _logger = logger;

    public static void Initialize(string directory)
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
                            var normalizedLemma = Normalizer.GrammarDbLightNormalize(lemma);
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
                                        NormalizedLemma: normalizedLemma,
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

        _wordForms = grammarInfos
            .SelectMany(x => x)
            .ToLookup(x => x.Item1, x => x.Item2);

        _logger?.LogInformation("Reading grammar db complete. Tool {elapsed}", w.Elapsed);

    }

    public static IEnumerable<GrammarInfo> LookupWord(string word)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);
        return _wordForms[normalizedWord];
    }
}