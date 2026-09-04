using System.Collections.Concurrent;
using Editor.Domain.Corpus;
using Editor.Services.Exceptions;

namespace Editor.Services.Corpus;

public interface IAwsFilesCache
{
    void Initialize();
    Task ReloadFilesList();
    Task<CorpusDocument> GetFileForRead(int n);
    Task<(IDisposable documentLock, CorpusDocument document)> GetFileForWrite(int n, bool markPendingChangesUponCompletion);
    Task<CorpusDocumentHeader> ReloadFile(int n);
    Task<Stream> GetRawFile(int n);

    /// <summary> Only to be called within a write lock obtained from GetFileForWrite. </summary>
    Task FlushFile(int n);
    ValueTask<ICollection<CorpusDocumentHeader>> GetAllDocumentHeaders();
    ValueTask<CorpusDocumentHeader> GetDocumentHeader(int n);
    void UpdateHeaderCache(int id, CorpusDocumentHeader header);
    Task AddFile(CorpusDocument corpusDocument);
    Task UploadPendingAndPurgeCache();
}

public class AwsFilesCache(ICorpusStorage storage, ILogger<AwsFilesCache>? logger) : IAwsFilesCache
{
    private static readonly TimeSpan UnloadingAge = TimeSpan.FromMinutes(10);
    private readonly ConcurrentDictionary<int, CorpusDocumentHeader> _documentHeaders = new();
    private readonly ConcurrentDictionary<int, SemaphoreSlim> _documentsLocks = new();
    private readonly ConcurrentDictionary<int, Document> _documents = new();
    private readonly SemaphoreSlim _reloadLock = new(1, 1);
    /// <summary> Single-shot; replaced only under <see cref="_reloadLock"/>, and only when the previous initialization faulted. </summary>
    private TaskCompletionSource _initialized = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _initializeStarted;
    private readonly ILogger? _logger = logger;

    public void Initialize()
    {
        if (Interlocked.Exchange(ref _initializeStarted, 1) != 0)
            throw new InvalidOperationException($"{nameof(AwsFilesCache)} is already initialized");

        _logger?.LogInformation("Initializing files cache");
        _ = Task.Run(() => RunInitialization(_initialized));
    }

    private async Task RunInitialization(TaskCompletionSource initialized)
    {
        try
        {
            await ReadFilesList();
            initialized.TrySetResult();
            _logger?.LogInformation("Initialized files cache");
        }
        catch (Exception ex)
        {
            // A faulted TCS makes every awaiting request fail loudly instead of hanging; ReloadFilesList can retry
            _logger?.LogCritical(ex, "Files cache initialization failed");
            initialized.TrySetException(ex);
        }
    }

    public async Task ReloadFilesList()
    {
        await _reloadLock.WaitAsync();
        try
        {
            if (_initialized.Task.IsFaulted)
            {
                _logger?.LogInformation("Re-initializing files cache after failed initialization");
                _initialized = new(TaskCreationOptions.RunContinuationsAsynchronously);
                await RunInitialization(_initialized);
                await _initialized.Task;
                return;
            }

            await _initialized.Task;

            _logger?.LogInformation("Re-reading files list");
            // Flush pending edits first so the headers re-read below can't be clobbered by a later flush
            await UploadPendingAndPurgeCache();
            var listedIds = await ReadFilesList();

            var removedDocuments = _documentHeaders.Keys.Except(listedIds).ToList();
            foreach (var id in removedDocuments)
            {
                var documentLock = _documentsLocks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
                await documentLock.WaitAsync();
                try
                {
                    // The listing may predate a concurrent upload - only drop documents actually gone from storage
                    if (await storage.Exists($"{id}.verti"))
                        continue;
                    _documentHeaders.TryRemove(id, out _);
                    if (_documents.TryRemove(id, out var evicted) && evicted.HasPendingChanges)
                        _logger?.LogWarning("Discarding pending changes of document {n}: it was removed from storage", id);
                }
                finally
                {
                    documentLock.Release();
                }
            }
        }
        finally
        {
            _reloadLock.Release();
        }
    }

