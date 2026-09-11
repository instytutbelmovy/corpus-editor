using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Grammar;

namespace Editor.Services.Linguistics;

/// <summary>
/// Правіла разьметкі аднаго слова: кандыдаты ГрамБазы плюс неабавязковая падказка Stanza.
/// Чыстая функцыя - правяраецца бяз базы і без HTTP.
/// </summary>
public static class GrammarResolver
{
    public readonly record struct Resolution(
        ParadigmFormId? ParadigmFormId,
        string? Lemma,
        LinguisticTag? LinguisticTag,
        LinguisticItemMetadata? Metadata);

    public static Resolution Resolve(IReadOnlyList<GrammarInfo> candidates, StanzaToken? hint, DateOnly today)
    {
        var acceptable = UposMap.Acceptable(hint?.Upos);

        if (candidates.Count == 0)
            return ResolveOutOfVocabulary(hint, acceptable);

        var narrowed = GrammarInference.Narrow(candidates, acceptable);
        var (paradigmFormId, lemma, linguisticTag) = GrammarInference.Infer(narrowed);

        if (narrowed.Count == 1 && paradigmFormId?.IsSingular() == true)
        {
            // Калі кандыдат быў адзіны з самага пачатку - заслуга ГрамБазы; іначай звузіла Stanza
            var source = candidates.Count == 1 ? ResolutionSource.GrammarDb : ResolutionSource.Stanza;
            return new Resolution(paradigmFormId, lemma, linguisticTag,
                new LinguisticItemMetadata(null, today, LinguisticErrorType.None, source));
        }

        // Без падказкі падказваць няма чаго: гэта захоўвае вынік загрузкі нязьменным, калі Stanza вымкнутая
        var suggested = acceptable.IsEmpty ? null : GrammarInference.BestGuess(narrowed, acceptable);

        return new Resolution(paradigmFormId, lemma, linguisticTag,
            suggested is null ? null : new LinguisticItemMetadata(suggested, null));
    }

    /// <summary>
    /// Слова, якога ў ГрамБазе няма. Ідэнтыфікатар формы застаецца пустым - вырашаным такое слова не лічыцца, - але лема і часьціна мовы ад Stanza даюць рэдактару зачэпку.
    /// </summary>
    private static Resolution ResolveOutOfVocabulary(StanzaToken? hint, ReadOnlySpan<char> acceptable)
    {
        if (acceptable.IsEmpty || hint is not { Lemma: { } lemma } || string.IsNullOrWhiteSpace(lemma))
            return default;

        return new Resolution(
            ParadigmFormId: null,
            Lemma: Normalizer.TokenizationNormalize(lemma),
            LinguisticTag: new LinguisticTag(acceptable[0].ToString()),
            Metadata: null);
    }
}
