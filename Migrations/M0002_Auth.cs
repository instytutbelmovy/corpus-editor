using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor.Migrations;

public static class M0002_Auth
{
    public static void Apply(SqliteConnection connection)
    {
        CreateIdentityTables(connection);
    }

    private static void CreateIdentityTables(SqliteConnection connection)
    {
        // Табліца карыстальнікаў
        connection.Execute(@"
            CREATE TABLE IF NOT EXISTS AspNetUsers (
                Id TEXT PRIMARY KEY,
                UserName TEXT NOT NULL,
                NormalizedUserName TEXT NOT NULL,
                Email TEXT NOT NULL,
                NormalizedEmail TEXT NOT NULL,
                EmailConfirmed INTEGER NOT NULL DEFAULT 0,
                PasswordHash TEXT,
                SecurityStamp TEXT,
                ConcurrencyStamp TEXT,
                PhoneNumber TEXT,
                PhoneNumberConfirmed INTEGER NOT NULL DEFAULT 0,
                TwoFactorEnabled INTEGER NOT NULL DEFAULT 0,
                LockoutEnd TEXT,
                LockoutEnabled INTEGER NOT NULL DEFAULT 0,
                AccessFailedCount INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL,
                Role INTEGER NOT NULL
            )");
    }
}
