using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Auth
{
    public static void MapAuth(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/auth");
        group.MapPost("/sign-in", SignIn).Validate<SignInRequest>().RateLimited();
        group.MapPost("/sign-out", SignOut);
        group.MapGet("/who-am-i", WhoAmI);
        group.MapPost("/forgot-password", ForgotPassword).Validate<ForgotPasswordRequest>().RateLimited();
        group.MapPost("/reset-password", ResetPassword).Validate<ResetPasswordRequest>().RateLimited();
        group.MapGet("/config", GetConfig);
    }

    private static async Task<WhoAmIResponse> SignIn(
        [FromBody] SignInRequest request,
        AuthService authService,
        SignInManager<EditorUser> signInManager,
        HttpContext httpContext)
    {
        var user = await authService.ResolveSignInUser(request, httpContext.Connection.RemoteIpAddress?.ToString());

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
        if (result.Succeeded)
            return new WhoAmIResponse(user.Id, user.Role);

        if (result.IsLockedOut)
            throw new UnauthorizedException("Карыстальнік часова заблякаваны, паспрабуйце пасьля");

        throw new UnauthorizedException();
    }

    private static async Task SignOut(SignInManager<EditorUser> signInManager)
    {
        await signInManager.SignOutAsync();
    }

    private static WhoAmIResponse WhoAmI(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
            throw new UnauthorizedException();

        return new WhoAmIResponse(user.GetUserId()!, user.GetRole());
    }

    private static Task ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        AuthService authService,
        HttpContext httpContext)
        => authService.ForgotPassword(request, httpContext.Connection.RemoteIpAddress?.ToString());

    private static Task ResetPassword(
        [FromBody] ResetPasswordRequest request,
        AuthService authService,
        HttpContext httpContext)
        => authService.ResetPassword(request, httpContext.Connection.RemoteIpAddress?.ToString());

    private static FrontendConfigResponse GetConfig(
        ReCaptchaSettings reCaptchaSettings,
        SentrySettings sentrySettings)
    {
        return new FrontendConfigResponse(reCaptchaSettings.SiteKey, sentrySettings.FeDsn, sentrySettings.Version, sentrySettings.Environment);
    }
}

public record FrontendConfigResponse(string RecaptchaSiteKey, string SentryDsn, string Version, string Environment);
