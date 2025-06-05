using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor.Migrations;

public static class M0001_Initial
{
    public static void Apply(SqliteConnection connection)
    {
        connection.Execute("PRAGMA journal_mode = 'wal'");
        connection.Execute("CREATE TABLE RegistryFile ('Id' INTEGER, 'PercentCompletion' INTEGER, 'PercentManualCompletion' INTEGER);");
    }
}