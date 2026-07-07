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
    Task<IReadOnlyList<FormMatch>> LookupByNormalizedFormAsync(string normalizedForm, CancellationToken cancellationToken = default);

    /// <summary> Кандыдаты для мноства нармалізаваных формаў адразу — пакетна, каб пазьбегнуць N зваротаў да базы </summary>
    Task<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>> LookupByNormalizedFormsAsync(IReadOnlyCollection<string> normalizedForms, CancellationToken cancellationToken = default);

    /// <summary> Лема і эфэктыўны тэг аднаго варыянту; null калі парадыгма/варыянт ня знойдзены </summary>
    Task<(string Lemma, string EffectiveTag)?> GetVariantAsync(int paradigmId, string? variantId, CancellationToken cancellationToken = default);

    /// <summary> Ці запоўненая ГрамБаза (праверка пры старце) </summary>
    Task<bool> HasDataAsync(CancellationToken cancellationToken = default);
}
