using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor.Migrations;

public static class M0001_Initial
{
    public static async void Apply(SqliteConnection connection)
    {
        connection.Execute("PRAGMA journal_mode = 'wal'");
        connection.Execute("CREATE TABLE RegistryFile ('Id' INTEGER, 'Name' TEXT, 'Url' TEXT, 'PercentCompletion' INTEGER, 'PercentManualCompletion' INTEGER);");
    }
}