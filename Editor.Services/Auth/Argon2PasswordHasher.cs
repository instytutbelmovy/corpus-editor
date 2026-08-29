using Editor.Domain;
using Editor.Services.Exceptions;
using Isopoh.Cryptography.Argon2;
using Microsoft.AspNetCore.Identity;

namespace Editor.Services.Auth;

public class Argon2Settings
{
    public int MemoryKiB { get; set; } = 65536;
    public int Iterations { get; set; } = 3;
    public int Parallelism { get; set; } = 4;
    public int HashLength { get; set; } = 32;
    public int MaxConcurrentOperations { get; set; } = 4;
    public int ConcurrencyTimeoutMs { get; set; } = 2000;
}

// Argon2id для новых/абноўленых хэшаў, з ляніва абноўкай старых PBKDF2 хэшаў праз PasswordVerificationResult.SuccessRehashNeeded (убудаваны механізм UserManager.CheckPasswordAsync).
// Семафор абмяжоўвае колькасьць адначасовых Argon2-аперацый, каб абмежаваць найгоршы выпадак спажываньня памяці незалежна ад RateLimitPolicies.Auth (гл. plan-migrating-password-hashing).
public class Argon2PasswordHasher(Argon2Settings settings) : IPasswordHasher<EditorUser>
{
    private const string Argon2IdPrefix = "$argon2id$";

    private readonly PasswordHasher<EditorUser> _legacyHasher = new();
    private readonly SemaphoreSlim _gate = new(settings.MaxConcurrentOperations, settings.MaxConcurrentOperations);

    public string HashPassword(EditorUser user, string password)
    {
        using var _ = AcquireGate();
        return Argon2.Hash(
            password,
            timeCost: settings.Iterations,
            memoryCost: settings.MemoryKiB,
            parallelism: settings.Parallelism,
            type: Argon2Type.HybridAddressing,
            hashLength: settings.HashLength);
    }

    public PasswordVerificationResult VerifyHashedPassword(EditorUser user, string hashedPassword, string providedPassword)
    {
        if (hashedPassword.StartsWith(Argon2IdPrefix, StringComparison.Ordinal))
        {
            using var _ = AcquireGate();
            try
            {
                if (!Argon2.Verify(hashedPassword, providedPassword, settings.Parallelism))
                    return PasswordVerificationResult.Failed;
                return IsWeakerThanCurrentSettings(hashedPassword)
                    ? PasswordVerificationResult.SuccessRehashNeeded
                    : PasswordVerificationResult.Success;
            }
            catch (Exception e) when (e is FormatException or ArgumentException)
            {
                return PasswordVerificationResult.Failed;
            }
        }

        try
        {
            var legacyResult = _legacyHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
            return legacyResult == PasswordVerificationResult.Success
                ? PasswordVerificationResult.SuccessRehashNeeded
                : legacyResult;
        }
        catch (Exception e) when (e is FormatException or ArgumentException)
        {
            return PasswordVerificationResult.Failed;
        }
    }

    private bool IsWeakerThanCurrentSettings(string hashedPassword)
    {
        var config = new Argon2Config();
        if (!config.DecodeString(hashedPassword, out var hash))
            return true;
        using var _ = hash;
        return config.MemoryCost < settings.MemoryKiB
            || config.TimeCost < settings.Iterations
            || config.Lanes < settings.Parallelism;
    }

    private IDisposable AcquireGate()
    {
        if (!_gate.Wait(settings.ConcurrencyTimeoutMs))
            throw new ServiceUnavailableException("Сэрвэр часова перагружаны праверкамі пароляў, паспрабуйце пазьней");
        return new Releaser(_gate);
    }

    private sealed class Releaser(SemaphoreSlim gate) : IDisposable
    {
        private SemaphoreSlim? _gate = gate;

        public void Dispose()
        {
            _gate?.Release();
            _gate = null;
        }
    }
}
