using System.Text.Json;
using Editor.Domain.Grammar;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Editor.DB;

public class GrammarDbContext(DbContextOptions<GrammarDbContext> options) : DbContext(options)
{
    public DbSet<Paradigm> Paradigms => Set<Paradigm>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<HiddenParadigm> HiddenParadigms => Set<HiddenParadigm>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Паслядоўнасьць для лакальных ідэнтыфікатараў - стартуе ў зарэзэрваваным дыяпазоне,
        // вышэй за любы апстрымны pdgId (гл. GrammarIds.LocalParadigmIdBase)
        modelBuilder.HasSequence<int>(GrammarIds.LocalParadigmIdSequence)
            .StartsAt(GrammarIds.LocalParadigmIdBase);

        modelBuilder.Entity<Paradigm>(b =>
        {
            b.HasKey(p => p.ParadigmId);
            b.Property(p => p.ParadigmId).ValueGeneratedNever(); // ідэнтыфікатары прыходзяць з XML (pdgId) або з паслядоўнасьці (лакальныя)
            // enum захоўваецца як int; існуючыя радкі - 'upstream' (0)
            b.Property(p => p.Source).HasDefaultValue(ParadigmSource.Upstream);
            // text_pattern_ops: btree, прыдатны для LIKE 'прэфікс%' незалежна ад калацыі базы
            b.HasIndex(p => p.LemmaNormalized).HasOperators("text_pattern_ops");
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
            b.Property(f => f.Source).HasDefaultValue(ParadigmSource.Upstream);
            // Першая калёнка PK ужо пакрывае пошук па роўнасьці; гэты індэкс дадае LIKE 'прэфікс%'
            b.HasIndex(f => f.NormalizedForm).HasOperators("text_pattern_ops");
        });
        modelBuilder.Entity<HiddenParadigm>(b =>
        {
            b.HasKey(h => h.ParadigmId);
            b.Property(h => h.ParadigmId).ValueGeneratedNever();
        });
    }
}
