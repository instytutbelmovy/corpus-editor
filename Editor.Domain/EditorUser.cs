using Microsoft.AspNetCore.Identity;

namespace Editor;

public class EditorUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Roles Role { get; set; }
}

public enum Roles
{
    None = 0,
    Viewer = 10,
    Editor = 20,
    Admin = 100,
}
