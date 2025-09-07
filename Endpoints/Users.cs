using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Users
{
    public static void MapUsers(this IEndpointRouteBuilder builder)
    {
        var authApi = builder.MapGroup("/api/users");
        authApi.MapGet("/", GetAllUsers).Admin();
        authApi.MapPost("/", CreateUser).Admin();
        authApi.MapPut("/{id}", UpdateUser).Admin();
    }

    private static IEnumerable<EditorUserDto> GetAllUsers(
        [FromServices] EditorUserStore editorUserStore)
    {
        var users = editorUserStore.GetAllUsers();
        return users.Select(user => new EditorUserDto(
            user.Id,
            user.UserName!,
            user.Email!,
            user.RoleEnum
        ));
    }

    private static async Task<EditorUserDto> CreateUser(
        [FromBody] EditorUserCreateDto request,
        [FromServices] UserManager<EditorUser> userManager)
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
            RoleEnum = request.Role,
            CreatedAt = DateTime.UtcNow,
        };

        var result = await userManager.CreateAsync(user);

        if (!result.Succeeded)
            throw new BadRequestException("Не ўдалося стварыць карыстальніка: " + string.Join(", ", result.Errors.Select(e => e.Description)));

        return new EditorUserDto(
            user.Id,
            user.UserName,
            user.Email,
            user.RoleEnum
        );
    }

    private static async Task<EditorUserDto> UpdateUser(
        [FromRoute] string id,
        [FromBody] EditorUserCreateDto request,
        [FromServices] UserManager<EditorUser> userManager)
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
        user.RoleEnum = request.Role;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new BadRequestException("Не ўдалося абнавіць карыстальніка: " + string.Join(", ", result.Errors.Select(e => e.Description)));

        return new EditorUserDto(
            user.Id,
            user.UserName!,
            user.Email!,
            user.RoleEnum
        );
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

public record EditorUserDto(string Id, string UserName, string Email, Roles Role)
{
}

public record EditorUserCreateDto(string UserName, string Email, Roles Role)
{
}
