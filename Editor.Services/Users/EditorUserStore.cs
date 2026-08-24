using Editor.Domain;
using Microsoft.AspNetCore.Identity;

namespace Editor.Services.Users;

public class EditorUserStore(IUserRepository userRepository) : IUserStore<EditorUser>, IUserPasswordStore<EditorUser>, IUserEmailStore<EditorUser>, IUserLockoutStore<EditorUser>, IUserSecurityStampStore<EditorUser>
{
    private readonly IdentityErrorDescriber ErrorDescriber = new();

    public async Task<IdentityResult> CreateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        user.Id = Guid.NewGuid().ToString();
        user.ConcurrencyStamp = Guid.NewGuid().ToString();

        await userRepository.CreateAsync(user, cancellationToken);

        return IdentityResult.Success;
    }

    public async Task<IdentityResult> DeleteAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        await userRepository.DeleteAsync(user.Id, cancellationToken);
        return IdentityResult.Success;
    }

    public void Dispose()
    {
        // Nothing to dispose
    }

    public Task<EditorUser?> FindByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return userRepository.FindByIdAsync(userId, cancellationToken);
    }

    public Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default)
    {
        return userRepository.FindByNameAsync(normalizedUserName, cancellationToken);
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

    public async Task<IdentityResult> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        var updated = await userRepository.UpdateAsync(user, cancellationToken);

        return updated
            ? IdentityResult.Success
            : IdentityResult.Failed(ErrorDescriber.ConcurrencyFailure());
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
        return userRepository.FindByEmailAsync(normalizedEmail, cancellationToken);
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

    public Task SetSecurityStampAsync(EditorUser user, string stamp, CancellationToken cancellationToken)
    {
        if (user == null)
            throw new ArgumentNullException(nameof(user));
        if (stamp == null)
            throw new ArgumentNullException(nameof(stamp));
        user.SecurityStamp = stamp;
        return Task.CompletedTask;
    }

    public Task<string?> GetSecurityStampAsync(EditorUser user, CancellationToken cancellationToken)
    {
        if (user == null)
            throw new ArgumentNullException(nameof(user));
        return Task.FromResult(user.SecurityStamp);
    }
}
