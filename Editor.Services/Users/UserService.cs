using Editor.Domain;
using Editor.Services.Email;
using Editor.Services.Exceptions;
using Microsoft.AspNetCore.Identity;

namespace Editor.Services.Users;

public interface IUserService
{
    Task<IEnumerable<EditorUserDto>> GetAllUsers();
    Task<EditorUserDto> GetUserById(string id);
    Task<EditorUserDto> CreateUser(EditorUserCreateDto request);
    Task<EditorUserDto> UpdateUser(string id, EditorUserCreateDto request);
    Task InviteUser(string inviteeUserId, string inviterUserId);
}

public class UserService(
    IUserRepository userRepository,
    UserManager<EditorUser> userManager,
    IEmailService emailService,
    AppSettings appSettings) : IUserService
{
    public async Task<IEnumerable<EditorUserDto>> GetAllUsers()
    {
        var users = await userRepository.GetAllUsersAsync();
        return users.Select(user => new EditorUserDto(
            user.Id,
            user.UserName!,
            user.Email!,
            user.Role
        ));
    }

    public async Task<EditorUserDto> GetUserById(string id)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            throw new NotFoundException("Карыстальнік ня знойдзены");

        return new EditorUserDto(user.Id, user.UserName!, user.Email!, user.Role);
    }

    public async Task<EditorUserDto> CreateUser(EditorUserCreateDto request)
    {
        ValidateUserRequest(request);

        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            throw new ConflictException("Карыстальнік з такім email ужо існуе");

        var existingUserByName = await userManager.FindByNameAsync(request.UserName);
        if (existingUserByName != null)
            throw new ConflictException("Карыстальнік з такім імём ужо існуе");

        var user = new EditorUser
        {
            UserName = request.UserName,
            Email = request.Email,
            EmailConfirmed = true,
            Role = request.Role,
            CreatedAt = DateTime.UtcNow,
        };

        var result = await userManager.CreateAsync(user);

        if (!result.Succeeded)
            throw new BadRequestException("Не ўдалося стварыць карыстальніка: " + string.Join(", ", result.Errors.Select(e => e.Description)));

        return new EditorUserDto(
            user.Id,
            user.UserName,
            user.Email,
            user.Role
        );
    }

    public async Task<EditorUserDto> UpdateUser(string id, EditorUserCreateDto request)
    {
        ValidateUserRequest(request);

        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            throw new NotFoundException("Карыстальнік ня знойдзены");

        if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
        {
            var existingUser = await userManager.FindByEmailAsync(request.Email);
            if (existingUser != null && existingUser.Id != user.Id)
                throw new ConflictException("Карыстальнік з такім email ужо існуе");
        }

        if (!string.IsNullOrEmpty(request.UserName) && request.UserName != user.UserName)
        {
            var existingUser = await userManager.FindByNameAsync(request.UserName);
            if (existingUser != null && existingUser.Id != user.Id)
                throw new ConflictException("Карыстальнік з такім імём ужо існуе");
        }

        user.UserName = request.UserName;
        user.Email = request.Email;
        user.Role = request.Role;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new BadRequestException("Не ўдалося абнавіць карыстальніка: " + string.Join(", ", result.Errors.Select(e => e.Description)));

        return new EditorUserDto(
            user.Id,
            user.UserName!,
            user.Email!,
            user.Role
        );
    }

    public async Task InviteUser(string inviteeUserId, string inviterUserId)
    {
        var user = await userManager.FindByIdAsync(inviteeUserId);
        if (user == null)
            throw new NotFoundException("Карыстальнік ня знойдзены");

        if (user.Role == Roles.None)
            throw new BadRequestException("Карыстальнік не мае ролі і не можа быць запрошаны");

        var resetUrl = $"{appSettings.BaseUrl}/forgot-password?email={Uri.EscapeDataString(user.Email!)}";

        var currentUser = await userManager.FindByIdAsync(inviterUserId);

        await emailService.SendAsync(new EmailMessage
        {
            To = user.Email!,
            Subject = "Запрашэньне далучыцца да БелКорпусу",
            Template = "Invite",
            TemplateArguments = new()
            {
                { "inviteeName", user.UserName! },
                { "inviterName", currentUser!.UserName! },
                { "resetUrl", resetUrl },
            },
        });
    }

    private static void ValidateUserRequest(EditorUserCreateDto request)
    {
        var errors = new List<string>();

        // Валідацыя UserName
        if (string.IsNullOrWhiteSpace(request.UserName))
            errors.Add("Імя карыстальніка абавязковае");
        else if (request.UserName.Length > 50)
            errors.Add("Імя карыстальніка не можа быць даўжэй за 50 сімвалаў");

        // Валідацыя Email
        if (string.IsNullOrWhiteSpace(request.Email))
            errors.Add("Email абавязковы");
        else if (request.Email.Length > 100)
            errors.Add("Email не можа быць даўжэй за 100 сімвалаў");

        // Валідацыя Roles
        if (!Enum.IsDefined(typeof(Roles), request.Role))
        {
            var validRoles = string.Join(", ", Enum.GetNames<Roles>());
            errors.Add($"Роля павінна быць адным з значэньняў: {validRoles}");
        }

        if (errors.Count > 0)
            throw new BadRequestException($"Памылкі валідацыі: {string.Join(", ", errors)}");
    }
}
