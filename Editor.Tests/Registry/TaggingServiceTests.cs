using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Linguistics;
using Editor.Services.Registry;

namespace Editor.Tests.Registry;

/// <summary>
/// Перазьметка наяўнага дакумэнту. Правяраем чыстае ядро: што прыкладаецца, а што прапускаецца, калі дакумэнт пасьпелі зьмяніць, пакуль Stanza думала.
/// </summary>
public class TaggingServiceTests
{
    private static readonly DateOnly Today = new(2026, 9, 11);

    // "кот" адназначны; "ката" - назоўнік або дзеяслоў, і без падказкі не вырашаецца
    private static readonly GrammarInfo KotNoun = new(new ParadigmFormId(1, "a", "NMSNN"), new LinguisticTag("NMSNN"), "кот", null);
    private static readonly GrammarInfo KataNoun = new(new ParadigmFormId(1, "a", "NMSGN"), new LinguisticTag("NMSGN"), "кот", null);
    private static readonly GrammarInfo KataVerb = new(new ParadigmFormId(2, "a", "VTPN1"), new LinguisticTag("VTPN1"), "катаць", null);

    private static readonly Dictionary<string, List<GrammarInfo>> Lookups = new()
    {
        ["кот"] = [KotNoun],
        ["ката"] = [KataNoun, KataVerb],
    };

    // --- што разьмячаецца ---

