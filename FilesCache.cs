using System.Collections.Concurrent;

namespace Editor;

public class FilesCache
{
    private readonly Settings _settings;
    private readonly ConcurrentDictionary<int, Document> _documents = new();

    public FilesCache(Settings settings)
    {
        _settings = settings;
    }

    public async Task<CorpusDocument> GetFile(int id)
    {
        if (_documents.TryGetValue(id, out var document))
        {
            document.LastAccessedOn = DateTime.Now;
            return document.CorpusDocument;
        }

        var corpusDocument = await VertiIO.ReadDocument(_settings.FilesDirectory, id);
        var rewriteCorpusDocument = CorpusDocument.CheckIdsAndConcurrencyStamps(corpusDocument);
        if (rewriteCorpusDocument != null)
        {
            await VertiIO.WriteDocument(_settings.FilesDirectory, rewriteCorpusDocument);
            corpusDocument = rewriteCorpusDocument;
        }
        document = _documents.GetOrAdd(id, _ => new Document { CorpusDocument = corpusDocument, LastAccessedOn = DateTime.Now });
        document.LastAccessedOn = DateTime.Now;
        return document.CorpusDocument;
    }

    private class Document
    {
        public required CorpusDocument CorpusDocument { get; set; }
        public required DateTime LastAccessedOn { get; set; }
    }
}