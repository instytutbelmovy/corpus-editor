using Editor.Domain;
using Editor.Domain.Grammar;
using Microsoft.EntityFrameworkCore;

namespace Editor.DB;

public class GrammarEditRepository(GrammarDbContext db) : IGrammarEditRepository
{
    // Не інтэрпаляваны радок у самім выкліку Raw (пазьбягаем EF1002); імя паслядоўнасьці - канстанта, не ўвод карыстальніка
    private const string NextLocalIdSql = $"SELECT nextval('{GrammarIds.LocalParadigmIdSequence}') AS \"Value\"";

    /// <summary>
    /// Столькі радкоў зваротнага індэксу чытае пошук: столі хапае на дзясяткі розных парадыгмаў, а кароткі прэфікс (напр. дзьве літары) не разгортваецца ў скан усёй табліцы
    /// </summary>
    private const int FormScanLimit = 2000;

    public async Task<int> CreateLocalParadigm(Paradigm paradigm, CancellationToken cancellationToken = default)
        => await Create(paradigm, null, null, cancellationToken);

    public Task<int> CreateLocalCopy(Paradigm paradigm, int originalId, string? hiddenBy, CancellationToken cancellationToken = default)
        => Create(paradigm, originalId, hiddenBy, cancellationToken);

    private async Task<int> Create(Paradigm paradigm, int? originalId, string? hiddenBy, CancellationToken cancellationToken)
    {
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        var id = (int)await db.Database.SqlQueryRaw<long>(NextLocalIdSql).SingleAsync(cancellationToken);

        paradigm.ParadigmId = id;
        paradigm.Source = ParadigmSource.Local;
        paradigm.LemmaNormalized = Normalizer.GrammarDbSearchNormalize(paradigm.Lemma);

        db.Paradigms.Add(paradigm);
        db.Forms.AddRange(BuildForms(paradigm));
        await db.SaveChangesAsync(cancellationToken);

        if (originalId.HasValue)
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO hidden_paradigms (paradigm_id, hidden_by, hidden_at) VALUES ({originalId.Value}, {hiddenBy}, {DateTime.UtcNow}) ON CONFLICT (paradigm_id) DO NOTHING",
                cancellationToken);

        await tx.CommitAsync(cancellationToken);
        return id;
    }

    public async Task UpdateLocalParadigm(Paradigm paradigm, CancellationToken cancellationToken = default)
    {
        EnsureLocal(paradigm.ParadigmId);
        paradigm.Source = ParadigmSource.Local;
        paradigm.LemmaNormalized = Normalizer.GrammarDbSearchNormalize(paradigm.Lemma);

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        // Выдаляем стары радок + яго forms, потым устаўляем нанова - прасьцей за attach/Update пры NoTracking
        await db.Forms.Where(f => f.ParadigmId == paradigm.ParadigmId).ExecuteDeleteAsync(cancellationToken);
        await db.Paradigms.Where(p => p.ParadigmId == paradigm.ParadigmId).ExecuteDeleteAsync(cancellationToken);

        db.Paradigms.Add(paradigm);
        db.Forms.AddRange(BuildForms(paradigm));
        await db.SaveChangesAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
    }

    public async Task DeleteLocalParadigm(int paradigmId, CancellationToken cancellationToken = default)
    {
        EnsureLocal(paradigmId);

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.Forms.Where(f => f.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
        await db.Paradigms.Where(p => p.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
        await db.HiddenParadigms.Where(h => h.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
    }

    public async Task HideParadigm(int paradigmId, string? hiddenBy, CancellationToken cancellationToken = default)
    {
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

    public async Task UnhideParadigm(int paradigmId, CancellationToken cancellationToken = default)
    {
        await db.HiddenParadigms.Where(h => h.ParadigmId == paradigmId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<ParadigmDetail?> GetParadigm(int paradigmId, CancellationToken cancellationToken = default)
    {
        var paradigm = await db.Paradigms.FirstOrDefaultAsync(p => p.ParadigmId == paradigmId, cancellationToken);
        if (paradigm == null)
            return null;
        var hidden = await db.HiddenParadigms.AnyAsync(h => h.ParadigmId == paradigmId, cancellationToken);
        return new ParadigmDetail(paradigm, hidden);
    }

    public async Task<IReadOnlyList<ParadigmDetail>> SearchParadigms(string query, int limit, CancellationToken cancellationToken = default)
    {
        var normalized = Normalizer.GrammarDbSearchNormalize(query);
        if (normalized.Length == 0)
            return [];

        var prefix = normalized + "%";

        // Без ORDER BY наўмысна: сартаваньне па калацыі базы прымусіла б адсартаваць усе супадзеньні (для кароткага прэфікса - сотні тысяч радкоў) перад LIMIT.
        // Скан па індэксе text_pattern_ops і так вяртае радкі ў парадку індэксу, а канчатковы парадак вызначаецца ніжэй, у памяці.
        var lemmaIds = await db.Paradigms
            .Where(p => EF.Functions.Like(p.LemmaNormalized, prefix))
            .Take(limit)
            .Select(p => p.ParadigmId)
            .ToListAsync(cancellationToken);

        // Абмяжоўваем колькасьць прачытаных радкоў зваротнага індэксу, а не колькасьць розных парадыгмаў: DISTINCT з LIMIT мусіў бы вычарпаць увесь скан, а LIMIT па радках спыняе яго адразу.
        var formParadigmIds = await db.Forms
            .Where(f => EF.Functions.Like(f.NormalizedForm, prefix))
            .Select(f => f.ParadigmId)
            .Take(FormScanLimit)
            .ToListAsync(cancellationToken);

        var lemmaMatches = lemmaIds.ToHashSet();
        var ids = lemmaIds.Concat(formParadigmIds).Distinct().ToArray();
        if (ids.Length == 0)
            return [];

        var paradigms = await db.Paradigms
            .Where(p => ids.Contains(p.ParadigmId))
            .ToListAsync(cancellationToken);

        var hiddenIds = (await db.HiddenParadigms
                .Where(h => ids.Contains(h.ParadigmId))
                .Select(h => h.ParadigmId)
                .ToListAsync(cancellationToken))
            .ToHashSet();

        // Спачатку дакладнае супадзеньне лемы, потым прэфікс лемы, потым супадзеньні толькі па форме
        return paradigms
            .OrderBy(p => p.LemmaNormalized == normalized ? 0 : lemmaMatches.Contains(p.ParadigmId) ? 1 : 2)
            .ThenBy(p => p.LemmaNormalized.Length)
            .ThenBy(p => p.LemmaNormalized, StringComparer.Ordinal)
            .ThenBy(p => p.ParadigmId)
            .Take(limit)
            .Select(p => new ParadigmDetail(p, hiddenIds.Contains(p.ParadigmId)))
            .ToList();
    }

    private static void EnsureLocal(int paradigmId)
    {
        if (!GrammarIds.IsLocal(paradigmId))
            throw new InvalidOperationException(
                $"Парадыгма {paradigmId} не лакальная - рэдагаваньне/выдаленьне апстрымных парадыгмаў забаронена");
    }

    /// <summary>
    /// Радкі зваротнага індэксу з парадыгмы - тая ж дэрывацыя, што ў GrammarDbConverter
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
