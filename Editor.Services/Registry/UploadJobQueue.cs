using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Editor.Services.Registry;

public interface IUploadJobQueue
{
    UploadJobStatus Enqueue(DocumentUploadRequest request);

    UploadJobStatus? TryGetStatus(Guid jobId);

    ICollection<UploadJobStatus> GetAll();

    IAsyncEnumerable<UploadJobItem> ReadAll(CancellationToken cancellationToken);

    void Update(Guid jobId, Func<UploadJobStatus, UploadJobStatus> transform);

    void EvictCompleted(TimeSpan ttl);
}

/// <summary>
/// Чарга загрузак у памяці. Адзін чытач - значыць, дакумэнты апрацоўваюцца строга па адным: пайплайн Stanza не патокабясьпечны,
/// вонкавы сэрвіс усё роўна сэрыялізуе запыты, а адзін дакумэнт у 200k словаў і так займае каля 100 МБ.
/// </summary>
public sealed class UploadJobQueue : IUploadJobQueue
{
    private readonly Channel<UploadJobItem> _channel =
        Channel.CreateUnbounded<UploadJobItem>(new UnboundedChannelOptions { SingleReader = true });

    private readonly ConcurrentDictionary<Guid, UploadJobStatus> _statuses = new();

    public UploadJobStatus Enqueue(DocumentUploadRequest request)
    {
        var status = new UploadJobStatus(
            Id: Guid.NewGuid(),
            N: request.N,
            Title: request.Title,
            State: UploadJobState.Queued,
            Stage: UploadJobStage.Queued,
            ProcessedTokens: 0,
            TotalTokens: 0,
            Error: null,
            CreatedAt: DateTimeOffset.UtcNow,
            CompletedAt: null);

        _statuses[status.Id] = status;

        // Чарга неабмежаваная, таму запіс ніколі не блякуе
        if (!_channel.Writer.TryWrite(new UploadJobItem(status.Id, request)))
            throw new InvalidOperationException("Upload queue is closed");

        return status;
    }

    public UploadJobStatus? TryGetStatus(Guid jobId) => _statuses.GetValueOrDefault(jobId);

    public ICollection<UploadJobStatus> GetAll() => _statuses.Values.ToList();

    public IAsyncEnumerable<UploadJobItem> ReadAll(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);

    public void Update(Guid jobId, Func<UploadJobStatus, UploadJobStatus> transform)
    {
        // Стан - нязьменны запіс, таму абнаўленьне абыходзіцца без блякаваньняў
        while (_statuses.TryGetValue(jobId, out var current))
        {
            if (_statuses.TryUpdate(jobId, transform(current), current))
                return;
        }
    }

    public void EvictCompleted(TimeSpan ttl)
    {
        var threshold = DateTimeOffset.UtcNow - ttl;

        foreach (var (id, status) in _statuses)
        {
            if (status.CompletedAt is { } completedAt && completedAt < threshold)
                _statuses.TryRemove(id, out _);
        }
    }
}