    /// <summary> Reads all document headers from storage and merges them into the header cache. Returns the document ids present in storage. </summary>
    private async Task<HashSet<int>> ReadFilesList()
    {
        var keys = await storage.ListKeys(".verti");
        var listedIds = new HashSet<int>();
        foreach (var key in keys)
        {
            try
            {
                var header = await ReadDocumentHeader(key);
                if (header == null)
                    continue;
                if (!listedIds.Add(header.N))
                {
                    _logger?.LogError("Duplicate document number {n} in storage file {Key}; keeping the previously read one", header.N, key);
                    continue;
                }

                _documentHeaders[header.N] = header;
            }
            catch (Exception ex)
            {
                // Log error but continue with other files
                _logger?.LogError(ex, $"Error reading file {key}");
            }
        }

        return listedIds;
    }

    private async Task<CorpusDocumentHeader?> ReadDocumentHeader(string key)
    {
        await using var stream = await storage.OpenRead(key);
        using var reader = new StreamReader(stream);

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (line.StartsWith("<!--")) continue;

            if (VertiIO.TryReadHeader(line, out var header))
            {
                if (header.PercentCompletion == null)
                    await BackfillPercentCompletion(header, reader);
                return header;
            }
        }

        return null;
    }

    /// <summary> Legacy file without completion in the header: compute it and persist the file, without clobbering a concurrently edited document. </summary>
    private async Task BackfillPercentCompletion(CorpusDocumentHeader header, StreamReader reader)
    {
        var documentLock = _documentsLocks.GetOrAdd(header.N, _ => new SemaphoreSlim(1, 1));
        await documentLock.WaitAsync();
        try
        {
            if (_documents.TryGetValue(header.N, out var cached))
            {
                // The cached copy is newer than what our reader sees - compute from it and flush it
                cached.CorpusDocument.Header.PercentCompletion = cached.CorpusDocument.ComputeCompletion();
                header.PercentCompletion = cached.CorpusDocument.Header.PercentCompletion;
                await storage.Write($"{header.N}.verti", cached.CorpusDocument);
                cached.HasPendingChanges = false;
            }
            else
            {
                // ffs, now need to get the full document, compute completion, and update on storage
                var document = await VertiIO.ReadDocument(reader);
                header.PercentCompletion = document.ComputeCompletion();
                document = document with { Header = header, };
                await storage.Write($"{header.N}.verti", document);
            }
        }
        finally
        {
            documentLock.Release();
        }
    }

    public async Task<CorpusDocument> GetFileForRead(int n)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            var document = await GetOrLoadDocument(n);
            return document.CorpusDocument;
        }
        finally
        {
            documentLock.Release();
        }
    }

    public async Task<(IDisposable documentLock, CorpusDocument document)> GetFileForWrite(int n, bool markPendingChangesUponCompletion)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            var document = await GetOrLoadDocument(n);
            return (new DocumentLockWrapper(documentLock, markPendingChangesUponCompletion ? document : null), document.CorpusDocument);
        }
        catch
        {
            // The lock is handed over to the wrapper only on success - a failed load must not keep it forever
            documentLock.Release();
            throw;
        }
    }

    /// <summary> Only to be called while holding the document's lock. </summary>
    private async Task<Document> GetOrLoadDocument(int n)
    {
        if (!_documents.TryGetValue(n, out var document))
        {
            var objectKey = $"{n}.verti";
            var corpusDocument = await ReadDocument(objectKey);
            var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
            if (rewriteCorpusDocument != null)
            {
                await storage.Write(objectKey, rewriteCorpusDocument);
                corpusDocument = rewriteCorpusDocument;
            }

            _documents[n] = document = new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow };
        }

        document.LastAccessedOn = DateTime.UtcNow;
        return document;
    }

    private async Task<CorpusDocument> ReadDocument(string objectKey)
    {
        await using var stream = await storage.OpenRead(objectKey);
        using var reader = new StreamReader(stream);
        return await VertiIO.ReadDocument(reader);
    }

    public async Task<CorpusDocumentHeader> ReloadFile(int n)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            var objectKey = $"{n}.verti";
            var corpusDocument = await ReadDocument(objectKey);
            var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
            if (rewriteCorpusDocument != null)
            {
                await storage.Write(objectKey, rewriteCorpusDocument);
                corpusDocument = rewriteCorpusDocument;
            }

            if (_documents.TryGetValue(n, out var cached))
            {
                if (cached.HasPendingChanges)
                    _logger?.LogWarning("Discarding pending changes of document {n} on reload", n);
                _documents[n] = new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow };
            }
            _documentHeaders[n] = corpusDocument.Header;

            return corpusDocument.Header;
        }
        finally
        {
            documentLock.Release();
        }
    }

    public async Task<Stream> GetRawFile(int n)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            if (_documents.TryGetValue(n, out var document))
            {
                // Serve the cached copy so the download includes changes not yet flushed to storage
                var stream = new MemoryStream();
                await VertiIO.WriteDocument(stream, document.CorpusDocument);
                stream.Position = 0;
                return stream;
            }
        }
        finally
        {
            documentLock.Release();
        }

        return await storage.OpenRead($"{n}.verti");
    }

    /// <summary> Only to be called within a write lock obtained from GetFileForWrite. </summary>
    public async Task FlushFile(int n)
    {
        if (!_documents.TryGetValue(n, out var document))
            throw new InvalidOperationException($"File {n} is not present in the cache");

        try
        {
            await FlushFile(document.CorpusDocument);
            document.HasPendingChanges = false;
        }
        catch
        {
            // The caller has already applied its changes in memory - make sure the maintenance cycle retries the upload
            document.HasPendingChanges = true;
            throw;
        }
    }

    private async Task FlushFile(CorpusDocument document)
    {
        var id = document.Header.N;
        await storage.Write($"{id}.verti", document);

        if (_documentHeaders.TryGetValue(id, out var header))
            header.PercentCompletion = document.ComputeCompletion();
    }

    public async ValueTask<ICollection<CorpusDocumentHeader>> GetAllDocumentHeaders()
    {
        await _initialized.Task;
        return _documentHeaders.Values;
    }

    public async ValueTask<CorpusDocumentHeader> GetDocumentHeader(int n)
    {
        await _initialized.Task;

        return _documentHeaders.TryGetValue(n, out var header)
            ? header
            : throw new NotFoundException();
    }

    public void UpdateHeaderCache(int id, CorpusDocumentHeader header)
    {
        _documentHeaders[id] = header;
    }

    public async Task AddFile(CorpusDocument corpusDocument)
    {
        await _initialized.Task;
        var documentLock = GetDocumentLock(corpusDocument.Header.N, ensureExistence: false);
        await documentLock.WaitAsync();
        try
        {
            if (_documentHeaders.ContainsKey(corpusDocument.Header.N))
                throw new BusinessException($"Дакумэнт з нумарам {corpusDocument.Header.N} ужо існуе");

            await storage.Write($"{corpusDocument.Header.N}.verti", corpusDocument);

            var document = new Document
            {
                CorpusDocument = corpusDocument,
                LastAccessedOn = DateTime.UtcNow,
            };
            _documents[corpusDocument.Header.N] = document;
            _documentHeaders[corpusDocument.Header.N] = corpusDocument.Header;
        }
        finally
        {
            documentLock.Release();
        }
    }

    private SemaphoreSlim GetDocumentLock(int n, bool ensureExistence = true)
    {
        if (ensureExistence && !_documentHeaders.ContainsKey(n))
            throw new NotFoundException("Document not found");
        return _documentsLocks.GetOrAdd(n, _ => new SemaphoreSlim(1, 1));
    }

    public async Task UploadPendingAndPurgeCache()
    {
        if (!_initialized.Task.IsCompletedSuccessfully) return;

        var horizon = DateTime.UtcNow - UnloadingAge;
        foreach (var (id, documentsLock) in _documentsLocks)
        {
            await documentsLock.WaitAsync();
            try
            {
                if (!_documents.TryGetValue(id, out var document))
                    continue;
                if (document.HasPendingChanges)
                {
                    _logger?.LogInformation("Flushing document {n}", id);
                    await FlushFile(document.CorpusDocument);
                    document.HasPendingChanges = false;
                }
                if (document.LastAccessedOn < horizon)
                    _documents.TryRemove(id, out _);
            }
            catch (Exception ex)
            {
                // A failed flush must not block the other documents; the changes stay pending for the next cycle
                _logger?.LogError(ex, "Error flushing document {n}", id);
            }
            finally
            {
                documentsLock.Release();
            }
        }
    }

    private class Document
    {
        public required CorpusDocument CorpusDocument { get; init; }
        public required DateTime LastAccessedOn { get; set; }
        public bool HasPendingChanges { get; set; }
    }

    private class DocumentLockWrapper(SemaphoreSlim semaphore, Document? document) : IDisposable
    {
        private SemaphoreSlim? _semaphore = semaphore;
        private Document? _document = document;

        public void Dispose()
        {
            _document?.HasPendingChanges = true;
            _document = null;
            _semaphore?.Release();
            _semaphore = null;
        }
    }
}
