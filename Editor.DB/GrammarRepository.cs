using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Editor;

public class GrammarRepository(IDbContextFactory<GrammarDbContext> contextFactory) : IGrammarRepository
{
    /// <summary> Колькі нармалізаваных формаў пытаць за адзін запыт, каб масівы параметраў не раслі бязьмежна </summary>
    private const int LookupBatchSize = 500;

    public IReadOnlyList<FormMatch> LookupByNormalizedForm(string normalizedForm)
    {
        using var db = contextFactory.CreateDbContext();

        var rows = (from form in db.Forms
                    join paradigm in db.Paradigms on form.ParadigmId equals paradigm.ParadigmId
                    where form.NormalizedForm == normalizedForm
                    select new { form.ParadigmId, form.VariantId, form.FormTag, paradigm.Meaning, paradigm.Variants })
            .ToList();

        var results = new List<FormMatch>(rows.Count);
        foreach (var row in rows)
        {
            var variant = row.Variants.FirstOrDefault(v => v.Id == row.VariantId)
                ?? throw new InvalidOperationException($"Paradigm {row.ParadigmId}{row.VariantId} not found");
            results.Add(new FormMatch(row.ParadigmId, row.VariantId, row.FormTag, variant.Lemma, variant.Tag, row.Meaning));
        }

        return results;
    }

    public IReadOnlyDictionary<string, IReadOnlyList<FormMatch>> LookupByNormalizedForms(IReadOnlyCollection<string> normalizedForms)
    {
        var result = new Dictionary<string, List<FormMatch>>();
        if (normalizedForms.Count == 0)
            return new Dictionary<string, IReadOnlyList<FormMatch>>();

        var distinct = normalizedForms.Distinct().ToArray();

        using var db = contextFactory.CreateDbContext();

        // Разьбіваем на порцыі, каб масіў у `= ANY(...)` не рос бязьмежна на вялікіх дакумэнтах
        for (var offset = 0; offset < distinct.Length; offset += LookupBatchSize)
        {
            var chunk = distinct[offset..Math.Min(offset + LookupBatchSize, distinct.Length)];

            // Запыт 1: усе радкі зваротнага індэксу для формаў гэтай порцыі
            var formRows = db.Forms
                .Where(f => chunk.Contains(f.NormalizedForm))
                .Select(f => new { f.NormalizedForm, f.ParadigmId, f.VariantId, f.FormTag })
                .ToList();

            if (formRows.Count == 0)
                continue;

            // Запыт 2: кожная патрэбная парадыгма (з jsonb-варыянтамі) толькі адзін раз
            var paradigmIds = formRows.Select(r => r.ParadigmId).Distinct().ToArray();
            var paradigms = db.Paradigms
                .Where(p => paradigmIds.Contains(p.ParadigmId))
                .ToDictionary(p => p.ParadigmId);

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

    public (string Lemma, string EffectiveTag)? GetVariant(int paradigmId, string? variantId)
    {
        if (variantId == null)
            return null;

        using var db = contextFactory.CreateDbContext();
        var paradigm = db.Paradigms.SingleOrDefault(p => p.ParadigmId == paradigmId);
        var variant = paradigm?.Variants.FirstOrDefault(v => v.Id == variantId);
        return variant == null ? null : (variant.Lemma, variant.Tag);
    }

    public bool HasData()
    {
        using var db = contextFactory.CreateDbContext();
        try
        {
            return db.Paradigms.Any();
        }
        catch (PostgresException e) when (e.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            return false;
        }
    }
}
