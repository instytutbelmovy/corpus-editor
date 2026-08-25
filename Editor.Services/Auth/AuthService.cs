using Editor.Domain;
using Editor.Services.Email;
using Editor.Services.Exceptions;
using Microsoft.AspNetCore.Identity;

namespace Editor.Services.Auth;

public interface IAuthService
{
    /// <summary> Праверка captcha + стварэньне першага карыстальніка як адміна + адмова бяз ролі. Вяртае карыстальніка; выклікальнік сам робіць PasswordSignInAsync і мапіць вынік. </summary>
    Task<EditorUser> ResolveSignInUser(SignInRequest request, string? remoteIp);

    /// <summary> Тая ж лёгіка стварэньня першага адміна + адмовы бяз ролі, але для карыстальніка, ужо аўтэнтыфікаванага праз Google (пароль не патрэбны і не правяраецца). </summary>
    Task<EditorUser> ResolveGoogleSignInUser(string email);

    Task ForgotPassword(ForgotPasswordRequest request, string? remoteIp);
    Task ResetPassword(ResetPasswordRequest request, string? remoteIp);
}

public class AuthService(
    UserManager<EditorUser> userManager,
    IUserRepository userRepository,
    IReCaptchaService reCaptchaService,
    IEmailService emailService,
    AppSettings appSettings) : IAuthService
{
    public async Task<EditorUser> ResolveSignInUser(SignInRequest request, string? remoteIp)
    {
        await CheckReCaptcha(request.ReCaptchaToken, remoteIp);
        return await ResolveOrProvisionUser(request.Email, request.Password);
    }

    public Task<EditorUser> ResolveGoogleSignInUser(string email) => ResolveOrProvisionUser(email, password: null);

    private async Task<EditorUser> ResolveOrProvisionUser(string email, string? password)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            var hasUsersAtAll = await userRepository.HasUsersAsync();
            if (hasUsersAtAll)
                throw new UnauthorizedException();

            // Create the first user as admin
            user = new EditorUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                Role = Roles.Admin,
                CreatedAt = DateTime.UtcNow,
            };
            var createResult = password != null
                ? await userManager.CreateAsync(user, password)
                : await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                throw new BadRequestException("Не ўдалося стварыць першага карыстальніка: " + string.Join(", ", createResult.Errors.Select(e => e.Description)));
        }

        if (user.Role == Roles.None)
            throw new UnauthorizedException();

        return user;
    }

    public async Task ForgotPassword(ForgotPasswordRequest request, string? remoteIp)
    {
        await CheckReCaptcha(request.ReCaptchaToken, remoteIp);

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

    public async Task ResetPassword(ResetPasswordRequest request, string? remoteIp)
    {
        await CheckReCaptcha(request.ReCaptchaToken, remoteIp);

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

    private async Task CheckReCaptcha(string? reCaptchaToken, string? remoteIp)
    {
        if (reCaptchaToken == null)
            throw new BadRequestException("reCAPTCHA токен адсутнічае");
        var isValidRecaptcha = await reCaptchaService.VerifyTokenAsync(reCaptchaToken, remoteIp);
        if (!isValidRecaptcha)
            throw new BadRequestException("reCAPTCHA праверка не прайшла");
    }
}
