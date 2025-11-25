using Microsoft.AspNetCore.Identity;

namespace Editor;

public class EditorUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int Role { get; set; }
    /// <summary> Duplicated because Dapper AOT doesn't yet support Enum mapping it seems </summary>
    public Roles RoleEnum
    {
        get => (Roles)Role;
        set => Role = (int)value;
    }
}

public enum Roles
{
    None = 0,
    Viewer = 10,
    Editor = 20,
    Admin = 100,
}
