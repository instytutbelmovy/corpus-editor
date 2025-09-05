using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Auth
{
    public static void MapAuth(this IEndpointRouteBuilder builder)
    {
        var authApi = builder.MapGroup("/auth");
        authApi.MapPost("/sign-in", SignIn);
        authApi.MapPost("/refresh", RefreshToken);
    }

    private static async Task<IResult> SignIn(
        [FromBody] SignInRequest request,
        [FromServices] UserManager<EditorUser> userManager,
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
                RoleEnum = Role.Admin,
                CreatedAt = DateTime.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                return Results.Problem("Failed to create the initial admin user.");
            }
        }

        var isValidPassword = await userManager.CheckPasswordAsync(user, request.Password);
        if (!isValidPassword)
            return Results.Unauthorized();

        return Results.Ok("Каб мяне курвы, спрацавала");
    }

    private static IResult RefreshToken(
        [FromBody] RefreshTokenRequest request)
    {
        return Results.Ok();
    }
}

public class SignInRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SignInResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Role Role { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RefreshTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}