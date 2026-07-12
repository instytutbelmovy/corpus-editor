namespace Editor;

/// <summary> Загалоўныя зьвесткі парадыгмы для пошуку (без варыянтаў/формаў) </summary>
public record ParadigmSummary(int ParadigmId, string Lemma, string Tag, ParadigmSource Source, bool Hidden);

/// <summary> Поўная парадыгма разам з прыкметай схаванасьці </summary>
public record ParadigmDetail(Paradigm Paradigm, bool Hidden);

/// <summary>
/// Запіс у ГрамБазу: стварэньне/рэдагаваньне ўласных (лакальных) парадыгмаў і хаваньне
/// любых парадыгмаў. Асобны ад чытальнага IGrammarRepository, каб той застаўся read-only.
/// </summary>
public interface IGrammarEditRepository
{
    /// <summary> Стварае лакальную парадыгму: прызначае id з паслядоўнасьці, піша радок і зваротны індэкс. Вяртае новы id. </summary>
    Task<int> CreateLocalParadigmAsync(Paradigm paradigm, CancellationToken cancellationToken = default);

    /// <summary> Замяняе лакальную парадыгму (id мусіць быць лакальным) і перагенеруе яе радкі forms. </summary>
    Task UpdateLocalParadigmAsync(Paradigm paradigm, CancellationToken cancellationToken = default);

    /// <summary> Выдаляе лакальную парадыгму разам з яе радкамі forms і оверлэем схаванасьці. </summary>
    Task DeleteLocalParadigmAsync(int paradigmId, CancellationToken cancellationToken = default);

    /// <summary> Хавае парадыгму (апстрымную ці лакальную) праз оверлэй hidden_paradigms. Ідэмпатэнтна. </summary>
    Task HideParadigmAsync(int paradigmId, string? hiddenBy, CancellationToken cancellationToken = default);

    /// <summary> Здымае схаванасьць. Ідэмпатэнтна. </summary>
    Task UnhideParadigmAsync(int paradigmId, CancellationToken cancellationToken = default);

    /// <summary> Загружае адну парадыгму (з прыкметай схаванасьці); null калі няма. </summary>
    Task<ParadigmDetail?> GetParadigmAsync(int paradigmId, CancellationToken cancellationToken = default);

    /// <summary> Пошук парадыгмаў па падрадку лемы (для выбару што рэдагаваць/хаваць). </summary>
    Task<IReadOnlyList<ParadigmSummary>> SearchParadigmsAsync(string lemmaQuery, int limit, CancellationToken cancellationToken = default);
}
