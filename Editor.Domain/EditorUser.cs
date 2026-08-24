using Microsoft.AspNetCore.Identity;

namespace Editor.Domain;

// Новую ўласьцівасьць трэба таксама дадаць у сьпіс SetProperty у UserRepository.UpdateAsync —
// іначай яна проста ніколі ня будзе захоўвацца, моўчкі і безь якой памылкі.
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
