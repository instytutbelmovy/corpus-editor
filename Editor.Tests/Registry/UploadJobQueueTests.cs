using Editor.Services.Registry;

namespace Editor.Tests.Registry;

public class UploadJobQueueTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    private static DocumentUploadRequest Request(int n = 1) =>
        new(n, ".txt", new MemoryStream([1, 2, 3]), $"Дакумэнт {n}", null, null, null, null, null);

    [Fact]
    public void Enqueue_MakesStatusImmediatelyVisible()
    {
        var queue = new UploadJobQueue();

        var status = queue.Enqueue(Request(7));

        var found = queue.TryGetStatus(status.Id);
        Assert.NotNull(found);
        Assert.Equal(UploadJobState.Queued, found.State);
        Assert.Equal(UploadJobStage.Queued, found.Stage);
        Assert.Equal(7, found.N);
        Assert.Equal("Дакумэнт 7", found.Title);
        Assert.Null(found.CompletedAt);
    }

    [Fact]
    public void TryGetStatus_ForUnknownJob_ReturnsNull()
    {
        Assert.Null(new UploadJobQueue().TryGetStatus(Guid.NewGuid()));
    }

    [Fact]
    public async Task ReadAll_YieldsEachJobOnce()
    {
        var queue = new UploadJobQueue();
        var first = queue.Enqueue(Request(1));
        var second = queue.Enqueue(Request(2));

        using var cts = new CancellationTokenSource();
        var received = new List<Guid>();

        await foreach (var job in queue.ReadAll(cts.Token).WithCancellation(cts.Token))
        {
            received.Add(job.Id);
            if (received.Count == 2)
                break;
        }

        Assert.Equal([first.Id, second.Id], received);
    }

    [Fact]
    public void Update_IsVisibleToLaterReaders()
    {
        var queue = new UploadJobQueue();
        var status = queue.Enqueue(Request());

        queue.Update(status.Id, s => s with { State = UploadJobState.Running, ProcessedTokens = 42, TotalTokens = 100 });

        var found = queue.TryGetStatus(status.Id);
        Assert.Equal(UploadJobState.Running, found!.State);
        Assert.Equal(42, found.ProcessedTokens);
        Assert.Equal(100, found.TotalTokens);
    }

    [Fact]
    public void Update_ForUnknownJob_DoesNothing()
    {
        var queue = new UploadJobQueue();

        // Заданьне магло быць выцесьненае па часе - абнаўленьне не мусіць падаць
        queue.Update(Guid.NewGuid(), s => s with { State = UploadJobState.Succeeded });
    }

    [Fact]
    public void EvictCompleted_RemovesOldTerminalJobs_AndKeepsRunningOnes()
    {
        var queue = new UploadJobQueue();
        var finished = queue.Enqueue(Request(1));
        var running = queue.Enqueue(Request(2));

        queue.Update(finished.Id, s => s with
        {
            State = UploadJobState.Succeeded,
            CompletedAt = DateTimeOffset.UtcNow - TimeSpan.FromHours(2),
        });
        queue.Update(running.Id, s => s with { State = UploadJobState.Running });

        queue.EvictCompleted(TimeSpan.FromHours(1));

        Assert.Null(queue.TryGetStatus(finished.Id));
        Assert.NotNull(queue.TryGetStatus(running.Id));
    }

    [Fact]
    public void EvictCompleted_KeepsRecentlyFinishedJobs()
    {
        var queue = new UploadJobQueue();
        var status = queue.Enqueue(Request());
        queue.Update(status.Id, s => s with { State = UploadJobState.Succeeded, CompletedAt = DateTimeOffset.UtcNow });

        queue.EvictCompleted(TimeSpan.FromHours(1));

        Assert.NotNull(queue.TryGetStatus(status.Id));
    }

    [Fact]
    public async Task ReadAll_WhenCancelled_StopsWithOperationCancelled()
    {
        var queue = new UploadJobQueue();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        // Гэта тое, што ловіць UploadJobWorker пры спыненьні хоста
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            await foreach (var _ in queue.ReadAll(cts.Token))
            {
            }
        }).WaitAsync(Timeout);
    }
}
