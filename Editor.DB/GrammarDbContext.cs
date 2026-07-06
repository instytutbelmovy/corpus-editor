using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Editor;

public class GrammarDbContext(DbContextOptions<GrammarDbContext> options) : DbContext(options)
{
    public DbSet<Paradigm> Paradigms => Set<Paradigm>();
    public DbSet<Form> Forms => Set<Form>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Paradigm>(b =>
        {
            b.HasKey(p => p.ParadigmId);
            b.Property(p => p.ParadigmId).ValueGeneratedNever(); // ідэнтыфікатары прыходзяць з XML (pdgId)
            // Крыніцагенэраваная (не dynamic) json-серыялізацыя, каб пазбегнуць EnableDynamicJson у Npgsql
            b.Property(p => p.Variants)
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, GrammarJsonSerializerContext.Default.ListParadigmVariant),
                    v => JsonSerializer.Deserialize(v, GrammarJsonSerializerContext.Default.ListParadigmVariant)!,
                    new ValueComparer<List<ParadigmVariant>>(
                        (a, b) => JsonSerializer.Serialize(a, GrammarJsonSerializerContext.Default.ListParadigmVariant) ==
                                  JsonSerializer.Serialize(b, GrammarJsonSerializerContext.Default.ListParadigmVariant),
                        v => JsonSerializer.Serialize(v, GrammarJsonSerializerContext.Default.ListParadigmVariant).GetHashCode()));
        });
        modelBuilder.Entity<Form>(b =>
        {
            b.HasKey(f => new { f.NormalizedForm, f.ParadigmId, f.VariantId, f.FormTag });
        });
    }
}
