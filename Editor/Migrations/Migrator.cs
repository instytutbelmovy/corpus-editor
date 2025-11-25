using Dapper;
using Microsoft.Data.Sqlite;

namespace Editor.Migrations;

public static class Migrator
{
    /// <returns> true if anything was updated </returns>
    public static bool Migrate(SqliteConnection connection)
    {
        var currentVersion = connection.ExecuteScalar<int>("PRAGMA user_version;");

        var complete = false;
        var wasComplete = true;
        while (!complete)
        {
            complete = (currentVersion switch
            {
                0 => Run(M0001_Initial.Apply),
                1 => Run(M0002_Auth.Apply),
                _ => true,
            });
            wasComplete &= complete;
        }

        return !wasComplete;

        bool Run(Action<SqliteConnection> migrator)
        {
            migrator(connection);
            currentVersion++;
            connection.Execute("PRAGMA user_version = " + currentVersion + ";");
            return false;
        }
    }
}