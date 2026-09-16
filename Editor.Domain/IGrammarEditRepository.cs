using Editor.Domain.Grammar;

namespace Editor.Domain;

public record ParadigmDetail(Paradigm Paradigm, bool Hidden);

public interface IGrammarEditRepository
{
    Task<int> CreateLocalParadigm(Paradigm paradigm, string? userId, CancellationToken cancellationToken = default);
    Task<int> CreateLocalCopy(Paradigm paradigm, int originalId, string? userId, CancellationToken cancellationToken = default);

    Task UpdateLocalParadigm(Paradigm paradigm, string? userId, CancellationToken cancellationToken = default);

    Task DeleteLocalParadigm(int paradigmId, CancellationToken cancellationToken = default);

    Task HideParadigm(int paradigmId, string? hiddenBy, CancellationToken cancellationToken = default);

    Task UnhideParadigm(int paradigmId, CancellationToken cancellationToken = default);

    Task<ParadigmDetail?> GetParadigm(int paradigmId, CancellationToken cancellationToken = default);

    /// <summary> Прэфіксны пошук па леме і па словаформах; вынік - цэлыя парадыгмы, найбольш дарэчныя першымі </summary>
    Task<IReadOnlyList<ParadigmDetail>> SearchParadigms(string query, int limit, CancellationToken cancellationToken = default);
}
