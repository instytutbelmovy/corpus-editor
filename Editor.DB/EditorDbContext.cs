using Microsoft.EntityFrameworkCore;

namespace Editor;

public class EditorDbContext(DbContextOptions<EditorDbContext> options) : DbContext(options)
{
    public DbSet<EditorUser> Users => Set<EditorUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EditorUser>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.ConcurrencyStamp).IsConcurrencyToken();
            b.HasIndex(u => u.NormalizedUserName).IsUnique();
            b.HasIndex(u => u.NormalizedEmail).IsUnique();
        });
    }
}
