using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor.Migrations;

public static class Migrator
{
    public static void Migrate(SqliteConnection connection)
    {
        var currentVersion = connection.ExecuteScalar<int>("PRAGMA user_version;");

        var complete = false;
        while (!complete)
        {
            complete = (currentVersion switch
            {
                0 => Run(M0001_Initial.Apply),
                1 => Run(M0002_Auth.Apply),
                _ => true,
            });
        }

        return;

        bool Run(Action<SqliteConnection> migrator)
        {
            migrator(connection);
            currentVersion++;
            connection.Execute("PRAGMA user_version = " + currentVersion + ";");
            return false;
        }
    }
}