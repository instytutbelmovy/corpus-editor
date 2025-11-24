using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace Editor;

public class EditorClaimsPrincipalFactory : IUserClaimsPrincipalFactory<EditorUser>
{
    public const string UserIdClaimType = "userid";
    public const string NameClaimType = "name";
    public const string EmailClaimType = "email";
    public const string RoleClaimType = "role";

    public Task<ClaimsPrincipal> CreateAsync(EditorUser user)
    {
        var claims = new List<Claim>
        {
            new(UserIdClaimType, user.Id),
            new(NameClaimType, user.UserName),
            new(EmailClaimType, user.Email),
            new(RoleClaimType, ((int)user.RoleEnum).ToString()),
        };

        var identity = new ClaimsIdentity(claims, IdentityConstants.ApplicationScheme);
        var principal = new ClaimsPrincipal(identity);

        return Task.FromResult(principal);
    }
}

public static class EditorClaimsExtensions
{
    public static string? GetUserId(this ClaimsPrincipal principal) => principal.GetClaimValue(EditorClaimsPrincipalFactory.UserIdClaimType);

    public static string? GetUserName(this ClaimsPrincipal principal) => principal.GetClaimValue(EditorClaimsPrincipalFactory.NameClaimType);

    public static string? GetUserEmail(this ClaimsPrincipal principal) => principal.GetClaimValue(EditorClaimsPrincipalFactory.EmailClaimType);

    public static Roles GetRole(this ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst(EditorClaimsPrincipalFactory.RoleClaimType);
        if (claim != null && int.TryParse(claim.Value, out var roleValue))
            return (Roles)roleValue;
        return Roles.None;
    }

    public static EditorUserDto GetEditorUser(this ClaimsPrincipal principal)
        => new EditorUserDto(
            principal.GetUserId()!,
            principal.GetUserName()!,
            principal.GetUserEmail()!,
            principal.GetRole()
        );

    private static string? GetClaimValue(this ClaimsPrincipal principal, string claimType) => principal.FindFirst(claimType)?.Value;
}