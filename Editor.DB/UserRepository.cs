using Microsoft.EntityFrameworkCore;

namespace Editor;

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
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default)
    {
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedUserName == normalizedUserName, cancellationToken);
    }

    public async Task<EditorUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);
    }

    public async Task<bool> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        var tracked = await db.Users.SingleOrDefaultAsync(u => u.Id == user.Id, cancellationToken);
        if (tracked == null || tracked.ConcurrencyStamp != user.ConcurrencyStamp)
            return false; // выдалены або несьвежая копія

        db.Entry(tracked).CurrentValues.SetValues(user);
        tracked.ConcurrencyStamp = Guid.NewGuid().ToString();
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            user.ConcurrencyStamp = tracked.ConcurrencyStamp; // каб копія выклікальніка засталася актуальнай
            return true;
        }
        catch (DbUpdateConcurrencyException) // гонка паміж fetch і save
        {
            return false;
        }
    }

    public async Task<bool> HasUsersAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users.AnyAsync(cancellationToken);
    }

    public async Task<List<EditorUser>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users.AsNoTracking().ToListAsync(cancellationToken);
    }
}
