using Editor.Domain;
using Editor.Services.Auth;
using Editor.Services.Exceptions;
using Microsoft.AspNetCore.Identity;

namespace Editor.Tests.Auth;

public class Argon2PasswordHasherTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);
    private static readonly EditorUser User = new() { UserName = "test" };

    [Fact]
    public void HashPassword_ThenVerify_Succeeds_ForCorrectPassword()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());

        var hash = hasher.HashPassword(User, "correct horse battery staple");

        Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(User, hash, "correct horse battery staple"));
    }

    [Fact]
    public void VerifyHashedPassword_Fails_ForWrongPassword()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());

        var hash = hasher.HashPassword(User, "correct horse battery staple");

        Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(User, hash, "wrong password"));
    }

    [Fact]
    public void HashPassword_ProducesArgon2idPrefixedHash()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());

        var hash = hasher.HashPassword(User, "correct horse battery staple");

        Assert.StartsWith("$argon2id$", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void VerifyHashedPassword_LegacyPbkdf2Hash_ReturnsSuccessRehashNeeded_ForCorrectPassword()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());
        var legacyHash = new PasswordHasher<EditorUser>().HashPassword(User, "correct horse battery staple");

        var result = hasher.VerifyHashedPassword(User, legacyHash, "correct horse battery staple");

        Assert.Equal(PasswordVerificationResult.SuccessRehashNeeded, result);
    }

    [Fact]
    public void VerifyHashedPassword_LegacyPbkdf2Hash_ReturnsFailed_ForWrongPassword()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());
        var legacyHash = new PasswordHasher<EditorUser>().HashPassword(User, "correct horse battery staple");

        var result = hasher.VerifyHashedPassword(User, legacyHash, "wrong password");

        Assert.Equal(PasswordVerificationResult.Failed, result);
    }

    [Fact]
    public void VerifyHashedPassword_Argon2Hash_ReturnsSuccessRehashNeeded_WhenCurrentSettingsAreStronger()
    {
        var weakHasher = new Argon2PasswordHasher(new Argon2Settings { MemoryKiB = 8192, Iterations = 1, Parallelism = 1 });
        var hash = weakHasher.HashPassword(User, "correct horse battery staple");
        var strongerHasher = new Argon2PasswordHasher(new Argon2Settings { MemoryKiB = 16384, Iterations = 1, Parallelism = 1 });

        var result = strongerHasher.VerifyHashedPassword(User, hash, "correct horse battery staple");

        Assert.Equal(PasswordVerificationResult.SuccessRehashNeeded, result);
    }

    [Fact]
    public void VerifyHashedPassword_Argon2Hash_ReturnsSuccess_WhenSettingsUnchanged()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings { MemoryKiB = 8192, Iterations = 1, Parallelism = 1 });
        var hash = hasher.HashPassword(User, "correct horse battery staple");

        var result = hasher.VerifyHashedPassword(User, hash, "correct horse battery staple");

        Assert.Equal(PasswordVerificationResult.Success, result);
    }

    [Fact]
    public void VerifyHashedPassword_MalformedArgon2String_ReturnsFailed_NotThrows()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings());

        var result = hasher.VerifyHashedPassword(User, "$argon2id$garbage", "anything");

        Assert.Equal(PasswordVerificationResult.Failed, result);
    }

    [Fact]
    public async Task ConcurrencyGate_ThrowsServiceUnavailable_WhenPermitsExhausted()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings { MaxConcurrentOperations = 1, ConcurrencyTimeoutMs = 10 });

        var attempts = Enumerable.Range(0, 2).Select(i => Task.Run(() => hasher.HashPassword(User, $"password {i}")));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Task.WhenAll(attempts)).WaitAsync(Timeout);
    }

    [Fact]
    public void ConcurrencyGate_ReleasesPermit_AfterCompletion()
    {
        var hasher = new Argon2PasswordHasher(new Argon2Settings { MaxConcurrentOperations = 1 });

        hasher.HashPassword(User, "first");
        var hash = hasher.HashPassword(User, "second");

        Assert.StartsWith("$argon2id$", hash, StringComparison.Ordinal);
    }
}
