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

public partial class RegistryService(
    IGrammarDb grammarDb,
    IAwsFilesCache awsFilesCache,
    IStanzaService stanzaService,
    StanzaSettings stanzaSettings,
    ILogger<RegistryService> logger) : IRegistryService
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

        var wordSlots = CollectWordSlots(paragraphs);
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
        var header = new CorpusDocumentHeader(request.N, request.Title, null, null, request.PublicationDate, request.Url, request.Type, request.Style, request.Corpus)
        {
            PercentCompletion = percentCompletion,
        };
        var corpusDocument = new CorpusDocument(header, paragraphs);

        await awsFilesCache.AddFile(corpusDocument);
    }

    private static IDocumentReader CreateReader(string fileExtension) => fileExtension.ToLowerInvariant() switch
    {
        ".txt" => new TxtReader(),
        ".docx" => new DocxReader(),
        ".epub" => new EpubReader(),
        ".odt" => new OdtReader(),
        _ => throw new BadRequestException($"Unsupported file type: {fileExtension}"),
    };

    /// <summary> Спасылкі на ўсе словы дакумэнту ў парадку абыходу. </summary>
    private static List<(List<LinguisticItem> Items, int Index)> CollectWordSlots(List<Paragraph> paragraphs)
    {
        var slots = new List<(List<LinguisticItem>, int)>();

        foreach (var paragraph in paragraphs)
            foreach (var sentence in paragraph.Sentences)
                for (var i = 0; i < sentence.SentenceItems.Count; i++)
                    if (sentence.SentenceItems[i].Type == SentenceItemType.Word)
                        slots.Add((sentence.SentenceItems, i));

        return slots;
    }

    /// <summary>
    /// Тэгае дакумэнт праз Stanza.
    /// Вяртае масіў падказак, выраўнаваны з CollectWordSlots, ці null - калі сэрвіс вымкнуты. Кавалак, які не ўдалося атрымаць, проста застаецца без падказак:
    /// такія словы разьмячаюцца толькі паводле ГрамБазы, а загрузка працягваецца.
    /// </summary>
    private async Task<StanzaToken?[]?> TagWithStanza(
        List<Paragraph> paragraphs,
        int totalWords,
        Action<UploadProgress>? progress,
        CancellationToken cancellationToken)
    {
        if (!stanzaService.IsEnabled)
            return null;

        progress?.Invoke(new UploadProgress(UploadJobStage.Tagging, 0, totalWords));

        // Разьбіваем на сказы: словы і знакі прыпынку разам (пунктуацыя - карысны кантэкст для тэгера), пераносы радка прапускаем. Slots вядуць ад пазыцыі токена да нумару слова.
        var sentences = new List<IReadOnlyList<string>>();
        var slots = new List<int[]>();
        var wordOrdinal = 0;

        foreach (var paragraph in paragraphs)
        {
            foreach (var sentence in paragraph.Sentences)
            {
                var tokens = new List<string>(sentence.SentenceItems.Count);
                var sentenceSlots = new List<int>(sentence.SentenceItems.Count);

                foreach (var item in sentence.SentenceItems)
                {
                    if (item.Type == SentenceItemType.LineBreak)
                        continue;

                    var isWord = item.Type == SentenceItemType.Word;
                    var cleaned = StanzaTextNormalizer.Clean(item.Text);

                    tokens.Add(cleaned ?? StanzaTextNormalizer.Placeholder);
                    // Ад слова, ад якога пасьля чысткі нічога не засталося, вынік не бяром
                    sentenceSlots.Add(isWord && cleaned is not null ? wordOrdinal : -1);

                    if (isWord)
                        wordOrdinal++;
                }

                if (tokens.Count == 0)
                    continue;

                sentences.Add(tokens);
                slots.Add(sentenceSlots.ToArray());
            }
        }

        if (sentences.Count == 0)
            return null;

        var hints = new StanzaToken?[totalWords];
        var taggedWords = 0;
        var failedChunks = 0;

        foreach (var (start, count) in Chunk(sentences))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var chunk = sentences.GetRange(start, count);
            var tagged = await stanzaService.Tag(chunk, cancellationToken);

            if (tagged is null)
            {
                failedChunks++;
            }
            else
            {
                for (var i = 0; i < count; i++)
                {
                    var sentenceSlots = slots[start + i];
                    var taggedSentence = tagged[i];

                    for (var j = 0; j < sentenceSlots.Length; j++)
                        if (sentenceSlots[j] >= 0)
                            hints[sentenceSlots[j]] = taggedSentence[j];
                }
            }

            for (var i = 0; i < count; i++)
                taggedWords += slots[start + i].Count(slot => slot >= 0);

            progress?.Invoke(new UploadProgress(UploadJobStage.Tagging, taggedWords, totalWords));
        }

        if (failedChunks > 0)
            LogStanzaChunksFailed(failedChunks);

        return hints;
    }

    /// <summary>
    /// Пакуе цэлыя сказы ў кавалкі. Сказ ніколі не разразаецца: адзін занадта доўгі сказ ідзе асобным кавалкам і перавышае мяжу - кантракт сэрвісу гэта дазваляе.
    /// </summary>
    private IEnumerable<(int Start, int Count)> Chunk(List<IReadOnlyList<string>> sentences)
    {
        var start = 0;
        var tokens = 0;

        for (var i = 0; i < sentences.Count; i++)
        {
            var wouldExceed = i > start
                              && (tokens + sentences[i].Count > stanzaSettings.MaxTokensPerRequest
                                  || i - start >= stanzaSettings.MaxSentencesPerRequest);

            if (wouldExceed)
            {
                yield return (start, i - start);
                start = i;
                tokens = 0;
            }

            tokens += sentences[i].Count;
        }

        if (start < sentences.Count)
            yield return (start, sentences.Count - start);
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

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stanza не апрацавала {FailedChunks} кавалкаў - тыя словы разьмечаныя без падказак")]
    private partial void LogStanzaChunksFailed(int failedChunks);
}
