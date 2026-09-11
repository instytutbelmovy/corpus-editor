using Editor.Domain;
using Microsoft.EntityFrameworkCore;

namespace Editor.DB;

public class UserRepository(EditorDbContext db) : IUserRepository
{
    public async Task CreateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string userId, CancellationToken cancellationToken = default)
    {
        await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<EditorUser?> FindByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default)
    {
        return await db.Users.SingleOrDefaultAsync(u => u.NormalizedUserName == normalizedUserName, cancellationToken);
    }

    public async Task<EditorUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);
    }

    public async Task<bool> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        var newStamp = Guid.NewGuid().ToString();

        // Аптымістычная блакіроўка ў WHERE: 0 радкоў = выдалены або несьвежая копія.
        // Пры NoTracking трэба пералічыць УСЕ калонкі рукамі - гл. каментар у EditorUser.
        var rows = await db.Users
            .Where(u => u.Id == user.Id && u.ConcurrencyStamp == user.ConcurrencyStamp)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.UserName, user.UserName)
                .SetProperty(u => u.NormalizedUserName, user.NormalizedUserName)
                .SetProperty(u => u.Email, user.Email)
                .SetProperty(u => u.NormalizedEmail, user.NormalizedEmail)
                .SetProperty(u => u.EmailConfirmed, user.EmailConfirmed)
                .SetProperty(u => u.PasswordHash, user.PasswordHash)
                .SetProperty(u => u.SecurityStamp, user.SecurityStamp)
                .SetProperty(u => u.PhoneNumber, user.PhoneNumber)
                .SetProperty(u => u.PhoneNumberConfirmed, user.PhoneNumberConfirmed)
                .SetProperty(u => u.TwoFactorEnabled, user.TwoFactorEnabled)
                .SetProperty(u => u.LockoutEnd, user.LockoutEnd)
                .SetProperty(u => u.LockoutEnabled, user.LockoutEnabled)
                .SetProperty(u => u.AccessFailedCount, user.AccessFailedCount)
                .SetProperty(u => u.CreatedAt, user.CreatedAt)
                .SetProperty(u => u.Role, user.Role)
                .SetProperty(u => u.ConcurrencyStamp, newStamp),
                cancellationToken);

        if (rows == 0)
            return false;

        user.ConcurrencyStamp = newStamp; // каб копія выклікальніка засталася актуальнай
        return true;
    }

    public async Task<bool> HasUsersAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users.AnyAsync(cancellationToken);
    }

    public async Task<List<EditorUser>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users.ToListAsync(cancellationToken);
    }
}
