using System.Text;
using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Corpus;
using Editor.Services.Exceptions;
using Editor.Services.Grammar;
using Editor.Services.Linguistics;
using Editor.Services.Registry;
using Editor.Tests.Linguistics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Editor.Tests.Registry;

public class RegistryServiceTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    // "кот" адназначны; "ката" - назоўнік або дзеяслоў, і без падказкі не вырашаецца
    private static readonly FormMatch KotNoun = new(1, "a", "NMSNN", "кот", "NMS", null);
    private static readonly FormMatch KataNoun = new(1, "a", "NMSGN", "кот", "NMS", null);
    private static readonly FormMatch KataVerb = new(2, "a", "VTPN1", "катаць", "VTPN", null);

    private static readonly Dictionary<string, IReadOnlyList<FormMatch>> Grammar = new()
    {
        ["кот"] = [KotNoun],
        ["ката"] = [KataNoun, KataVerb],
    };

    private const string Text = "Кот ката.";

    private static DocumentUploadRequest Request(int n = 1, string text = Text, string extension = ".txt")
        => new(n, extension, new MemoryStream(Encoding.UTF8.GetBytes(text)), $"Дакумэнт {n}", null, null, null, null, null);

    // --- перадправеркі ---

    [Fact]
    public async Task PreflightUpload_RejectsDuplicateNumber()
    {
        var (service, storage) = await CreateService();
        await service.UploadFile(Request(1));

        var error = await Assert.ThrowsAsync<BusinessException>(() => service.PreflightUpload(1, ".txt"));
        Assert.Contains("1", error.Message);
        Assert.Contains("1.verti", storage.WrittenKeys);
    }

    [Fact]
    public async Task PreflightUpload_RejectsUnsupportedExtension()
    {
        var (service, _) = await CreateService();

        // BadRequestException мапіцца ў 400; NotSupportedException давала б 500
        await Assert.ThrowsAsync<BadRequestException>(() => service.PreflightUpload(1, ".pdf"));
    }

    [Fact]
    public async Task PreflightUpload_AcceptsFreeNumber()
    {
        var (service, _) = await CreateService();

        await service.PreflightUpload(42, ".TXT");
    }

    // --- разьметка без Stanza ---

    [Fact]
    public async Task UploadFile_WithoutStanza_ResolvesOnlyUnambiguousWords()
    {
        var (service, _) = await CreateService(stanza: DisabledStanza());

        await service.UploadFile(Request());

        var words = await LoadWords(service);

        var kot = words[0];
        Assert.Equal(new ParadigmFormId(1, "a", "NMSNN"), kot.ParadigmFormId);
        Assert.Equal(ResolutionSource.GrammarDb, kot.Metadata?.ResolvedBy);
        Assert.NotNull(kot.Metadata?.ResolvedOn);

        var kata = words[1];
        Assert.Null(kata.ParadigmFormId);
        // Без падказкі не пішам і прапановы - вынік такі самы, як да зьяўленьня Stanza
        Assert.Null(kata.Metadata);
    }

    [Fact]
    public async Task UploadFile_WithoutStanza_NeverCallsTheService()
    {
        var stanza = DisabledStanza();
        var (service, _) = await CreateService(stanza: stanza);

        await service.UploadFile(Request());

        Assert.Equal(0, stanza.CallCount);
    }

    // --- разьметка з падказкамі ---

    [Fact]
    public async Task UploadFile_WhenStanzaNarrowsToOneCandidate_ResolvesAndRecordsStanza()
    {
        var stanza = StanzaTagging(("PRON", "кот"), ("NOUN", "кот"), ("PUNCT", "."));
        var (service, _) = await CreateService(stanza: stanza);

        await service.UploadFile(Request());

        var kata = (await LoadWords(service))[1];
        Assert.Equal(new ParadigmFormId(1, "a", "NMSGN"), kata.ParadigmFormId);
        Assert.Equal(ResolutionSource.Stanza, kata.Metadata?.ResolvedBy);
        Assert.NotNull(kata.Metadata?.ResolvedOn);
    }

    [Fact]
    public async Task UploadFile_SendsWordsAndPunctuationAsOneSentence()
    {
        var stanza = StanzaTagging(("PRON", "кот"), ("NOUN", "кот"), ("PUNCT", "."));
        var (service, _) = await CreateService(stanza: stanza);

        await service.UploadFile(Request());

        // Знакі прыпынку ідуць у Stanza як кантэкст, пераносы радка - не
        var sentence = Assert.Single(stanza.LastRequest!);
        Assert.Equal(["Кот", "ката", "."], sentence);
    }

    // --- дэградацыя ---

    [Fact]
    public async Task UploadFile_WhenStanzaReturnsWrongTokenCount_FallsBackToGrammarDbOnly()
    {
        // Гэтак жа сябе паводзіць сапраўдны StanzaService: пры разыходнасьці ён вяртае null
        var (service, _) = await CreateService(stanza: new FakeStanzaService(_ => null));

        await service.UploadFile(Request());

        var words = await LoadWords(service);
        Assert.Equal(ResolutionSource.GrammarDb, words[0].Metadata?.ResolvedBy);
        Assert.Null(words[1].ParadigmFormId);
    }

    [Fact]
    public async Task UploadFile_WhenStanzaDisagreesWithGrammarDb_KeepsGrammarDbCandidates()
    {
        // ADP не пасуе ніводнаму кандыдату "ката" - падказка ігнаруецца
        var stanza = StanzaTagging(("ADP", "у"), ("ADP", "у"), ("PUNCT", "."));
        var (service, _) = await CreateService(stanza: stanza);

        await service.UploadFile(Request());

        var kata = (await LoadWords(service))[1];
        Assert.Null(kata.ParadigmFormId);
        Assert.Null(kata.Metadata?.ResolvedOn);
    }

    // --- структура і поступ ---

    [Fact]
    public async Task UploadFile_NumbersSentencesWithinEachParagraph()
    {
        var (service, _) = await CreateService(stanza: DisabledStanza());

        await service.UploadFile(Request(text: "Кот ката. Кот ката.\nКот ката. Кот ката."));

        var document = await LoadDocument(service);
        Assert.Equal(2, document.Paragraphs.Count);
        foreach (var paragraph in document.Paragraphs)
            Assert.Equal([1, 2], paragraph.Sentences.Select(s => s.Id));
    }

    [Fact]
    public async Task UploadFile_ReportsProgressThroughEveryStage()
    {
        var (service, _) = await CreateService(stanza: StanzaTagging(("PRON", "кот"), ("NOUN", "кот"), ("PUNCT", ".")));
        var stages = new List<UploadJobStage>();

        await service.UploadFile(Request(), p => stages.Add(p.Stage));

        Assert.Equal(UploadJobStage.Parsing, stages[0]);
        Assert.Contains(UploadJobStage.LookingUpGrammar, stages);
        Assert.Contains(UploadJobStage.Tagging, stages);
        Assert.Equal(UploadJobStage.Saving, stages[^1]);
    }

    [Fact]
    public async Task UploadFile_ComputesCompletionFromResolvedWords()
    {
        var (service, _) = await CreateService(stanza: DisabledStanza());

        await service.UploadFile(Request());

        var headers = await service.GetAllFiles();
        // З двух словаў вырашанае адно
        Assert.Equal(50, headers.Single().PercentCompletion);
    }

    // --- дапаможнае ---

    private static async Task<List<LinguisticItem>> LoadWords(IRegistryService service)
    {
        var document = await LoadDocument(service);
        return document.Paragraphs
            .SelectMany(p => p.Sentences)
            .SelectMany(s => s.SentenceItems)
            .Where(i => i.Type == SentenceItemType.Word)
            .ToList();
    }

    /// <summary> Чытае дакумэнт назад праз .verti - заадно правярае, што разьметка перажывае запіс. </summary>
    private static async Task<CorpusDocument> LoadDocument(IRegistryService service)
    {
        var (stream, _) = await service.DownloadFile(1);
        await using (stream)
        {
            using var reader = new StreamReader(stream);
            return await VertiIO.ReadDocument(reader);
        }
    }

    private static async Task<(RegistryService Service, InMemoryCorpusStorage Storage)> CreateService(
        IStanzaService? stanza = null)
    {
        var storage = new InMemoryCorpusStorage();
        var cache = new AwsFilesCache(storage, null);
        cache.Initialize();
        await cache.GetAllDocumentHeaders().AsTask().WaitAsync(Timeout);

        var tagger = new StanzaTagger(
            stanza ?? DisabledStanza(),
            new StanzaSettings(),
            NullLogger<StanzaTagger>.Instance);

        var service = new RegistryService(
            new GrammarDb(new FakeGrammarRepository(Grammar)),
            cache,
            tagger);

        return (service, storage);
    }

    private static FakeStanzaService DisabledStanza() => new(_ => null, enabled: false);

    private static FakeStanzaService StanzaTagging(params (string Upos, string Lemma)[] tokens) =>
        new(sentences => sentences
            .Select(s => (IReadOnlyList<StanzaToken>)s
                .Select((_, i) => new StanzaToken(tokens[i].Upos, tokens[i].Lemma))
                .ToList())
            .ToList());

    private sealed class FakeStanzaService(
        Func<IReadOnlyList<IReadOnlyList<string>>, IReadOnlyList<IReadOnlyList<StanzaToken>>?> responder,
        bool enabled = true) : IStanzaService
    {
        public int CallCount { get; private set; }
        public IReadOnlyList<IReadOnlyList<string>>? LastRequest { get; private set; }

        public bool IsEnabled => enabled;

        public Task<IReadOnlyList<IReadOnlyList<StanzaToken>>?> Tag(
            IReadOnlyList<IReadOnlyList<string>> sentences, CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastRequest = sentences;
            return Task.FromResult(responder(sentences));
        }
    }

    private sealed class FakeGrammarRepository(Dictionary<string, IReadOnlyList<FormMatch>> data) : IGrammarRepository
    {
        public Task<IReadOnlyList<FormMatch>> LookupByNormalizedForm(string normalizedForm, CancellationToken cancellationToken = default)
            => Task.FromResult(data.TryGetValue(normalizedForm, out var m) ? m : []);

        public Task<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>> LookupByNormalizedForms(
            IReadOnlyCollection<string> normalizedForms, CancellationToken cancellationToken = default)
        {
            var result = new Dictionary<string, IReadOnlyList<FormMatch>>();
            foreach (var form in normalizedForms.Distinct())
                if (data.TryGetValue(form, out var m))
                    result[form] = m;

            return Task.FromResult<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>>(result);
        }

        public Task<(string Lemma, string EffectiveTag)?> GetVariant(int paradigmId, string? variantId, CancellationToken cancellationToken = default)
            => Task.FromResult<(string Lemma, string EffectiveTag)?>(null);

        public Task<bool> HasData(CancellationToken cancellationToken = default) => Task.FromResult(true);
    }
}
