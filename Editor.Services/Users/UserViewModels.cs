using FluentValidation;

namespace Editor;

public record EditorUserDto(string Id, string UserName, string Email, Roles Role);

public record EditorUserCreateDto(string UserName, string Email, Roles Role);

public record InviteUserRequest(string UserId);

public class EditorUserCreateDtoValidator : AbstractValidator<EditorUserCreateDto>
{
    public EditorUserCreateDtoValidator()
    {
        RuleFor(x => x.UserName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Role).IsInEnum();
    }
}

public class InviteUserRequestValidator : AbstractValidator<InviteUserRequest>
{
    public InviteUserRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}
