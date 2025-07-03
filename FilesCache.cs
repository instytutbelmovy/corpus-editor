using System.Collections.Concurrent;
using System.Collections.Frozen;

namespace Editor;

public class CorpusDocumentBasicInfo(int id, string? title, int percentCompletion)
{
    public int Id { get; } = id;
    public string? Title { get; } = title;
    public int PercentCompletion { get; set; } = percentCompletion;
}

public static class FilesCache
{
    private static Settings _settings = null!;
    private static IDictionary<int, CorpusDocumentBasicInfo> DocumentHeaders;
    private static readonly ConcurrentDictionary<int, Document> Documents = new();
    private static readonly ReaderWriterLockSlim DirectoryLock = new();

    public static void Initialize(Settings settings)
    {
        if (_settings != null)
            throw new InvalidOperationException("FilesCache is already initialized");

        _settings = settings;
        var documentHeaders = VertiIO.GetDocumentHeaders(_settings.FilesDirectory).Result;
        var result = new List<CorpusDocumentBasicInfo>();
        foreach (var header in documentHeaders)
        {
            if (header.PercentCompletion != null)
            {
                result.Add(new CorpusDocumentBasicInfo(header.N, header.Title, header.PercentCompletion.Value));
                continue;
            }

            var document = GetFileInternal(header.N).Result;
            var updatedHeader = header with { PercentCompletion = document.CorpusDocument.ComputeCompletion() };

            var filePath = Path.Combine(_settings.FilesDirectory, document.CorpusDocument.Header.N + ".verti");
            VertiIO.UpdateDocumentHeader(filePath, updatedHeader).Wait();
            result.Add(new CorpusDocumentBasicInfo(updatedHeader.N, updatedHeader.Title, updatedHeader.PercentCompletion.Value));
        }

        DocumentHeaders = result.ToFrozenDictionary(x => x.Id);
    }

    public static async Task<CorpusDocument> GetFile(int id)
    {
        return (await GetFileInternal(id)).CorpusDocument;
    }

    public static async Task FlushFile(int id)
    {
        if (!Documents.TryGetValue(id, out var document))
            throw new InvalidOperationException($"File {id} is not present in the cache");

        document.LastAccessedOn = DateTime.UtcNow;
        await document.WriteLock.WaitAsync();
        try
        {
            var tempFilePath = Path.GetTempFileName();
            await VertiIO.WriteDocument(tempFilePath, document.CorpusDocument);
            var filePath = Path.Combine(_settings.FilesDirectory, document.CorpusDocument.Header.N + ".verti");
            File.Move(tempFilePath, filePath, overwrite: true);
        }
        finally
        {
            document.WriteLock.Release();
        }

        DocumentHeaders[id].PercentCompletion = document.CorpusDocument.ComputeCompletion();
    }

    public static ICollection<CorpusDocumentBasicInfo> GetAllDocumentHeaders()
    {
        return DocumentHeaders.Values;
    }

    private static async Task<Document> GetFileInternal(int id)
    {
        if (Documents.TryGetValue(id, out var document))
        {
            document.LastAccessedOn = DateTime.UtcNow;
            return document;
        }

        var filePath = Path.Combine(_settings.FilesDirectory, id + ".verti");
        var corpusDocument = await VertiIO.ReadDocument(filePath);
        var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
        if (rewriteCorpusDocument != null)
        {
            await VertiIO.WriteDocument(_settings.FilesDirectory, rewriteCorpusDocument);
            corpusDocument = rewriteCorpusDocument;
        }
        document = Documents.GetOrAdd(id, _ => new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow, WriteLock = new SemaphoreSlim(1, 1) });
        document.LastAccessedOn = DateTime.UtcNow;
        return document;
    }

    private class Document
    {
        public required CorpusDocument CorpusDocument { get; init; }
        public required DateTime LastAccessedOn { get; set; }
        public required SemaphoreSlim WriteLock { get; init; }
    }
}