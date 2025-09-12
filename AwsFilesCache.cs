using System.Collections.Concurrent;
using Amazon;
using Amazon.S3;
using Amazon.S3.Model;

namespace Editor;

public class AwsSettings
{
    public string AccessKeyId { get; set; } = null!;
    public string SecretAccessKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string BucketName { get; set; } = null!;
}

public static class AwsFilesCache
{
    private static AwsSettings _awsSettings = null!;
    private static IAmazonS3 _s3Client = null!;
    private static ConcurrentDictionary<int, CorpusDocumentHeader> _documentHeaders = null!;
    private static readonly ConcurrentDictionary<int, Document> Documents = new();
    private static readonly TaskCompletionSource Initialized = new();
    private static ILogger? _logger;

    public static void InitializeLogging(ILogger logger) => _logger = logger;

    public static void Initialize(AwsSettings awsSettings)
    {
        if (_awsSettings != null)
            throw new InvalidOperationException("AwsFilesCache is already initialized");

        _awsSettings = awsSettings;
        _s3Client = new AmazonS3Client(awsSettings.AccessKeyId, awsSettings.SecretAccessKey, RegionEndpoint.GetBySystemName(awsSettings.Region));

        _logger?.LogInformation("Initializing AWS Files Cache with bucket: {BucketName}", awsSettings.BucketName);
        Task.Factory.StartNew(async () =>
        {
            var documentHeaders = await GetDocumentHeadersFromS3();
            var result = new List<CorpusDocumentHeader>();
            foreach (var header in documentHeaders)
            {
                if (header.PercentCompletion != null)
                {
                    result.Add(header);
                    continue;
                }

                var document = await GetFileInternal(header.N);
                var updatedHeader = header with { PercentCompletion = document.CorpusDocument.ComputeCompletion() };

                var objectKey = $"{document.CorpusDocument.Header.N}.verti";
                await UpdateDocumentHeaderInS3(objectKey, updatedHeader);
                result.Add(updatedHeader);
            }

            _documentHeaders = new ConcurrentDictionary<int, CorpusDocumentHeader>(result.ToDictionary(x => x.N));
            Initialized.SetResult();
            _logger?.LogInformation("Initialized AWS Files Cache");
        });
    }

    public static async Task<CorpusDocument> GetFile(int n)
    {
        await Initialized.Task;

        return (await GetFileInternal(n)).CorpusDocument;
    }

    public static async Task<Stream> GetRawFile(int n)
    {
        await Initialized.Task;

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

    public static async Task FlushFile(int n)
    {
        await Initialized.Task;

        if (!Documents.TryGetValue(n, out var document))
            throw new InvalidOperationException($"File {n} is not present in the cache");

        document.LastAccessedOn = DateTime.UtcNow;
        await document.WriteLock.WaitAsync();
        try
        {
            var objectKey = $"{document.CorpusDocument.Header.N}.verti";
            await WriteDocumentToS3(objectKey, document.CorpusDocument);
        }
        finally
        {
            document.WriteLock.Release();
        }

        _documentHeaders[n].PercentCompletion = document.CorpusDocument.ComputeCompletion();
    }

    public static async ValueTask<ICollection<CorpusDocumentHeader>> GetAllDocumentHeaders()
    {
        await Initialized.Task;
        return _documentHeaders.Values;
    }

    public static async ValueTask<CorpusDocumentHeader> GetDocumentHeader(int n)
    {
        await Initialized.Task;

        return _documentHeaders.TryGetValue(n, out var header)
            ? header
            : throw new NotFoundException();
    }

    public static void UpdateHeaderCache(int id)
    {
        _documentHeaders[id] = Documents[id].CorpusDocument.Header;
    }

    public static async Task AddFile(CorpusDocument corpusDocument)
    {
        await Initialized.Task;
        if (_documentHeaders.ContainsKey(corpusDocument.Header.N))
            throw new InvalidOperationException($"File with ID {corpusDocument.Header.N} already exists in the cache");

        var objectKey = $"{corpusDocument.Header.N}.verti";
        await WriteDocumentToS3(objectKey, corpusDocument);

        var document = new Document
        {
            CorpusDocument = corpusDocument,
            LastAccessedOn = DateTime.UtcNow,
            WriteLock = new SemaphoreSlim(1, 1),
        };
        Documents[corpusDocument.Header.N] = document;
        _documentHeaders[corpusDocument.Header.N] = corpusDocument.Header;
    }

    private static async Task<Document> GetFileInternal(int n)
    {
        if (Documents.TryGetValue(n, out var document))
        {
            document.LastAccessedOn = DateTime.UtcNow;
            return document;
        }

        var objectKey = $"{n}.verti";
        var corpusDocument = await ReadDocumentFromS3(objectKey);
        var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
        if (rewriteCorpusDocument != null)
        {
            await WriteDocumentToS3(objectKey, rewriteCorpusDocument);
            corpusDocument = rewriteCorpusDocument;
        }
        document = Documents.GetOrAdd(n, _ => new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow, WriteLock = new SemaphoreSlim(1, 1) });
        document.LastAccessedOn = DateTime.UtcNow;
        return document;
    }

