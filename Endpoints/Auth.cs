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
        authApi.MapPost("/forgot-password", ForgotPassword);
        authApi.MapPost("/reset-password", ResetPassword);
        authApi.MapGet("/config", GetConfig);
    }

    private static async Task<WhoAmIResponse> SignIn(
        [FromBody] SignInRequest request,
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] SignInManager<EditorUser> signInManager,
        [FromServices] EditorUserStore editorUserStore,
        [FromServices] ReCaptchaService reCaptchaService,
        [FromServices] IHttpContextAccessor httpContextAccessor)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

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
            return new WhoAmIResponse(user.Id, user.RoleEnum);

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

        return new WhoAmIResponse(user.GetUserId()!, user.GetRole());
    }

    private static async Task ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] EmailService emailService,
        [FromServices] IHttpContextAccessor httpContextAccessor,
        [FromServices] ReCaptchaService reCaptchaService)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null || user.RoleEnum == Roles.None)
        {
            await Task.Delay(500 + Random.Shared.Next(500));
            return; // Не раскрываем, ці існуе карыстальнік
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var baseUrl = $"{httpContextAccessor.HttpContext!.Request.Scheme}://{httpContextAccessor.HttpContext.Request.Host}";
        var resetUrl = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

        await emailService.SendAsync(new EmailMessage
        {
            To = user.Email!,
            Subject = "Аднаўленьне паролю да БелКорпусу",
            Template = "Password Reset",
            TemplateArguments = new () { { "resetUrl", resetUrl } },
        });
    }

    private static async Task ResetPassword(
        [FromBody] ResetPasswordRequest request,
        [FromServices] UserManager<EditorUser> userManager,
        [FromServices] ReCaptchaService reCaptchaService,
        [FromServices] IHttpContextAccessor httpContextAccessor)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            throw new NotFoundException();

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var message = result.Errors.FirstOrDefault()?.Code switch
            {
                "InvalidToken" => "Няправільны ці пратэрмінаваны токен",
                "PasswordTooShort" => "Пароль занадта кароткі",
                _ => "Не ўдалося аднавіць пароль",
            };
            throw new BadRequestException(message);
        }
    }

    private static FrontendConfigResponse GetConfig([FromServices] ReCaptchaSettings reCaptchaSettings)
    {
        return new FrontendConfigResponse(reCaptchaSettings.SiteKey);
    }

    private static async Task CheckReCaptcha(ReCaptchaService reCaptchaService, IHttpContextAccessor httpContextAccessor, string? requestReCaptchaToken)
    {
        if (requestReCaptchaToken == null)
            throw new BadRequestException("reCAPTCHA токен адсутнічае");
        var remoteIp = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        var isValidRecaptcha = await reCaptchaService.VerifyTokenAsync(requestReCaptchaToken, remoteIp);
        if (!isValidRecaptcha)
            throw new BadRequestException("reCAPTCHA праверка не прайшла");
    }
}

public record SignInRequest(string Email, string Password, string? ReCaptchaToken = null);

public record WhoAmIResponse(string Id, Roles Role);

public record ForgotPasswordRequest(string Email, string? ReCaptchaToken = null);

public record ResetPasswordRequest(string Email, string Token, string NewPassword, string? ReCaptchaToken = null);

public record FrontendConfigResponse(string RecaptchaSiteKey);
