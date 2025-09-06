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

    private static async Task<IResult> SignIn(
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
            {
                return Results.Unauthorized();
            }

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
            {
                return Results.Problem("Failed to create the initial admin user.");
            }
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
        if (result.Succeeded)
        {
            return Results.Ok(new WhoAmIResponse
            {
                Id = user.Id,
                Role = user.RoleEnum
            });
        }

        if (result.IsLockedOut)
            return Results.Problem("Карыстальнік часова заблякаваны, паспрабуйце пасьля");

        return Results.Unauthorized();
    }

    private static async Task<IResult> SignOut([FromServices] SignInManager<EditorUser> signInManager)
    {
        await signInManager.SignOutAsync();
        return Results.Ok();
    }

    private static IResult WhoAmI(
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user == null || user.Identity?.IsAuthenticated != true)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new WhoAmIResponse
        {
            Id = user.GetUserId()!,
            Role = user.GetRole(),
        });
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
