namespace Editor;

public interface IUserRepository
{
    Task CreateAsync(EditorUser user, CancellationToken cancellationToken = default);
    Task DeleteAsync(string userId, CancellationToken cancellationToken = default);
    Task<EditorUser?> FindByIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<EditorUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken = default);
    Task<EditorUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);
    /// <summary>
    /// Аптымістычнае абнаўленьне па ConcurrencyStamp: пры посьпеху абнаўляе stamp на новы і вяртае true,
    /// пры канфлікце пакідае stamp некранутым і вяртае false.
    /// </summary>
    Task<bool> UpdateAsync(EditorUser user, CancellationToken cancellationToken = default);
    Task<bool> HasUsersAsync(CancellationToken cancellationToken = default);
    Task<List<EditorUser>> GetAllUsersAsync(CancellationToken cancellationToken = default);
}
