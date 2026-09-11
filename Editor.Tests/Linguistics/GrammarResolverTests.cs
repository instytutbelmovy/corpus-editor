using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Linguistics;

namespace Editor.Tests.Linguistics;

public class GrammarResolverTests
{
    private static readonly DateOnly Today = new(2026, 9, 8);

    private static GrammarInfo Info(int paradigmId, string formTag, string paradigmTag, string lemma)
        => new(new ParadigmFormId(paradigmId, "a", formTag), new LinguisticTag(paradigmTag, formTag), lemma, null);

    private static readonly GrammarInfo Noun = Info(10, "NMSNN", "NMS", "род");
    private static readonly GrammarInfo Verb = Info(20, "VTPN1", "VTPN", "радзіць");
    private static readonly GrammarInfo Numeral = Info(30, "MNSNN", "MNS", "трэці");

    // --- словы па-за ГрамБазай ---

    [Fact]
    public void OutOfVocabulary_WithHint_TakesLemmaAndPartOfSpeechFromStanza()
    {
        var result = GrammarResolver.Resolve([], new StanzaToken("NOUN", "хмарачос"), Today);

        Assert.Null(result.ParadigmFormId);
        Assert.Equal("хмарачос", result.Lemma);
        Assert.Equal("N|", result.LinguisticTag?.ToString());
        // Разьвязаным такое слова ня лічыцца
        Assert.Null(result.Metadata);
    }

    [Theory]
    [InlineData("X")]
    [InlineData("SYM")]
    [InlineData("PUNCT")]
    public void OutOfVocabulary_WithUnmappableHint_StaysEmpty(string upos)
    {
        // test1.py запісаў бы сюды тэг "X|" - літары X у алфавіце ГрамБазы няма
        var result = GrammarResolver.Resolve([], new StanzaToken(upos, "штосьці"), Today);

        Assert.Null(result.ParadigmFormId);
        Assert.Null(result.Lemma);
        Assert.Null(result.LinguisticTag);
        Assert.Null(result.Metadata);
    }

    [Fact]
    public void OutOfVocabulary_WithoutHint_StaysEmpty()
    {
        var result = GrammarResolver.Resolve([], null, Today);

        Assert.Null(result.Lemma);
        Assert.Null(result.LinguisticTag);
        Assert.Null(result.Metadata);
    }

    [Fact]
    public void OutOfVocabulary_WithoutLemma_StaysEmpty()
    {
        var result = GrammarResolver.Resolve([], new StanzaToken("NOUN", null), Today);

        Assert.Null(result.Lemma);
        Assert.Null(result.LinguisticTag);
    }

    // --- адзіны кандыдат ---

    [Fact]
    public void SingleCandidate_IsResolvedByGrammarDb()
    {
        var result = GrammarResolver.Resolve([Noun], null, Today);

        Assert.Equal(Noun.ParadigmFormId, result.ParadigmFormId);
        Assert.Equal("род", result.Lemma);
        Assert.Equal(Today, result.Metadata?.ResolvedOn);
        // Двухсэнсоўнасьці не было - заслуга базы, не мадэлі
        Assert.Equal(ResolutionSource.GrammarDb, result.Metadata?.ResolvedBy);
        Assert.Null(result.Metadata?.Suggested);
    }

    [Fact]
    public void SingleCandidate_StaysGrammarDb_EvenWhenStanzaDisagrees()
    {
        var result = GrammarResolver.Resolve([Noun], new StanzaToken("VERB", "радзіць"), Today);

        Assert.Equal(Noun.ParadigmFormId, result.ParadigmFormId);
        Assert.Equal(ResolutionSource.GrammarDb, result.Metadata?.ResolvedBy);
    }

    // --- звужэньне падказкай ---

    [Fact]
    public void NarrowedToSingleCandidate_IsResolvedByStanza()
    {
        var result = GrammarResolver.Resolve([Noun, Verb], new StanzaToken("VERB", "радзіць"), Today);

        Assert.Equal(Verb.ParadigmFormId, result.ParadigmFormId);
        Assert.Equal("радзіць", result.Lemma);
        Assert.Equal(Today, result.Metadata?.ResolvedOn);
        // Правярацца такія словы будуць першымі: дакладнасьць мадэлі ~83%
        Assert.Equal(ResolutionSource.Stanza, result.Metadata?.ResolvedBy);
    }

    [Fact]
    public void StillAmbiguousAfterNarrowing_SuggestsInsteadOfResolving()
    {
        var otherNoun = Info(11, "NMSGN", "NMS", "рода");

        var result = GrammarResolver.Resolve([Noun, otherNoun, Verb], new StanzaToken("NOUN", "род"), Today);

        Assert.Null(result.Metadata?.ResolvedOn);
        Assert.Equal(ResolutionSource.NotResolved, result.Metadata?.ResolvedBy);
        Assert.NotNull(result.Metadata?.Suggested);
        // Падказка бярэцца з тых, што перажылі звужэньне
        Assert.Contains(result.Metadata!.Suggested, new[] { Noun.ParadigmFormId, otherNoun.ParadigmFormId });
    }

    [Fact]
    public void HintMatchingNoCandidate_BehavesAsIfThereWereNoHint()
    {
        var withBadHint = GrammarResolver.Resolve([Noun, Numeral], new StanzaToken("ADP", "у"), Today);
        var withoutHint = GrammarResolver.Resolve([Noun, Numeral], null, Today);

        Assert.Equal(withoutHint.ParadigmFormId, withBadHint.ParadigmFormId);
        Assert.Equal(withoutHint.Lemma, withBadHint.Lemma);
        Assert.Equal(withoutHint.LinguisticTag, withBadHint.LinguisticTag);
    }

    // --- Stanza выключаная ---

    [Fact]
    public void WithoutHint_AmbiguousWordGetsNoSuggestion()
    {
        // Гэта трымае вынік загрузкі нязьменным, калі Stanza не наладжаная
        var result = GrammarResolver.Resolve([Noun, Verb], null, Today);

        Assert.Null(result.Metadata);
    }

    [Fact]
    public void WithoutHint_AmbiguousWordIsNotResolved()
    {
        var result = GrammarResolver.Resolve([Noun, Verb], null, Today);

        Assert.Null(result.ParadigmFormId);
        Assert.Null(result.Lemma);
    }
}
