using Editor.Domain;
using Editor.Services.Exceptions;

namespace Editor.Services.Grammar;

public interface IGrammarDb
{
    Task<List<GrammarInfo>> LookupWord(string word, CancellationToken cancellationToken = default);

    /// <summary> Пакетны пошук: адзін зварот да базы на ўсе словы, вынік па кожным зыходным слове </summary>
    Task<Dictionary<string, List<GrammarInfo>>> LookupWords(IReadOnlyCollection<string> words, CancellationToken cancellationToken = default);

    Task<(string, LinguisticTag)> GetLemmaAndLinguisticTag(ParadigmFormId paradigmFormId, CancellationToken cancellationToken = default);

    (ParadigmFormId?, string?, LinguisticTag?) InferGrammarInfo(List<GrammarInfo> grammarInfoList);
}

public class GrammarDb(IGrammarRepository grammarRepository) : IGrammarDb
{
    public async Task<List<GrammarInfo>> LookupWord(string word, CancellationToken cancellationToken = default)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);

        var matches = await grammarRepository.LookupByNormalizedForm(normalizedWord, cancellationToken);
        var results = matches
            .Select(ToGrammarInfo)
            .ToList();

        return results;
    }

    /// <summary> Пакетны пошук: адзін зварот да базы на ўсе словы, вынік па кожным зыходным слове </summary>
    public async Task<Dictionary<string, List<GrammarInfo>>> LookupWords(IReadOnlyCollection<string> words, CancellationToken cancellationToken = default)
    {
        // Нармалізуем кожнае унікальнае слова адзін раз
        var normalizedByWord = new Dictionary<string, string>();
        foreach (var word in words)
            if (!normalizedByWord.ContainsKey(word))
                normalizedByWord[word] = Normalizer.GrammarDbAggressiveNormalize(word);

        var matchesByNormalized = await grammarRepository.LookupByNormalizedForms(normalizedByWord.Values.ToArray(), cancellationToken);

        var result = new Dictionary<string, List<GrammarInfo>>(normalizedByWord.Count);
        foreach (var (word, normalizedWord) in normalizedByWord)
        {
            var infos = matchesByNormalized.TryGetValue(normalizedWord, out var matches)
                ? matches.Select(ToGrammarInfo).ToList()
                : [];

            result[word] = infos;
        }

        return result;
    }

    private static GrammarInfo ToGrammarInfo(FormMatch match) => new(
        ParadigmFormId: new ParadigmFormId(match.ParadigmId, match.VariantId, match.FormTag),
        LinguisticTag: new LinguisticTag(match.EffectiveTag, match.FormTag),
        Lemma: match.Lemma,
        Meaning: match.Meaning);

    public async Task<(string, LinguisticTag)> GetLemmaAndLinguisticTag(ParadigmFormId paradigmFormId, CancellationToken cancellationToken = default)
    {
        var variant = await grammarRepository.GetVariant(paradigmFormId.ParadigmId, paradigmFormId.VariantId, cancellationToken);
        if (variant == null)
            throw new NotFoundException("Paradigm Form Id not found");

        var (lemma, effectiveTag) = variant.Value;
        return (lemma, new LinguisticTag(effectiveTag, paradigmFormId.FormTag));
    }

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

        // Засяваем першым кандыдатам і перасякаем з астатнімі.
        var intersectionParadigmFormId = grammarInfoList[0].ParadigmFormId;
        LinguisticTag? intersectionLinguisticTag = grammarInfoList[0].LinguisticTag;

        for (var i = 1; i < grammarInfoList.Count; i++)
        {
            intersectionParadigmFormId = intersectionParadigmFormId?.IntersectWith(grammarInfoList[i].ParadigmFormId);
            intersectionLinguisticTag = intersectionLinguisticTag?.IntersectWith(grammarInfoList[i].LinguisticTag);
        }

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
}
