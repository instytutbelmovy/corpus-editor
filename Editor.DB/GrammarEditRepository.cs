using Microsoft.EntityFrameworkCore;

namespace Editor;

public class GrammarEditRepository(IDbContextFactory<GrammarDbContext> contextFactory) : IGrammarEditRepository
{
    // Не інтэрпаляваны радок у самім выкліку Raw (пазьбягаем EF1002); імя паслядоўнасьці — канстанта, не ўвод карыстальніка
    private static readonly string NextLocalIdSql =
        $"SELECT nextval('{GrammarIds.LocalParadigmIdSequence}') AS \"Value\"";

    public async Task<int> CreateLocalParadigmAsync(Paradigm paradigm, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        var id = (int)await db.Database.SqlQueryRaw<long>(NextLocalIdSql).SingleAsync(cancellationToken);

        paradigm.ParadigmId = id;
        paradigm.Source = ParadigmSource.Local;

        db.Paradigms.Add(paradigm);
        db.Forms.AddRange(BuildForms(paradigm));
        await db.SaveChangesAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
        return id;
    }

    public async Task UpdateLocalParadigmAsync(Paradigm paradigm, CancellationToken cancellationToken = default)
    {
        EnsureLocal(paradigm.ParadigmId);
        paradigm.Source = ParadigmSource.Local;

        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        // Выдаляем стары радок + яго forms, потым устаўляем нанова — прасьцей за attach/Update пры NoTracking
        await db.Forms.Where(f => f.ParadigmId == paradigm.ParadigmId).ExecuteDeleteAsync(cancellationToken);
        await db.Paradigms.Where(p => p.ParadigmId == paradigm.ParadigmId).ExecuteDeleteAsync(cancellationToken);

        db.Paradigms.Add(paradigm);
        db.Forms.AddRange(BuildForms(paradigm));
        await db.SaveChangesAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
    }

    public async Task DeleteLocalParadigmAsync(int paradigmId, CancellationToken cancellationToken = default)
    {
        EnsureLocal(paradigmId);

        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.Forms.Where(f => f.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
        await db.Paradigms.Where(p => p.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
        await db.HiddenParadigms.Where(h => h.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
    }

    public async Task HideParadigmAsync(int paradigmId, string? hiddenBy, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);

        var alreadyHidden = await db.HiddenParadigms.AnyAsync(h => h.ParadigmId == paradigmId, cancellationToken);
        if (alreadyHidden)
            return;

        db.HiddenParadigms.Add(new HiddenParadigm
        {
            ParadigmId = paradigmId,
            HiddenBy = hiddenBy,
            HiddenAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UnhideParadigmAsync(int paradigmId, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        await db.HiddenParadigms.Where(h => h.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<ParadigmDetail?> GetParadigmAsync(int paradigmId, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        var paradigm = await db.Paradigms.FirstOrDefaultAsync(p => p.ParadigmId == paradigmId, cancellationToken);
        if (paradigm == null)
            return null;
        var hidden = await db.HiddenParadigms.AnyAsync(h => h.ParadigmId == paradigmId, cancellationToken);
        return new ParadigmDetail(paradigm, hidden);
    }

    public async Task<IReadOnlyList<ParadigmSummary>> SearchParadigmsAsync(string lemmaQuery, int limit, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);

        var pattern = $"%{lemmaQuery}%";
        var rows = await db.Paradigms
            .Where(p => EF.Functions.ILike(p.Lemma, pattern))
            .OrderBy(p => p.Lemma)
            .Take(limit)
            .Select(p => new { p.ParadigmId, p.Lemma, p.Tag, p.Source })
            .ToListAsync(cancellationToken);

        var ids = rows.Select(r => r.ParadigmId).ToArray();
        var hiddenIds = (await db.HiddenParadigms
                .Where(h => ids.Contains(h.ParadigmId))
                .Select(h => h.ParadigmId)
                .ToListAsync(cancellationToken))
            .ToHashSet();

        return rows
            .Select(r => new ParadigmSummary(r.ParadigmId, r.Lemma, r.Tag, r.Source, hiddenIds.Contains(r.ParadigmId)))
            .ToList();
    }

    private static void EnsureLocal(int paradigmId)
    {
        if (!GrammarIds.IsLocal(paradigmId))
            throw new InvalidOperationException(
                $"Парадыгма {paradigmId} не лакальная — рэдагаваньне/выдаленьне апстрымных парадыгмаў забаронена");
    }

    /// <summary>
    /// Радкі зваротнага індэксу з парадыгмы — тая ж дэрывацыя, што ў GrammarDbConverter
    /// (аграсіўная нармалізацыя кожнай формы), з дэдуплікацыяй дзеля складанога PK.
    /// </summary>
    private static List<Form> BuildForms(Paradigm paradigm)
    {
        var seen = new HashSet<(string, int, string, string)>();
        var forms = new List<Form>();
        foreach (var variant in paradigm.Variants)
            foreach (var form in variant.Forms)
            {
                if (string.IsNullOrEmpty(form.Value))
                    continue;
                var normalized = Normalizer.GrammarDbAggressiveNormalize(form.Value);
                if (seen.Add((normalized, paradigm.ParadigmId, variant.Id, form.Tag)))
                    forms.Add(new Form
                    {
                        NormalizedForm = normalized,
                        ParadigmId = paradigm.ParadigmId,
                        VariantId = variant.Id,
                        FormTag = form.Tag,
                        Source = ParadigmSource.Local,
                    });
            }
        return forms;
    }
}