    [Fact]
    public void ApplyHints_ResolvesUnambiguousWord()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        var applied = TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        Assert.Equal(1, applied);
        var word = FirstWord(document);
        Assert.Equal(new ParadigmFormId(1, "a", "NMSNN"), word.ParadigmFormId);
        Assert.Equal("кот", word.Lemma);
        Assert.Equal(Today, word.Metadata!.ResolvedOn);
        Assert.Equal(ResolutionSource.GrammarDb, word.Metadata.ResolvedBy);
    }

    [Fact]
    public void ApplyHints_NarrowsAmbiguousWordWithTheStanzaHint()
    {
        var document = Document(Word("ката"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);
        StanzaToken?[] hints = [new StanzaToken("NOUN", "кот")];

        var applied = TaggingService.ApplyHints(document, snapshots, hints, Lookups, Today);

        Assert.Equal(1, applied);
        var word = FirstWord(document);
        Assert.Equal(new ParadigmFormId(1, "a", "NMSGN"), word.ParadigmFormId);
        Assert.Equal(ResolutionSource.Stanza, word.Metadata!.ResolvedBy);
    }

    [Fact]
    public void ApplyHints_WithoutAHint_LeavesAnAmbiguousWordUnresolved()
    {
        var document = Document(Word("ката"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        Assert.Null(FirstWord(document).Metadata?.ResolvedOn);
    }

    [Fact]
    public void ApplyHints_SkipsPunctuationAndCountsOnlyWords()
    {
        var document = Document(Word("кот"), Item(".", SentenceItemType.Punctuation));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        Assert.Single(snapshots);
        Assert.Equal(1, TaggingService.ApplyHints(document, snapshots, null, Lookups, Today));
    }

    // --- што застаецца некранутым ---

    [Fact]
    public void ApplyHints_LeavesWordsResolvedBeforeTheRun()
    {
        var human = new LinguisticItemMetadata(null, new DateOnly(2026, 1, 1), ResolvedBy: ResolutionSource.Human);
        var document = Document(Word("кот") with
        {
            ParadigmFormId = new ParadigmFormId(9, "b", "NMSNN"),
            Lemma = "мой-выбар",
            Metadata = human,
        });
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        var applied = TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        Assert.Equal(0, applied);
        var word = FirstWord(document);
        Assert.Equal("мой-выбар", word.Lemma);
        Assert.Equal(ResolutionSource.Human, word.Metadata!.ResolvedBy);
    }

    [Fact]
    public void ApplyHints_LeavesWordsResolvedWhileStanzaWasThinking()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        // Рэдактар разьмеціў слова пасьля здымку. Пазнака сказу пры гэтым не мяняецца, таму патрэбная асобная праверка
        var sentence = document.Paragraphs[0].Sentences[0];
        sentence.SentenceItems[0] = sentence.SentenceItems[0] with
        {
            Lemma = "мой-выбар",
            Metadata = new LinguisticItemMetadata(null, Today, ResolvedBy: ResolutionSource.Human),
        };

        var applied = TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        Assert.Equal(0, applied);
        Assert.Equal("мой-выбар", FirstWord(document).Lemma);
    }

    [Fact]
    public void ApplyHints_SkipsParagraphsEditedSinceTheSnapshot()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        document.Paragraphs[0] = document.Paragraphs[0] with { ConcurrencyStamp = Guid.NewGuid() };

        Assert.Equal(0, TaggingService.ApplyHints(document, snapshots, null, Lookups, Today));
        Assert.Null(FirstWord(document).ParadigmFormId);
    }

    [Fact]
    public void ApplyHints_SkipsSentencesEditedSinceTheSnapshot()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        var paragraph = document.Paragraphs[0];
        paragraph.Sentences[0] = paragraph.Sentences[0] with { ConcurrencyStamp = Guid.NewGuid() };

        Assert.Equal(0, TaggingService.ApplyHints(document, snapshots, null, Lookups, Today));
        Assert.Null(FirstWord(document).ParadigmFormId);
    }

    [Fact]
    public void ApplyHints_SkipsWordsWhoseTextChanged()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        var sentence = document.Paragraphs[0].Sentences[0];
        sentence.SentenceItems[0] = sentence.SentenceItems[0] with { Text = "ката" };

        Assert.Equal(0, TaggingService.ApplyHints(document, snapshots, null, Lookups, Today));
        Assert.Null(FirstWord(document).ParadigmFormId);
    }

    [Fact]
    public void ApplyHints_SurvivesAParagraphDeletedSinceTheSnapshot()
    {
        var document = Document(Word("кот"));
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        document.Paragraphs.Clear();

        Assert.Equal(0, TaggingService.ApplyHints(document, snapshots, null, Lookups, Today));
    }

    // --- што пераносіцца ---

    [Fact]
    public void ApplyHints_KeepsTheCommentAndTheErrorType()
    {
        var document = Document(Word("кот") with
        {
            Comment = "праверыць",
            Metadata = new LinguisticItemMetadata(null, null, LinguisticErrorType.Orthoepic),
        });
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        var word = FirstWord(document);
        Assert.Equal("праверыць", word.Comment);
        Assert.Equal(LinguisticErrorType.Orthoepic, word.Metadata!.ErrorType);
        Assert.Equal(Today, word.Metadata.ResolvedOn);
    }

    [Fact]
    public void ApplyHints_KeepsTheErrorTypeEvenWhenTheWordStaysUnresolved()
    {
        var document = Document(Word("невядомае") with
        {
            Metadata = new LinguisticItemMetadata(null, null, LinguisticErrorType.Lexical),
        });
        var snapshots = TaggingService.Snapshot(document.Paragraphs);

        TaggingService.ApplyHints(document, snapshots, null, Lookups, Today);

        var word = FirstWord(document);
        Assert.Null(word.Metadata!.ResolvedOn);
        Assert.Equal(LinguisticErrorType.Lexical, word.Metadata.ErrorType);
    }

    // --- дапаможнае ---

    private static LinguisticItem Word(string text) => Item(text, SentenceItemType.Word);

    private static LinguisticItem Item(string text, SentenceItemType type) => new(text, type);

    private static CorpusDocument Document(params LinguisticItem[] items)
    {
        var sentence = new Sentence(1, Guid.NewGuid(), [.. items]);
        var paragraph = new Paragraph(1, Guid.NewGuid(), [sentence]);
        var header = new CorpusDocumentHeader(1, "Дакумэнт", null, null, null, null, null, null, null);
        return new CorpusDocument(header, [paragraph]);
    }

    private static LinguisticItem FirstWord(CorpusDocument document) =>
        document.Paragraphs
            .SelectMany(p => p.Sentences)
            .SelectMany(s => s.SentenceItems)
            .First(i => i.Type == SentenceItemType.Word);
}
