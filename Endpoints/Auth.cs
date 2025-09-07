using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Auth
{
    public static void MapAuth(this IEndpointRouteBuilder builder)
    {
        var authApi = builder.MapGroup("/api/auth");
        authApi.MapPost("/sign-in", SignIn);
        authApi.MapPost("/sign-out", SignOut);
        authApi.MapGet("/who-am-i", WhoAmI);
    }

    private static async Task<WhoAmIResponse> SignIn(
        [FromBody] SignInRequest request,
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] SignInManager<EditorUser> signInManager,
        [FromServices] EditorUserStore editorUserStore)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            var hasUsersAtAll = editorUserStore.HasUsers();
            if (hasUsersAtAll)
                throw new UnauthorizedException();

            // Create the first user as admin
            user = new EditorUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = true,
                RoleEnum = Roles.Admin,
                CreatedAt = DateTime.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
                throw new BadRequestException("Не ўдалося стварыць першага карыстальніка: " + string.Join(", ", createResult.Errors.Select(e => e.Description)));
        }

        if (user.RoleEnum == Roles.None)
            throw new UnauthorizedException();

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
        if (result.Succeeded)
            return new WhoAmIResponse
            {
                Id = user.Id,
                Role = user.RoleEnum
            };

        if (result.IsLockedOut)
            throw new UnauthorizedException("Карыстальнік часова заблякаваны, паспрабуйце пасьля");

        throw new UnauthorizedException();
    }

    private static async Task SignOut([FromServices] SignInManager<EditorUser> signInManager)
    {
        await signInManager.SignOutAsync();
    }

    private static WhoAmIResponse WhoAmI(
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user == null || user.Identity?.IsAuthenticated != true)
            throw new UnauthorizedException();

        return new WhoAmIResponse
        {
            Id = user.GetUserId()!,
            Role = user.GetRole(),
        };
    }
}

public class SignInRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class WhoAmIResponse
{
    public string Id { get; set; } = string.Empty;
    public Roles Role { get; set; } = Roles.None;
}
