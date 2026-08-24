using Editor.Domain;
using FluentValidation;

namespace Editor.Services.Auth;

public record SignInRequest(string Email, string Password, string? ReCaptchaToken = null);

public record WhoAmIResponse(string Id, Roles Role);

public record ForgotPasswordRequest(string Email, string? ReCaptchaToken = null);

public record ResetPasswordRequest(string Email, string Token, string NewPassword, string? ReCaptchaToken = null);

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
