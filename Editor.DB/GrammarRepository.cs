using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Editor;

public class GrammarRepository(IDbContextFactory<GrammarDbContext> contextFactory) : IGrammarRepository
{
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
