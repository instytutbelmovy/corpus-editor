namespace Editor;

public record ParadigmSummary(int ParadigmId, string Lemma, string Tag, ParadigmSource Source, bool Hidden);

public record ParadigmDetail(Paradigm Paradigm, bool Hidden);

public interface IGrammarEditRepository
{
    Task<int> CreateLocalParadigm(Paradigm paradigm, CancellationToken cancellationToken = default);

    Task UpdateLocalParadigm(Paradigm paradigm, CancellationToken cancellationToken = default);

    Task DeleteLocalParadigm(int paradigmId, CancellationToken cancellationToken = default);

    Task HideParadigm(int paradigmId, string? hiddenBy, CancellationToken cancellationToken = default);

    Task UnhideParadigm(int paradigmId, CancellationToken cancellationToken = default);

    Task<ParadigmDetail?> GetParadigm(int paradigmId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ParadigmSummary>> SearchParadigms(string lemmaQuery, int limit, CancellationToken cancellationToken = default);
}
