using System.Security.Claims;
using Editor.Domain;
using Editor.Services;
using Editor.Services.Auth;
using Editor.Services.Exceptions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;

namespace Editor.Api.Infrastructure;

// Google's OAuth handler is deliberately NOT configured with a SignInScheme: we intercept the ticket here, resolve/provision the EditorUser ourselves and sign in via SignInManager
// so the cookie carries this app's own claims shape (EditorClaimsPrincipalFactory), not Google's raw claims.
public static class GoogleSignInHandler
{
    public static async Task HandleTicketReceived(TicketReceivedContext context)
    {
        context.HandleResponse();

        var appSettings = context.HttpContext.RequestServices.GetRequiredService<AppSettings>();
        var safeReturnTo = ReturnUrlValidation.OrDefault(context.Properties?.RedirectUri);

        var email = context.Principal?.FindFirstValue(ClaimTypes.Email);
        var emailVerified = context.Principal?.FindFirstValue("email_verified");
        if (string.IsNullOrEmpty(email) || emailVerified == "false")
        {
            context.Response.Redirect($"{appSettings.BaseUrl}/sign-in?error=google");
            return;
        }

        try
        {
            var authService = context.HttpContext.RequestServices.GetRequiredService<IAuthService>();
            var signInManager = context.HttpContext.RequestServices.GetRequiredService<SignInManager<EditorUser>>();

            var user = await authService.ResolveGoogleSignInUser(email);
            await signInManager.SignInAsync(user, isPersistent: true);

            context.Response.Redirect($"{appSettings.BaseUrl}{safeReturnTo}");
        }
        catch (UnauthorizedException)
        {
            // Google authenticated them fine, but this app has no account for that email (or the account has no role):
            // a dedicated code so the sign-in page can say "no access" instead of "try again".
            context.Response.Redirect($"{appSettings.BaseUrl}/sign-in?error=no-access");
        }
        catch (BadRequestException)
        {
            context.Response.Redirect($"{appSettings.BaseUrl}/sign-in?error=google");
        }
    }
}
