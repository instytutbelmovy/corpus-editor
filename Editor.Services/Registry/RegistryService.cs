using Editor.Domain.Corpus;
using Editor.Services.Converters;
using Editor.Services.Corpus;
using Editor.Services.Exceptions;
using Editor.Services.Grammar;
using Editor.Services.Linguistics;

namespace Editor.Services.Registry;

public interface IRegistryService
{
    ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles();
    Task<IEnumerable<string>> GetAllTypes();
    Task<IEnumerable<string>> GetAllStyles();
    Task<IEnumerable<string>> GetAllCorpora();

    /// <summary> Сынхронныя праверкі перад даданьнем у чаргу, каб відавочныя памылкі вярталіся адразу 400-м, а не праз хвіліны фонавай працы. </summary>
    Task PreflightUpload(int n, string fileExtension);

    Task UploadFile(DocumentUploadRequest request, Action<UploadProgress>? progress = null, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string FileName)> DownloadFile(int n);
    Task<ICollection<CorpusDocumentHeader>> ReloadFilesList();
    Task<CorpusDocumentHeader> ReloadFile(int n);
}

public class RegistryService(
    IGrammarDb grammarDb,
    IAwsFilesCache awsFilesCache,
    IStanzaTagger stanzaTagger) : IRegistryService
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

    public async Task PreflightUpload(int n, string fileExtension)
    {
        if (n < 0)
            throw new BadRequestException("Нумар дакумэнту мусіць быць дадатны");

        // Кідае BadRequestException, калі пашырэньне не падтрымліваецца
        _ = CreateReader(fileExtension);

        var headers = await awsFilesCache.GetAllDocumentHeaders();
        if (headers.Any(x => x.N == n))
            throw new BusinessException($"Дакумэнт з нумарам {n} ужо існуе");
    }

    public async Task UploadFile(
        DocumentUploadRequest request,
        Action<UploadProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var reader = CreateReader(request.FileExtension);

        progress?.Invoke(new UploadProgress(UploadJobStage.Parsing, 0, 0));

        request.Content.Position = 0;
        var paragraphs = DocumentConverter.GetParagraphs(request.Content, reader);

        var wordSlots = StanzaTagger.CollectWordSlots(paragraphs);
        var totalWords = wordSlots.Count;

        // Адзін пакетны пошук на ўвесь дакумэнт замест запыту на кожнае слова
        progress?.Invoke(new UploadProgress(UploadJobStage.LookingUpGrammar, 0, totalWords));
        var allWords = new List<string>(totalWords);
        foreach (var slot in wordSlots)
            allWords.Add(slot.Items[slot.Index].Text);

        var lookups = await grammarDb.LookupWords(allWords, cancellationToken);

        var hints = await TagWithStanza(paragraphs, totalWords, progress, cancellationToken);

        progress?.Invoke(new UploadProgress(UploadJobStage.Saving, totalWords, totalWords));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (var i = 0; i < wordSlots.Count; i++)
        {
            var (items, index) = wordSlots[i];
            var item = items[index];

            var candidates = lookups.TryGetValue(item.Text, out var c) ? c : [];
            var resolution = GrammarResolver.Resolve(candidates, hints?[i], today);

            // Мяняем на месцы: сьпісы толькі што створаныя DocumentConverter-ам і больш нікому не належаць, а перабудова ўсяго дрэва падвойвала б пікавую памяць
            items[index] = item with
            {
                ParadigmFormId = resolution.ParadigmFormId,
                Lemma = resolution.Lemma,
                LinguisticTag = resolution.LinguisticTag,
                Metadata = resolution.Metadata,
            };
        }

        var percentCompletion = CorpusDocument.ComputeCompletion(paragraphs);
        var posCompletion = CorpusDocument.ComputePosCompletion(paragraphs);
        var header = new CorpusDocumentHeader(request.N, request.Title, null, null, request.PublicationDate, request.Url, request.Type, request.Style, request.Corpus)
        {
            PercentCompletion = percentCompletion,
            PosCompletion = posCompletion,
        };
        var corpusDocument = new CorpusDocument(header, paragraphs);

        await awsFilesCache.AddFile(corpusDocument);
    }

    private async Task<StanzaToken?[]?> TagWithStanza(
        List<Paragraph> paragraphs,
        int totalWords,
        Action<UploadProgress>? progress,
        CancellationToken cancellationToken)
    {
        var input = stanzaTagger.Prepare(paragraphs, totalWords);
        if (input is null)
            return null;

        return await stanzaTagger.Run(
            input,
            tagged => progress?.Invoke(new UploadProgress(UploadJobStage.Tagging, tagged, totalWords)),
            cancellationToken);
    }

    private static IDocumentReader CreateReader(string fileExtension) => fileExtension.ToLowerInvariant() switch
    {
        ".txt" => new TxtReader(),
        ".docx" => new DocxReader(),
        ".epub" => new EpubReader(),
        ".odt" => new OdtReader(),
        _ => throw new BadRequestException($"Unsupported file type: {fileExtension}"),
    };

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
