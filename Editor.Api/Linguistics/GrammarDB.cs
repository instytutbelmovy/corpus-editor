using System.Collections.Concurrent;

namespace Editor;

public class GrammarDb(IGrammarRepository grammarRepository)
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<GrammarInfo, byte>> _customWords = new();

    public List<GrammarInfo> LookupWord(string word, bool pickCustomWords = true)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);

        var results = grammarRepository.LookupByNormalizedForm(normalizedWord)
            .Select(ToGrammarInfo)
            .ToList();

        if (pickCustomWords && _customWords.TryGetValue(normalizedWord, out var customWordResults))
            results.AddRange(customWordResults.Select(x => x.Key));

        return results;
    }

    /// <summary> Пакетны пошук: адзін зварот да базы на ўсе словы, вынік па кожным зыходным слове </summary>
    public Dictionary<string, List<GrammarInfo>> LookupWords(IReadOnlyCollection<string> words, bool pickCustomWords = true)
    {
        // Нармалізуем кожнае унікальнае слова адзін раз
        var normalizedByWord = new Dictionary<string, string>();
        foreach (var word in words)
            if (!normalizedByWord.ContainsKey(word))
                normalizedByWord[word] = Normalizer.GrammarDbAggressiveNormalize(word);

        var matchesByNormalized = grammarRepository.LookupByNormalizedForms(normalizedByWord.Values.ToArray());

        var result = new Dictionary<string, List<GrammarInfo>>(normalizedByWord.Count);
        foreach (var (word, normalizedWord) in normalizedByWord)
        {
            var infos = matchesByNormalized.TryGetValue(normalizedWord, out var matches)
                ? matches.Select(ToGrammarInfo).ToList()
                : [];

            if (pickCustomWords && _customWords.TryGetValue(normalizedWord, out var customWordResults))
                infos.AddRange(customWordResults.Select(x => x.Key));

            result[word] = infos;
        }

        return result;
    }

    private static GrammarInfo ToGrammarInfo(FormMatch match) => new(
        ParadigmFormId: new ParadigmFormId(match.ParadigmId, match.VariantId, match.FormTag),
        LinguisticTag: new LinguisticTag(match.EffectiveTag, match.FormTag),
        Lemma: match.Lemma,
        Meaning: match.Meaning);

    public (string, LinguisticTag) GetLemmaAndLinguisticTag(ParadigmFormId paradigmFormId)
    {
        var variant = grammarRepository.GetVariant(paradigmFormId.ParadigmId, paradigmFormId.VariantId);
        if (variant == null)
            throw new NotFoundException("Paradigm Form Id not found");

        var (lemma, effectiveTag) = variant.Value;
        return (lemma, new LinguisticTag(effectiveTag, paradigmFormId.FormTag));
    }

    public (ParadigmFormId?, string?, LinguisticTag?) InferGrammarInfo(string word) =>
        InferGrammarInfo(LookupWord(word));

    public (ParadigmFormId?, string?, LinguisticTag?) InferGrammarInfo(List<GrammarInfo> grammarInfoList)
    {
        if (grammarInfoList.Count == 0)
            return (null, null, null);

        if (grammarInfoList.Count == 1)
        {
            var grammarInfo = grammarInfoList[0];
            return (
                grammarInfo.ParadigmFormId,
                grammarInfo.Lemma,
                grammarInfo.LinguisticTag
            );
        }

        var intersectionParadigmFormId = grammarInfoList
            .Aggregate<GrammarInfo, ParadigmFormId?>(null, (current, grammarInfo) => current?.IntersectWith(grammarInfo.ParadigmFormId));

        var intersectionLinguisticTag = grammarInfoList
            .Aggregate<GrammarInfo, LinguisticTag?>(null, (current, grammarInfo) => current?.IntersectWith(grammarInfo.LinguisticTag));

        var lemmas = grammarInfoList.Select(info => Normalizer.GrammarDbLightNormalize(info.Lemma)).ToHashSet();
        var intersectionLemma = lemmas.Count == 1 ? lemmas.First() : null;

        if (intersectionLemma == null)
        {
            // добра, а калі і націскі і вялікія літары праігнараваць?
            lemmas = grammarInfoList.Select(info => Normalizer.GrammarDbAggressiveNormalize(info.Lemma)).ToHashSet();
            intersectionLemma = lemmas.Count() == 1 ? lemmas.First() : null;
        }

        // Калі знайшліся зусім розныя варыянты - вяртаем пустыя значэньні
        return (intersectionParadigmFormId, intersectionLemma, intersectionLinguisticTag);
    }

    public void AddCustomWord(string word, GrammarInfo grammarInfo)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);
        var set = _customWords.GetOrAdd(normalizedWord, _ => []);
        set.TryAdd(grammarInfo, 0);
    }
}
