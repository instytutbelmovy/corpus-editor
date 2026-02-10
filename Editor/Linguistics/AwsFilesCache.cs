using System.Collections.Concurrent;
using Amazon;
using Amazon.S3;
using System.IO.Pipelines;
using Amazon.S3.Model;
using Amazon.S3.Transfer;

namespace Editor;

public class AwsSettings
{
    public string AccessKeyId { get; set; } = null!;
    public string SecretAccessKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string BucketName { get; set; } = null!;
}

public class AwsFilesCache(AwsSettings awsSettings, ILogger<AwsFilesCache>? logger)
{
    private static readonly TimeSpan UnloadingAge = TimeSpan.FromMinutes(10);
    private readonly AwsSettings _awsSettings = awsSettings;
    private IAmazonS3 _s3Client = null!;
    private ConcurrentDictionary<int, CorpusDocumentHeader> _documentHeaders = null!;
    private ConcurrentDictionary<int, SemaphoreSlim> _documentsLocks = new();
    private ConcurrentDictionary<int, Document> _documents = new();
    private TaskCompletionSource _initialized = new();
    private readonly ILogger? _logger = logger;

    public void Initialize()
    {
        if (_s3Client != null)
            throw new InvalidOperationException($"{nameof(AwsFilesCache)} is already initialized");

        _s3Client = new AmazonS3Client(_awsSettings.AccessKeyId, _awsSettings.SecretAccessKey, RegionEndpoint.GetBySystemName(_awsSettings.Region));

        _logger?.LogInformation("Initializing AWS Files Cache with bucket: {BucketName}", _awsSettings.BucketName);
        Task.Factory.StartNew(ReadAwsFilesList);
    }

    public async Task ReloadFilesList()
    {
        if (!_initialized.Task.IsCompleted)
            return;
        _initialized = new();
        
        _logger?.LogInformation("Re-initializing AWS Files Cache with bucket: {BucketName}", _awsSettings.BucketName);
        await ReadAwsFilesList();
        var removedDocuments = _documentsLocks.Keys.Except(_documentHeaders.Keys).ToList();
        foreach (var id in removedDocuments)
        {
            _documentsLocks.TryRemove(id, out _);
            _documents.TryRemove(id, out _);
        }
    }

    private async Task ReadAwsFilesList()
    {
        var documentHeaders = await GetDocumentHeadersFromS3();
        _documentHeaders = new ConcurrentDictionary<int, CorpusDocumentHeader>(documentHeaders.ToDictionary(x => x.N));
        _initialized.SetResult();
        _logger?.LogInformation("Initialized AWS Files Cache");
    }

