using Microsoft.AspNetCore.Identity;

namespace Editor;

public class EditorUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int Role { get; set; }
    /// <summary> Duplicated because Dapper AOT doesn't yet support Enum mapping it seems </summary>
    public Role RoleEnum
    {
        get => (Role)Role;
        set => Role = (int)value;
    }
}

public enum Role
{
    Viewer = 0,
    Editor = 10,
    Admin = 100,
}
