namespace Editor;

public record FormMatch(
    int ParadigmId,
    string VariantId,
    string FormTag,
    string Lemma,
    string EffectiveTag,
    string? Meaning
);

public interface IGrammarRepository
{
    /// <summary> Усе кандыдаты (парадыгма, варыянт, тэг формы) для нармалізаванай формы — адзін запыт </summary>
    IReadOnlyList<FormMatch> LookupByNormalizedForm(string normalizedForm);

    /// <summary> Лема і эфэктыўны тэг аднаго варыянту; null калі парадыгма/варыянт ня знойдзены </summary>
    (string Lemma, string EffectiveTag)? GetVariant(int paradigmId, string? variantId);

    /// <summary> Ці запоўненая ГрамБаза (праверка пры старце) </summary>
    bool HasData();
}