    private static async Task<List<CorpusDocumentHeader>> GetDocumentHeadersFromS3()
    {
        var documents = new List<CorpusDocumentHeader>();

        try
        {
            var listRequest = new ListObjectsV2Request
            {
                BucketName = _awsSettings.BucketName,
                Prefix = "",
                MaxKeys = 1000,
            };

            var listResponse = await _s3Client.ListObjectsV2Async(listRequest);

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
                        if (VertiIO.TryReadHeader(line, out var doc))
                        {
                            documents.Add(doc);
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
        }
        catch (Exception ex)
        {
            _logger?.LogCritical(ex, "Error listing objects from S3");
        }

        return documents;
    }

    private static async Task<CorpusDocument> ReadDocumentFromS3(string objectKey)
    {
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _awsSettings.BucketName,
                Key = objectKey,
            };

            using var response = await _s3Client.GetObjectAsync(getRequest);
            using var stream = response.ResponseStream;

            // Create a temporary file to use with existing VertiIO.ReadDocument
            var tempFilePath = Path.GetTempFileName();
            await using (var fileStream = File.Create(tempFilePath))
            {
                await stream.CopyToAsync(fileStream);
            }

            try
            {
                return await VertiIO.ReadDocument(tempFilePath);
            }
            finally
            {
                // Clean up temporary file
                if (File.Exists(tempFilePath))
                    File.Delete(tempFilePath);
            }
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

    private static async Task WriteDocumentToS3(string objectKey, CorpusDocument document)
    {
        try
        {
            // Create a temporary file to use with existing VertiIO.WriteDocument
            var tempFilePath = Path.GetTempFileName();
            await VertiIO.WriteDocument(tempFilePath, document);

            try
            {
                using var fileStream = File.OpenRead(tempFilePath);
                var putRequest = new PutObjectRequest
                {
                    BucketName = _awsSettings.BucketName,
                    Key = objectKey,
                    InputStream = fileStream,
                    ContentType = "text/plain",
                };

                await _s3Client.PutObjectAsync(putRequest);
            }
            finally
            {
                // Clean up temporary file
                if (File.Exists(tempFilePath))
                    File.Delete(tempFilePath);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error writing document to S3: {ex.Message}", ex);
        }
    }

    private static async Task UpdateDocumentHeaderInS3(string objectKey, CorpusDocumentHeader header)
    {
        try
        {
            var document = await ReadDocumentFromS3(objectKey);

            document.Header = header;

            await WriteDocumentToS3(objectKey, document);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error updating document header in S3: {ex.Message}", ex);
        }
    }

    private class Document
    {
        public required CorpusDocument CorpusDocument { get; init; }
        public required DateTime LastAccessedOn { get; set; }
        public required SemaphoreSlim WriteLock { get; init; }
    }
}