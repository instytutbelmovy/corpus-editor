using System.Security.Claims;
using Editor.Api.Infrastructure;
using Editor.Services.Users;
using Microsoft.AspNetCore.Mvc;

namespace Editor.Api;

public static class Users
{
    public static void MapUsers(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/users");
        group.MapGet("/", GetAllUsers).Admin();
        group.MapGet("/{id}", GetUserById).Admin();
        group.MapPost("/", CreateUser).Validate<EditorUserCreateDto>().Admin();
        group.MapPut("/{id}", UpdateUser).Validate<EditorUserCreateDto>().Admin();
        group.MapPost("/{id}/invite", InviteUser).Validate<InviteUserRequest>().Admin();
    }

    private static Task<IEnumerable<EditorUserDto>> GetAllUsers(IUserService userService)
        => userService.GetAllUsers();

    private static Task<EditorUserDto> GetUserById([FromRoute] string id, IUserService userService)
        => userService.GetUserById(id);

    private static Task<EditorUserDto> CreateUser([FromBody] EditorUserCreateDto request, IUserService userService)
        => userService.CreateUser(request);

    private static Task<EditorUserDto> UpdateUser([FromRoute] string id, [FromBody] EditorUserCreateDto request, IUserService userService)
        => userService.UpdateUser(id, request);

    private static Task InviteUser([FromBody] InviteUserRequest request, ClaimsPrincipal user, IUserService userService)
        => userService.InviteUser(request.UserId, user.GetUserId()!);
}
