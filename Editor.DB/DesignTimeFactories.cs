using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Editor;

// Фабрыкі для dotnet-ef (генэрацыя міграцый); UseSnakeCaseNamingConvention мусіць
// супадаць з рэгістрацыяй у Program.cs і ў GrammarDbConverter, іначай мадэль разыдзецца са схемай.

public class EditorDbContextDesignFactory : IDesignTimeDbContextFactory<EditorDbContext>
{
    public EditorDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<EditorDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("EDITOR_DB_CS")
                       ?? "Host=localhost;Database=editor;Username=postgres;Password=postgres")
            .UseSnakeCaseNamingConvention()
            .Options);
}

public class GrammarDbContextDesignFactory : IDesignTimeDbContextFactory<GrammarDbContext>
{
    public GrammarDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<GrammarDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("GRAMMAR_DB_CS")
                       ?? "Host=localhost;Database=grammar;Username=postgres;Password=postgres")
            .UseSnakeCaseNamingConvention()
            .Options);
}
