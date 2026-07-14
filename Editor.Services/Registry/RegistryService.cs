using Editor.Converters;

namespace Editor;

public interface IRegistryService
{
    ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles();
    Task<IEnumerable<string>> GetAllTypes();
    Task<IEnumerable<string>> GetAllStyles();
    Task<IEnumerable<string>> GetAllCorpora();
    Task UploadFile(DocumentUploadRequest request);
    Task<(Stream Stream, string FileName)> DownloadFile(int n);
    Task<ICollection<CorpusDocumentHeader>> ReloadFilesList();
    Task<CorpusDocumentHeader> ReloadFile(int n);
}

public class RegistryService(IGrammarDb grammarDb, IAwsFilesCache awsFilesCache) : IRegistryService
{
    public ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles()
    {
        return awsFilesCache.GetAllDocumentHeaders();
    }

    public async Task<IEnumerable<string>> GetAllTypes()
    {
        var headers = await awsFilesCache.GetAllDocumentHeaders();
        return headers.Where(x => !string.IsNullOrWhiteSpace(x.Type)).Select(x => x.Type!).Distinct();
    }

    public async Task<IEnumerable<string>> GetAllStyles()
    {
        var headers = await awsFilesCache.GetAllDocumentHeaders();
        return headers.Where(x => !string.IsNullOrWhiteSpace(x.Style)).Select(x => x.Style!).Distinct();
    }

    public async Task<IEnumerable<string>> GetAllCorpora()
    {
        var headers = await awsFilesCache.GetAllDocumentHeaders();
        return headers.Where(x => !string.IsNullOrWhiteSpace(x.Corpus)).Select(x => x.Corpus!).Distinct();
    }

    public async Task UploadFile(DocumentUploadRequest request)
    {
        var reader = request.FileExtension switch
        {
            ".txt" => (IDocumentReader)new TxtReader(),
            ".docx" => new DocxReader(),
            ".epub" => new EpubReader(),
            ".odt" => new OdtReader(),
            _ => throw new NotSupportedException($"Unsupported file type: {request.FileExtension}")
        };
        var paragraphs = DocumentConverter.GetParagraphs(request.Content, reader);

        // Адзін пакетны пошук на ўвесь дакумэнт замест запыту на кожнае слова
        var allWords = paragraphs
            .SelectMany(p => p.Sentences)
            .SelectMany(s => s.SentenceItems)
            .Where(x => x.Type == SentenceItemType.Word)
            .Select(x => x.Text)
            .ToList();
        var lookups = await grammarDb.LookupWords(allWords);

        paragraphs = paragraphs.Select(p => p with
        {
            Sentences = p.Sentences.Select(s => s with
            {
                SentenceItems = s.SentenceItems.Select(x => FillObviousGrammar(x, lookups)).ToList(),
            }).ToList(),
        }).ToList();

        var percentCompletion = CorpusDocument.ComputeCompletion(paragraphs);
        var header = new CorpusDocumentHeader(request.N, request.Title, null, null, request.PublicationDate, request.Url, request.Type, request.Style, request.Corpus)
        {
            PercentCompletion = percentCompletion,
        };
        var corpusDocument = new CorpusDocument(header, paragraphs.ToList());

        await awsFilesCache.AddFile(corpusDocument);

        LinguisticItem FillObviousGrammar(LinguisticItem item, IReadOnlyDictionary<string, List<GrammarInfo>> wordLookups)
        {
            if (item.Type != SentenceItemType.Word)
                return item;

            var candidates = wordLookups.TryGetValue(item.Text, out var c) ? c : [];
            var (paradigmFormId, lemma, linguisticTag) = grammarDb.InferGrammarInfo(candidates);
            return item with
            {
                ParadigmFormId = paradigmFormId,
                Lemma = lemma,
                LinguisticTag = linguisticTag,
                Metadata = paradigmFormId != null && paradigmFormId.IsSingular()
                    ? new LinguisticItemMetadata(null, DateOnly.FromDateTime(DateTime.UtcNow))
                    : null,
            };
        }
    }

    public async Task<(Stream Stream, string FileName)> DownloadFile(int n)
    {
        if (n < 0)
            throw new BadRequestException();

        try
        {
            var stream = await awsFilesCache.GetRawFile(n);
            return (stream, $"{n}.verti");
        }
        catch (FileNotFoundException)
        {
            throw new NotFoundException();
        }
    }

    public async Task<ICollection<CorpusDocumentHeader>> ReloadFilesList()
    {
        await awsFilesCache.ReloadFilesList();
        return await awsFilesCache.GetAllDocumentHeaders();
    }

    public async Task<CorpusDocumentHeader> ReloadFile(int n)
    {
        if (n < 0)
            throw new BadRequestException();

        return await awsFilesCache.ReloadFile(n);
    }
}