    public async Task<CorpusDocument> GetFileForRead(int n)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            if (!_documents.TryGetValue(n, out var document))
            {
                var objectKey = $"{n}.verti";
                var corpusDocument = await ReadDocumentFromS3(objectKey);
                var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
                if (rewriteCorpusDocument != null)
                {
                    await WriteDocumentToS3(objectKey, rewriteCorpusDocument);
                    corpusDocument = rewriteCorpusDocument;
                }

                _documents[n] = document = new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow };
            }

            document.LastAccessedOn = DateTime.UtcNow;
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
        if (!_documents.TryGetValue(n, out var document))
        {
            var objectKey = $"{n}.verti";
            var corpusDocument = await ReadDocumentFromS3(objectKey);
            var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
            if (rewriteCorpusDocument != null)
            {
                await WriteDocumentToS3(objectKey, rewriteCorpusDocument);
                corpusDocument = rewriteCorpusDocument;
            }

            _documents[n] = document = new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow };
        }

        document.LastAccessedOn = DateTime.UtcNow;
        return (new DocumentLockWrapper(documentLock, markPendingChangesUponCompletion ? document : null), document.CorpusDocument);
    }

    public async Task<CorpusDocumentHeader> ReloadFile(int n)
    {
        await _initialized.Task;

        var documentLock = GetDocumentLock(n);
        await documentLock.WaitAsync();
        try
        {
            var objectKey = $"{n}.verti";
            var corpusDocument = await ReadDocumentFromS3(objectKey);
            var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
            if (rewriteCorpusDocument != null)
            {
                await WriteDocumentToS3(objectKey, rewriteCorpusDocument);
                corpusDocument = rewriteCorpusDocument;
            }

            if (_documents.ContainsKey(n))
                _documents[n] = new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow };
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

        var objectKey = $"{n}.verti";
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _awsSettings.BucketName,
                Key = objectKey,
            };

            var response = await _s3Client.GetObjectAsync(getRequest);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException($"File {objectKey} not found in S3");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error reading file from S3: {ex.Message}", ex);
        }
    }

    /// <summary> Only to be called within a write lock obtained from GetFileForWrite. </summary>
    public async Task FlushFile(int n)
    {
        if (!_documents.TryGetValue(n, out var document))
            throw new InvalidOperationException($"File {n} is not present in the cache");

        await FlushFile(document.CorpusDocument);
    }

    private async Task FlushFile(CorpusDocument document)
    {
        var id = document.Header.N;
        var objectKey = $"{id}.verti";
        await WriteDocumentToS3(objectKey, document);

        _documentHeaders[id].PercentCompletion = document.ComputeCompletion();
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
                throw new InvalidOperationException($"File with ID {corpusDocument.Header.N} already exists in the cache");

            var objectKey = $"{corpusDocument.Header.N}.verti";
            await WriteDocumentToS3(objectKey, corpusDocument);

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

    private async Task<List<CorpusDocumentHeader>> GetDocumentHeadersFromS3()
    {
        var headers = new List<CorpusDocumentHeader>();

        try
        {
            var listRequest = new ListObjectsV2Request
            {
                BucketName = _awsSettings.BucketName,
                Prefix = "",
                MaxKeys = 1000,
            };

            ListObjectsV2Response listResponse;
            do
            {
                listResponse = await _s3Client.ListObjectsV2Async(listRequest);

                foreach (var s3Object in listResponse.S3Objects.Where(obj => obj.Key.EndsWith(".verti")))
                {
                    try
                    {
                        var getRequest = new GetObjectRequest
                        {
                            BucketName = _awsSettings.BucketName,
                            Key = s3Object.Key,
                        };

                        using var response = await _s3Client.GetObjectAsync(getRequest);
                        using var reader = new StreamReader(response.ResponseStream);

                        string? line;
                        while ((line = await reader.ReadLineAsync()) != null)
                        {
                            if (line.StartsWith("<!--")) continue;

                            if (VertiIO.TryReadHeader(line, out var header))
                            {
                                if (header.PercentCompletion == null)
                                {
                                    // ffs, now need to get full document, compute completion, and update on s3
                                    var document = await VertiIO.ReadDocument(reader);
                                    header.PercentCompletion = document.ComputeCompletion();
                                    document = document with { Header = header, };
                                    var objectKey = $"{header.N}.verti";
                                    await WriteDocumentToS3(objectKey, document);
                                }
                                headers.Add(header);
                                break;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue with other files
                        _logger?.LogError(ex, $"Error reading file {s3Object.Key}");
                    }
                }

                listRequest.ContinuationToken = listResponse.NextContinuationToken;
            } while (listResponse.IsTruncated == true);

        }
        catch (Exception ex)
        {
            _logger?.LogCritical(ex, "Error listing objects from S3");
        }

        return headers;
    }

    private async Task<CorpusDocument> ReadDocumentFromS3(string objectKey)
    {
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _awsSettings.BucketName,
                Key = objectKey,
            };

            using var response = await _s3Client.GetObjectAsync(getRequest);
            await using var stream = response.ResponseStream;
            using var reader = new StreamReader(stream);

            return await VertiIO.ReadDocument(reader);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException($"File {objectKey} not found in S3");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error reading document from S3: {ex.Message}", ex);
        }
    }

    private async Task WriteDocumentToS3(string objectKey, CorpusDocument document)
    {
        try
        {
            var pipe = new Pipe();
            var uploadTask = Task.Run(async () =>
            {
                try
                {
                    await using var stream = pipe.Writer.AsStream(leaveOpen: true);
                    await VertiIO.WriteDocument(stream, document);
                    await pipe.Writer.CompleteAsync();
                }
                catch (Exception ex)
                {
                    await pipe.Writer.CompleteAsync(ex);
                }
            });

            var transferUtility = new TransferUtility(_s3Client);
            await transferUtility.UploadAsync(pipe.Reader.AsStream(), _awsSettings.BucketName, objectKey);

            await uploadTask;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error writing document to S3: {ex.Message}", ex);
        }
    }

    public async Task UploadPendingAndPurgeCache()
    {
        if (!_initialized.Task.IsCompleted) return;

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