using FluentValidation;
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
        UserManager<EditorUser> userManager,
        SignInManager<EditorUser> signInManager,
        IUserRepository userRepository,
        ReCaptchaService reCaptchaService,
        IHttpContextAccessor httpContextAccessor)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            var hasUsersAtAll = await userRepository.HasUsersAsync();
            if (hasUsersAtAll)
                throw new UnauthorizedException();

            // Create the first user as admin
            user = new EditorUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = true,
                Role = Roles.Admin,
                CreatedAt = DateTime.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
                throw new BadRequestException("Не ўдалося стварыць першага карыстальніка: " + string.Join(", ", createResult.Errors.Select(e => e.Description)));
        }

        if (user.Role == Roles.None)
            throw new UnauthorizedException();

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

    private static WhoAmIResponse WhoAmI(
        UserManager<EditorUser> userManager,
        IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user == null || user.Identity?.IsAuthenticated != true)
            throw new UnauthorizedException();

        return new WhoAmIResponse(user.GetUserId()!, user.GetRole());
    }

    private static async Task ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        UserManager<EditorUser> userManager,
        EmailService emailService,
        IHttpContextAccessor httpContextAccessor,
        ReCaptchaService reCaptchaService,
        AppSettings appSettings)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null || user.Role == Roles.None)
        {
            await Task.Delay(500 + Random.Shared.Next(500));
            return; // Не раскрываем, ці існуе карыстальнік
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetUrl = $"{appSettings.BaseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

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
        UserManager<EditorUser> userManager,
        ReCaptchaService reCaptchaService,
        IHttpContextAccessor httpContextAccessor)
    {
        await CheckReCaptcha(reCaptchaService, httpContextAccessor, request.ReCaptchaToken);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Do not disclose whether the account exists: return the same generic failure an invalid
            // token yields, with matching timing jitter (cf. ForgotPassword).
            await Task.Delay(500 + Random.Shared.Next(500));
            throw new BadRequestException("Няправільны ці пратэрмінаваны токен");
        }

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

    private static FrontendConfigResponse GetConfig(
        ReCaptchaSettings reCaptchaSettings,
        SentrySettings sentrySettings)
    {
        return new FrontendConfigResponse(reCaptchaSettings.SiteKey, sentrySettings.FeDsn, sentrySettings.Version, sentrySettings.Environment);
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

public record FrontendConfigResponse(string RecaptchaSiteKey, string SentryDsn, string Version, string Environment);

public class SignInRequestValidator : AbstractValidator<SignInRequest>
{
    public SignInRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty();
    }
}