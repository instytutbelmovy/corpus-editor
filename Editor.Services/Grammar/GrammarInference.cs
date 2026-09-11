using Editor.Domain;

namespace Editor.Services.Grammar;

/// <summary>
/// Чыстая логіка вываду разьметкі з кандыдатаў ГрамБазы. Нічога не чакае і не ходзіць у базу, таму правяраецца без рэпазыторыя.
/// </summary>
public static class GrammarInference
{
    /// <summary> Перасячэньне ўсіх кандыдатаў: што ў іх агульнае, тое і ведаем напэўна. </summary>
    public static (ParadigmFormId? ParadigmFormId, string? Lemma, LinguisticTag? LinguisticTag) Infer(IReadOnlyList<GrammarInfo> candidates)
    {
        if (candidates.Count == 0)
            return (null, null, null);

        if (candidates.Count == 1)
            return (candidates[0].ParadigmFormId, candidates[0].Lemma, candidates[0].LinguisticTag);

        // Просты цыкль, а ня Skip(1).Aggregate: на дакумэнце ў 200k словаў ітэратары каштуюць занадта дорага
        var paradigmFormId = candidates[0].ParadigmFormId;
        LinguisticTag? linguisticTag = candidates[0].LinguisticTag;

        for (var i = 1; i < candidates.Count; i++)
        {
            paradigmFormId = paradigmFormId?.IntersectWith(candidates[i].ParadigmFormId);
            linguisticTag = linguisticTag?.IntersectWith(candidates[i].LinguisticTag);
        }

        var lemmas = new HashSet<string>();
        foreach (var candidate in candidates)
            lemmas.Add(Normalizer.GrammarDbLightNormalize(candidate.Lemma));

        if (lemmas.Count != 1)
        {
            // добра, а калі і націскі і вялікія літары праігнараваць?
            lemmas.Clear();
            foreach (var candidate in candidates)
                lemmas.Add(Normalizer.GrammarDbAggressiveNormalize(candidate.Lemma));
        }

        // Калі знайшліся зусім розныя варыянты - вяртаем пустыя значэньні
        var lemma = lemmas.Count == 1 ? lemmas.First() : null;

        return (paradigmFormId, lemma, linguisticTag);
    }

    /// <summary>
    /// Пакідае кандыдатаў, чыя часьціна мовы дапушчальная для падказкі.
    /// Калі не пасуе ніводзін - вяртае зыходны сьпіс: Stanza не пагадзілася з ГрамБазай, і ў такім разе давяраем базе, а не мадэлі.
    /// </summary>
    public static IReadOnlyList<GrammarInfo> Narrow(IReadOnlyList<GrammarInfo> candidates, ReadOnlySpan<char> acceptable)
    {
        if (acceptable.IsEmpty || candidates.Count <= 1)
            return candidates;

        List<GrammarInfo>? narrowed = null;

        foreach (var candidate in candidates)
        {
            var pos = candidate.LinguisticTag.Pos();
            if (pos is not null && acceptable.IndexOf(pos.Value) >= 0)
                (narrowed ??= []).Add(candidate);
        }

        return narrowed is { Count: > 0 } ? narrowed : candidates;
    }

    /// <summary>
    /// Найлепшы кандыдат для падказкі рэдактару. Вынік дэтэрмінаваны:
    /// спачатку па парадку перавагі часьцін мовы, потым па самім ідэнтыфікатары - бо парадак радкоў з Postgres не вызначаны, а .verti файлы параўноўваюцца пабочна.
    /// </summary>
    public static ParadigmFormId? BestGuess(IReadOnlyList<GrammarInfo> candidates, ReadOnlySpan<char> acceptable)
    {
        if (candidates.Count == 0)
            return null;

        GrammarInfo? best = null;
        var bestPreference = int.MaxValue;

        foreach (var candidate in candidates)
        {
            var pos = candidate.LinguisticTag.Pos();
            var preference = pos is null ? -1 : acceptable.IndexOf(pos.Value);
            if (preference < 0)
                preference = int.MaxValue - 1;

            if (best is null || preference < bestPreference ||
                preference == bestPreference && CompareIds(candidate, best) < 0)
            {
                best = candidate;
                bestPreference = preference;
            }
        }

        return best?.ParadigmFormId;
    }

    private static int CompareIds(GrammarInfo left, GrammarInfo right)
    {
        var a = left.ParadigmFormId;
        var b = right.ParadigmFormId;

        if (a is null || b is null)
            return a is null ? b is null ? 0 : 1 : -1;

        var byParadigm = a.ParadigmId.CompareTo(b.ParadigmId);
        if (byParadigm != 0)
            return byParadigm;

        var byVariant = string.CompareOrdinal(a.VariantId, b.VariantId);
        return byVariant != 0 ? byVariant : string.CompareOrdinal(a.FormTag, b.FormTag);
    }
}
