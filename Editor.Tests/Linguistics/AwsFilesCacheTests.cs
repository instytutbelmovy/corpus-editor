using Editor.Domain.Corpus;
using Editor.Services.Corpus;
using Editor.Services.Exceptions;

namespace Editor.Tests.Linguistics;

public class AwsFilesCacheTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task GetFileForWrite_ReleasesLock_WhenLoadFails()
    {
        var storage = await CreateStorage(1);
        var cache = await CreateInitializedCache(storage);

        storage.OnRead = _ => throw new IOException("storage down");
        await Assert.ThrowsAsync<IOException>(() => cache.GetFileForWrite(1, markPendingChangesUponCompletion: true).WaitAsync(Timeout));

        storage.OnRead = null;
        // Would deadlock forever before the fix - the failed load never released the document lock
        var document = await cache.GetFileForRead(1).WaitAsync(Timeout);
        Assert.Equal(1, document.Header.N);
    }

    [Fact]
    public async Task ReloadFilesList_ConcurrentCalls_AllComplete()
    {
        var storage = await CreateStorage(1, 2);
        var cache = await CreateInitializedCache(storage);

        // Slow the listing down so the reloads actually overlap
        storage.OnList = () => Task.Delay(50);
        var reloads = Enumerable.Range(0, 5).Select(_ => Task.Run(cache.ReloadFilesList));
        await Task.WhenAll(reloads).WaitAsync(Timeout);

        var headers = await cache.GetAllDocumentHeaders();
        Assert.Equal(2, headers.Count);
    }

    [Fact]
    public async Task FailedInitialization_SurfacesToCallers_AndIsRecoverableViaReload()
    {
        var storage = await CreateStorage(1);
        storage.OnList = () => throw new InvalidOperationException("storage down");

        var cache = new AwsFilesCache(storage, null);
        cache.Initialize();

        // Requests fail instead of hanging forever
        await Assert.ThrowsAsync<InvalidOperationException>(() => cache.GetFileForRead(1).WaitAsync(Timeout));

        storage.OnList = null;
        await cache.ReloadFilesList().WaitAsync(Timeout);

        var document = await cache.GetFileForRead(1).WaitAsync(Timeout);
        Assert.Equal(1, document.Header.N);
    }

    [Fact]
    public async Task UploadPendingAndPurgeCache_ContinuesAfterFailedFlush()
    {
        var storage = await CreateStorage(1, 2);
        var cache = await CreateInitializedCache(storage);

        foreach (var n in (int[])[1, 2])
        {
            var (documentLock, _) = await cache.GetFileForWrite(n, markPendingChangesUponCompletion: true);
            documentLock.Dispose();
        }

        storage.OnWrite = key => key == "1.verti" ? throw new IOException("storage down") : Task.CompletedTask;
        await cache.UploadPendingAndPurgeCache().WaitAsync(Timeout);
        Assert.Contains("2.verti", storage.WrittenKeys);
        Assert.DoesNotContain("1.verti", storage.WrittenKeys);

        // The failed document stays pending and flushes on the next cycle
        storage.OnWrite = null;
        await cache.UploadPendingAndPurgeCache().WaitAsync(Timeout);
        Assert.Contains("1.verti", storage.WrittenKeys);
    }

    [Fact]
    public async Task ReloadFilesList_KeepsDocumentMissingFromListing_WhenItStillExists()
    {
        var storage = await CreateStorage(1, 2);
        var cache = await CreateInitializedCache(storage);

        // Simulates a listing that predates a concurrent upload: document 2 is not listed but exists
        storage.ListKeysOverride = () => ["1.verti"];
        await cache.ReloadFilesList().WaitAsync(Timeout);

        var header = await cache.GetDocumentHeader(2).AsTask().WaitAsync(Timeout);
        Assert.Equal(2, header.N);
    }

    [Fact]
    public async Task ReloadFilesList_RemovesDocument_WhenActuallyGoneFromStorage()
    {
        var storage = await CreateStorage(1, 2);
        var cache = await CreateInitializedCache(storage);

        storage.Files.TryRemove("2.verti", out _);
        await cache.ReloadFilesList().WaitAsync(Timeout);

        await Assert.ThrowsAsync<NotFoundException>(() => cache.GetDocumentHeader(2).AsTask().WaitAsync(Timeout));
        var headers = await cache.GetAllDocumentHeaders();
        Assert.Single(headers);
    }

    [Fact]
    public async Task Initialization_ToleratesDuplicateDocumentNumbers()
    {
        var storage = new InMemoryCorpusStorage();
        await storage.Write("1.verti", CreateDocument(1));
        await storage.Write("99.verti", CreateDocument(1)); // same N under a different key

        // Would hang forever before the fix (ToDictionary threw and left the cache uninitialized)
        var cache = await CreateInitializedCache(storage);

        var headers = await cache.GetAllDocumentHeaders();
        Assert.Single(headers);
    }

    [Fact]
    public async Task GetRawFile_IncludesUnflushedChanges()
    {
        var storage = await CreateStorage(1);
        var cache = await CreateInitializedCache(storage);

        var (documentLock, document) = await cache.GetFileForWrite(1, markPendingChangesUponCompletion: true);
        using (documentLock)
        {
            var sentence = document.Paragraphs[0].Sentences[0];
            sentence.SentenceItems[0] = sentence.SentenceItems[0] with { Text = "зьменена" };
        }

        await using var stream = await cache.GetRawFile(1).WaitAsync(Timeout);
        using var reader = new StreamReader(stream);
        var raw = await reader.ReadToEndAsync();
        Assert.Contains("зьменена", raw);
        Assert.Empty(storage.WrittenKeys); // came from the cache, not from a flush
    }

    private static CorpusDocument CreateDocument(int n) => new(
        new CorpusDocumentHeader(n, $"Title {n}", null, null, null, null, null, null, null) { PercentCompletion = 0 },
        [new Paragraph(1, Guid.NewGuid(), [new Sentence(1, Guid.NewGuid(), [new LinguisticItem("слова", SentenceItemType.Word)])])]);

    private static async Task<InMemoryCorpusStorage> CreateStorage(params int[] documentNumbers)
    {
        var storage = new InMemoryCorpusStorage();
        foreach (var n in documentNumbers)
            await storage.Write($"{n}.verti", CreateDocument(n));
        storage.WrittenKeys.Clear();
        return storage;
    }

    private static async Task<AwsFilesCache> CreateInitializedCache(InMemoryCorpusStorage storage)
    {
        var cache = new AwsFilesCache(storage, null);
        cache.Initialize();
        await cache.GetAllDocumentHeaders().AsTask().WaitAsync(Timeout);
        return cache;
    }
}
