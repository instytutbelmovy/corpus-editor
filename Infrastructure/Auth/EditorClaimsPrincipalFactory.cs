using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace Editor;

public class EditorClaimsPrincipalFactory : IUserClaimsPrincipalFactory<EditorUser>
{
    public const string UserIdClaimType = "userid";
    public const string RoleClaimType = "role";

    public Task<ClaimsPrincipal> CreateAsync(EditorUser user)
    {
        var claims = new List<Claim>
        {
            new(UserIdClaimType, user.Id),
            new(RoleClaimType, ((int)user.RoleEnum).ToString()),
        };

        var identity = new ClaimsIdentity(claims, IdentityConstants.ApplicationScheme);
        var principal = new ClaimsPrincipal(identity);

        return Task.FromResult(principal);
    }
}

public static class EditorClaimsExtensions
{
    public static string? GetUserId(this ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst(EditorClaimsPrincipalFactory.UserIdClaimType);
        return claim?.Value;
    }

    public static Roles GetRole(this ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst(EditorClaimsPrincipalFactory.RoleClaimType);
        if (claim != null && int.TryParse(claim.Value, out var roleValue))
            return (Roles)roleValue;
        return Roles.None;
    }
}