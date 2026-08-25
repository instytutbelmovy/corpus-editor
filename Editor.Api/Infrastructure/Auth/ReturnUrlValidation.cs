namespace Editor.Api.Infrastructure;

public static class ReturnUrlValidation
{
    public static bool IsSafe(string? returnTo)
        => !string.IsNullOrEmpty(returnTo) && returnTo.StartsWith('/') && !returnTo.StartsWith("//") && !returnTo.Contains("://");

    public static string OrDefault(string? returnTo, string fallback = "/")
        => IsSafe(returnTo) ? returnTo! : fallback;
}
