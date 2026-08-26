using System.Security.Claims;
using Editor.Api.Infrastructure;
using Editor.Domain;
using Editor.Services.Auth;
using Editor.Services.Exceptions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Editor.Api;

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
        group.MapGet("/google/login", GoogleLogin).RateLimited();
    }

    private static async Task<WhoAmIResponse> SignIn(
        [FromBody] SignInRequest request,
        IAuthService authService,
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
        IAuthService authService,
        HttpContext httpContext)
        => authService.ForgotPassword(request, httpContext.Connection.RemoteIpAddress?.ToString());

    private static Task ResetPassword(
        [FromBody] ResetPasswordRequest request,
        IAuthService authService,
        HttpContext httpContext)
        => authService.ResetPassword(request, httpContext.Connection.RemoteIpAddress?.ToString());

    private static FrontendConfigResponse GetConfig(
        TurnstileSettings turnstileSettings,
        SentrySettings sentrySettings,
        GoogleAuthSettings googleAuthSettings)
    {
        var googleSignInEnabled = !string.IsNullOrEmpty(googleAuthSettings.ClientId) && !string.IsNullOrEmpty(googleAuthSettings.ClientSecret);
        return new FrontendConfigResponse(turnstileSettings.SiteKey, sentrySettings.FeDsn, sentrySettings.Version, sentrySettings.Environment, googleSignInEnabled);
    }

    private static IResult GoogleLogin(string? returnTo)
    {
        return Results.Challenge(
            new AuthenticationProperties { RedirectUri = ReturnUrlValidation.OrDefault(returnTo) },
            [GoogleDefaults.AuthenticationScheme]);
    }
}

public record FrontendConfigResponse(string TurnstileSiteKey, string SentryDsn, string Version, string Environment, bool GoogleSignInEnabled);
