using System.Threading.Channels;
using Amazon.DynamoDBv2.Model;

namespace Editor.Api.Infrastructure;

/// <summary>
/// In-memory buffer between AuditMiddleware (producer) and AuditPersistenceHostedService (consumer).
/// Bounded and drops on overflow so a slow/unreachable DynamoDB never applies backpressure to request handling.
/// </summary>
public sealed class AuditQueue
{
    private readonly Channel<Dictionary<string, AttributeValue>> _channel =
        Channel.CreateBounded<Dictionary<string, AttributeValue>>(
            new BoundedChannelOptions(1024) { SingleReader = true, FullMode = BoundedChannelFullMode.DropWrite });

    public void TryEnqueue(Dictionary<string, AttributeValue> item) => _channel.Writer.TryWrite(item);

    public IAsyncEnumerable<Dictionary<string, AttributeValue>> ReadAll(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
