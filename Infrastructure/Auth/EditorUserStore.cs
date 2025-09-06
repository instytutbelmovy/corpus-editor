using Dapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;

namespace Editor;

public class EditorUserStore : IUserStore<EditorUser>, IUserPasswordStore<EditorUser>, IUserEmailStore<EditorUser>, IUserLockoutStore<EditorUser>
{
    private readonly string _connectionString;
    private readonly IdentityErrorDescriber ErrorDescriber = new();

    public EditorUserStore(string connectionString)
    {
        _connectionString = connectionString;
    }

    public Task<IdentityResult> CreateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        user.Id = Guid.NewGuid().ToString();
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        user.SecurityStamp = Guid.NewGuid().ToString();

        using var connection = new SqliteConnection(_connectionString);

        connection.Execute(@"
            INSERT INTO AspNetUsers (Id, UserName, NormalizedUserName, Email, NormalizedEmail,
                EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp, CreatedAt, Role)
            VALUES (@Id, @UserName, @NormalizedUserName, @Email, @NormalizedEmail,
                @EmailConfirmed, @PasswordHash, @SecurityStamp, @ConcurrencyStamp, @CreatedAt, @Role)",
            user);

        return Task.FromResult(IdentityResult.Success);
    }

    public Task<IdentityResult> DeleteAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Execute("DELETE FROM AspNetUsers WHERE Id = @Id", new { user.Id });
        return Task.FromResult(IdentityResult.Success);
    }

    public void Dispose()
    {
        // Connection is managed externally
    }

    public Task<EditorUser?> FindByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        using var connection = new SqliteConnection(_connectionString);
        var user = connection.QuerySingleOrDefault<EditorUser>(
            "SELECT * FROM AspNetUsers WHERE Id = @Id", new { Id = userId });
        return Task.FromResult(user);
    }

    public Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default)
    {
        using var connection = new SqliteConnection(_connectionString);
        var user = connection.QuerySingleOrDefault<EditorUser>(
            "SELECT * FROM AspNetUsers WHERE NormalizedUserName = @NormalizedUserName",
            new { NormalizedUserName = normalizedUserName });
        return Task.FromResult(user);
    }

    public Task<string?> GetNormalizedUserNameAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.NormalizedUserName);
    }

    public Task<string> GetUserIdAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.Id);
    }

    public Task<string?> GetUserNameAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.UserName);
    }

    public Task SetNormalizedUserNameAsync(EditorUser user, string? normalizedName, CancellationToken cancellationToken = default)
    {
        user.NormalizedUserName = normalizedName;
        return Task.CompletedTask;
    }

    public Task SetUserNameAsync(EditorUser user, string? userName, CancellationToken cancellationToken = default)
    {
        user.UserName = userName;
        return Task.CompletedTask;
    }

    public Task<IdentityResult> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        using var connection = new SqliteConnection(_connectionString);

        var resultConcurrencyStamp = connection.ExecuteScalar<string>(@"
            UPDATE AspNetUsers
            SET UserName = @UserName,
                NormalizedUserName = @NormalizedUserName,
                Email = @Email,
                NormalizedEmail = @NormalizedEmail,
                EmailConfirmed = @EmailConfirmed,
                PasswordHash = @PasswordHash,
                SecurityStamp = @SecurityStamp,
                ConcurrencyStamp = @NewConcurrencyStamp,
                LockoutEnd = @LockoutEnd,
                LockoutEnabled = @LockoutEnabled,
                AccessFailedCount = @AccessFailedCount,
                CreatedAt = @CreatedAt,
                Role = @Role
            WHERE Id = @Id and ConcurrencyStamp = @ConcurrencyStamp;

            SELECT CASE WHEN changes() = 0 THEN @ConcurrencyStamp ELSE @NewConcurrencyStamp END", new UpdateUser(user));

        if (resultConcurrencyStamp == user.ConcurrencyStamp)
            return Task.FromResult(IdentityResult.Failed(ErrorDescriber.ConcurrencyFailure()));

        user.ConcurrencyStamp = resultConcurrencyStamp;
        return Task.FromResult(IdentityResult.Success);
    }

    public Task<string?> GetPasswordHashAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.PasswordHash);
    }

    public Task<bool> HasPasswordAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(!string.IsNullOrEmpty(user.PasswordHash));
    }

    public Task SetPasswordHashAsync(EditorUser user, string? passwordHash, CancellationToken cancellationToken = default)
    {
        user.PasswordHash = passwordHash;
        return Task.CompletedTask;
    }

    public Task<EditorUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        using var connection = new SqliteConnection(_connectionString);
        var user = connection.QuerySingleOrDefault<EditorUser>(
            "SELECT * FROM AspNetUsers WHERE NormalizedEmail = @NormalizedEmail",
            new { NormalizedEmail = normalizedEmail });
        return Task.FromResult(user);
    }

    public Task<string?> GetEmailAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.Email);
    }

    public Task<bool> GetEmailConfirmedAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.EmailConfirmed);
    }

    public Task<string?> GetNormalizedEmailAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(user.NormalizedEmail);
    }

    public Task SetEmailAsync(EditorUser user, string? email, CancellationToken cancellationToken = default)
    {
        user.Email = email;
        return Task.CompletedTask;
    }

    public Task SetEmailConfirmedAsync(EditorUser user, bool confirmed, CancellationToken cancellationToken = default)
    {
        user.EmailConfirmed = confirmed;
        return Task.CompletedTask;
    }

    public Task SetNormalizedEmailAsync(EditorUser user, string? normalizedEmail, CancellationToken cancellationToken = default)
    {
        user.NormalizedEmail = normalizedEmail;
        return Task.CompletedTask;
    }

    public bool HasUsers()
    {
        using var connection = new SqliteConnection(_connectionString);
        var count = connection.ExecuteScalar<int?>("SELECT 1 FROM AspNetUsers LIMIT 1");
        return count != null;
    }

    /// <summary> Needs to be public or AOT Dapper explodes </summary>
    public class UpdateUser : EditorUser
    {
        public UpdateUser(EditorUser user)
        {
            // clone all properties
            Id = user.Id;
            UserName = user.UserName;
            NormalizedUserName = user.NormalizedUserName;
            Email = user.Email;
            NormalizedEmail = user.NormalizedEmail;
            EmailConfirmed = user.EmailConfirmed;
            PasswordHash = user.PasswordHash;
            SecurityStamp = user.SecurityStamp;
            ConcurrencyStamp = user.ConcurrencyStamp;
            PhoneNumber = user.PhoneNumber;
            PhoneNumberConfirmed = user.PhoneNumberConfirmed;
            TwoFactorEnabled = user.TwoFactorEnabled;
            LockoutEnd = user.LockoutEnd;
            LockoutEnabled = user.LockoutEnabled;
            AccessFailedCount = user.AccessFailedCount;
            CreatedAt = user.CreatedAt;
            Role = user.Role;
        }

        public string NewConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();
    }

    public Task<DateTimeOffset?> GetLockoutEndDateAsync(EditorUser user, CancellationToken cancellationToken)
    {
        return Task.FromResult(user.LockoutEnd);
    }

    public Task SetLockoutEndDateAsync(EditorUser user, DateTimeOffset? lockoutEnd, CancellationToken cancellationToken)
    {
        user.LockoutEnd = lockoutEnd;
        return Task.CompletedTask;
    }

    public Task<int> IncrementAccessFailedCountAsync(EditorUser user, CancellationToken cancellationToken)
    {
        user.AccessFailedCount++;
        return Task.FromResult(user.AccessFailedCount);
    }

    public Task ResetAccessFailedCountAsync(EditorUser user, CancellationToken cancellationToken)
    {
        user.AccessFailedCount = 0;
        return Task.CompletedTask;
    }

    public Task<int> GetAccessFailedCountAsync(EditorUser user, CancellationToken cancellationToken)
    {
        return Task.FromResult(user.AccessFailedCount);
    }

    public Task<bool> GetLockoutEnabledAsync(EditorUser user, CancellationToken cancellationToken)
    {
        return Task.FromResult(user.LockoutEnabled);
    }

    public Task SetLockoutEnabledAsync(EditorUser user, bool enabled, CancellationToken cancellationToken)
    {
        user.LockoutEnabled = enabled;
        return Task.CompletedTask;
    }
}
