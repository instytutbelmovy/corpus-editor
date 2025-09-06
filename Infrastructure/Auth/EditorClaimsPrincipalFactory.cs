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
