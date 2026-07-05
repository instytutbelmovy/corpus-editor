using Microsoft.EntityFrameworkCore;

namespace Editor;

public class UserRepository(IDbContextFactory<EditorDbContext> contextFactory) : IUserRepository
{
    public async Task CreateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string userId, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<EditorUser?> FindByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedUserName == normalizedUserName, cancellationToken);
    }

    public async Task<EditorUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);
    }

    public async Task<bool> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);

        var oldConcurrencyStamp = user.ConcurrencyStamp;
        // Attach фіксуе стары ConcurrencyStamp як арыгінальнае значэньне — EF дадае яго ў WHERE
        var entry = db.Users.Attach(user);
        entry.State = EntityState.Modified;
        user.ConcurrencyStamp = Guid.NewGuid().ToString();

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            user.ConcurrencyStamp = oldConcurrencyStamp;
            return false;
        }
    }

    public async Task<bool> HasUsersAsync(CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AnyAsync(cancellationToken);
    }

    public async Task<List<EditorUser>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AsNoTracking().ToListAsync(cancellationToken);
    }
}
