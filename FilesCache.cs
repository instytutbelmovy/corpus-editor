using System.Collections.Concurrent;

namespace Editor;

public static class FilesCache
{
    private static Settings _settings = null!;
    private static readonly ConcurrentDictionary<int, Document> Documents = new();

    public static void Initialize(Settings settings)
    {
        _settings = settings;
    }

    public static async Task<CorpusDocument> GetFile(int id)
    {
        if (Documents.TryGetValue(id, out var document))
        {
            document.LastAccessedOn = DateTime.UtcNow;
            return document.CorpusDocument;
        }

        var corpusDocument = await VertiIO.ReadDocument(_settings.FilesDirectory, id);
        var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
        if (rewriteCorpusDocument != null)
        {
            await VertiIO.WriteDocument(_settings.FilesDirectory, rewriteCorpusDocument);
            corpusDocument = rewriteCorpusDocument;
        }
        document = Documents.GetOrAdd(id, _ => new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.UtcNow, WriteLock = new SemaphoreSlim(1, 1)});
        document.LastAccessedOn = DateTime.UtcNow;
        return document.CorpusDocument;
    }

    public static async Task FlushFile(int id)
    {
        if (!Documents.TryGetValue(id, out var document))
            throw new InvalidOperationException($"File {id} is not present in the cache");

        await document.WriteLock.WaitAsync();
        try
        {
            await VertiIO.WriteDocument(_settings.FilesDirectory, document.CorpusDocument);
        }
        finally
        {
            document.WriteLock.Release();
        }
    }

    private class Document
    {
        public required CorpusDocument CorpusDocument { get; init; }
        public required DateTime LastAccessedOn { get; set; }
        public required SemaphoreSlim WriteLock { get; init; }
    }
}