using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Editor;

public class GrammarRepository(IDbContextFactory<GrammarDbContext> contextFactory) : IGrammarRepository
{
    /// <summary> Колькі нармалізаваных формаў пытаць за адзін запыт, каб масівы параметраў не раслі бязьмежна </summary>
    private const int LookupBatchSize = 500;

    public async Task<IReadOnlyList<FormMatch>> LookupByNormalizedFormAsync(string normalizedForm, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);

        var rows = await (from form in db.Forms
                          join paradigm in db.Paradigms on form.ParadigmId equals paradigm.ParadigmId
                          where form.NormalizedForm == normalizedForm
                          select new { form.ParadigmId, form.VariantId, form.FormTag, paradigm.Meaning, paradigm.Variants })
            .ToListAsync(cancellationToken);

        var results = new List<FormMatch>(rows.Count);
        foreach (var row in rows)
        {
            var variant = row.Variants.FirstOrDefault(v => v.Id == row.VariantId)
                ?? throw new InvalidOperationException($"Paradigm {row.ParadigmId}{row.VariantId} not found");
            results.Add(new FormMatch(row.ParadigmId, row.VariantId, row.FormTag, variant.Lemma, variant.Tag, row.Meaning));
        }

        return results;
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>> LookupByNormalizedFormsAsync(IReadOnlyCollection<string> normalizedForms, CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<string, List<FormMatch>>();
        if (normalizedForms.Count == 0)
            return new Dictionary<string, IReadOnlyList<FormMatch>>();

        var distinct = normalizedForms.Distinct().ToArray();

        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);

        // Разьбіваем на порцыі, каб масіў у `= ANY(...)` не рос бязьмежна на вялікіх дакумэнтах
        for (var offset = 0; offset < distinct.Length; offset += LookupBatchSize)
        {
            var chunk = distinct[offset..Math.Min(offset + LookupBatchSize, distinct.Length)];

            // Запыт 1: усе радкі зваротнага індэксу для формаў гэтай порцыі
            var formRows = await db.Forms
                .Where(f => chunk.Contains(f.NormalizedForm))
                .Select(f => new { f.NormalizedForm, f.ParadigmId, f.VariantId, f.FormTag })
                .ToListAsync(cancellationToken);

            if (formRows.Count == 0)
                continue;

            // Запыт 2: кожная патрэбная парадыгма (з jsonb-варыянтамі) толькі адзін раз
            var paradigmIds = formRows.Select(r => r.ParadigmId).Distinct().ToArray();
            var paradigms = await db.Paradigms
                .Where(p => paradigmIds.Contains(p.ParadigmId))
                .ToDictionaryAsync(p => p.ParadigmId, cancellationToken);

            foreach (var row in formRows)
            {
                var paradigm = paradigms[row.ParadigmId];
                var variant = paradigm.Variants.FirstOrDefault(v => v.Id == row.VariantId)
                    ?? throw new InvalidOperationException($"Paradigm {row.ParadigmId}{row.VariantId} not found");

                if (!result.TryGetValue(row.NormalizedForm, out var matches))
                    result[row.NormalizedForm] = matches = [];
                matches.Add(new FormMatch(row.ParadigmId, row.VariantId, row.FormTag, variant.Lemma, variant.Tag, paradigm.Meaning));
            }
        }

        return result.ToDictionary(kv => kv.Key, kv => (IReadOnlyList<FormMatch>)kv.Value);
    }

    public async Task<(string Lemma, string EffectiveTag)?> GetVariantAsync(int paradigmId, string? variantId, CancellationToken cancellationToken = default)
    {
        if (variantId == null)
            return null;

        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        var paradigm = await db.Paradigms.SingleOrDefaultAsync(p => p.ParadigmId == paradigmId, cancellationToken);
        var variant = paradigm?.Variants.FirstOrDefault(v => v.Id == variantId);
        return variant == null ? null : (variant.Lemma, variant.Tag);
    }

    public async Task<bool> HasDataAsync(CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        try
        {
            return await db.Paradigms.AnyAsync(cancellationToken);
        }
        catch (PostgresException e) when (e.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            return false;
        }
    }
}
