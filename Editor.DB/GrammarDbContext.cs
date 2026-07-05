using Microsoft.EntityFrameworkCore;

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
            b.Property(p => p.Variants).HasColumnType("jsonb");
        });
        modelBuilder.Entity<Form>(b =>
        {
            b.HasKey(f => new { f.NormalizedForm, f.ParadigmId, f.VariantId, f.FormTag });
        });
    }
}
