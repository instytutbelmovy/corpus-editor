using Editor.Domain;
using Editor.Services.Grammar;

namespace Editor.Tests.Linguistics;

public class GrammarInferenceTests
{
    private static GrammarInfo Info(int paradigmId, string variantId, string formTag, string paradigmTag, string lemma)
        => new(new ParadigmFormId(paradigmId, variantId, formTag), new LinguisticTag(paradigmTag, formTag), lemma, null);

    private static readonly GrammarInfo Noun = Info(10, "a", "NMSNN", "NMS", "род");
    private static readonly GrammarInfo Verb = Info(20, "a", "VTPN1", "VTPN", "радзіць");
    private static readonly GrammarInfo Numeral = Info(30, "a", "MNSNN", "MNS", "трэці");

    [Fact]
    public void Narrow_KeepsOnlyAcceptablePartsOfSpeech()
    {
        var narrowed = GrammarInference.Narrow([Noun, Verb], UposMapAcceptableVerb);

        Assert.Equal([Verb], narrowed);
    }

    [Fact]
    public void Narrow_WhenNothingMatches_ReturnsTheOriginalList()
    {
        // Stanza не пагадзілася з ГрамБазай - давяраем базе, а не мадэлі
        var candidates = new[] { Noun, Numeral };

        var narrowed = GrammarInference.Narrow(candidates, UposMapAcceptableVerb);

        Assert.Equal(candidates, narrowed);
    }

    [Fact]
    public void Narrow_WithNoHint_ReturnsTheOriginalList()
    {
        var candidates = new[] { Noun, Verb };

        Assert.Equal(candidates, GrammarInference.Narrow(candidates, ReadOnlySpan<char>.Empty));
    }

    [Fact]
    public void BestGuess_IsIndependentOfCandidateOrder()
    {
        // Парадак радкоў з Postgres не вызначаны, а .verti файлы параўноўваюцца пабочна
        var a = GrammarInference.BestGuess([Noun, Verb, Numeral], UposMapAcceptableAdj);
        var b = GrammarInference.BestGuess([Numeral, Noun, Verb], UposMapAcceptableAdj);
        var c = GrammarInference.BestGuess([Verb, Numeral, Noun], UposMapAcceptableAdj);

        Assert.Equal(a, b);
        Assert.Equal(b, c);
    }

    [Fact]
    public void BestGuess_PrefersTheHigherRankedPartOfSpeech()
    {
        // Для ADJ набор - "APMNW": лічэбнік (M) стаіць вышэй за назоўнік (N)
        Assert.Equal(Numeral.ParadigmFormId, GrammarInference.BestGuess([Noun, Numeral], UposMapAcceptableAdj));
    }

    [Fact]
    public void BestGuess_FallsBackToUnacceptableCandidates_RatherThanReturningNothing()
    {
        Assert.Equal(Noun.ParadigmFormId, GrammarInference.BestGuess([Noun], UposMapAcceptableVerb));
    }

    [Fact]
    public void Infer_EmptyList_ReturnsNulls()
    {
        var (paradigmFormId, lemma, tag) = GrammarInference.Infer([]);

        Assert.Null(paradigmFormId);
        Assert.Null(lemma);
        Assert.Null(tag);
    }

    [Fact]
    public void Infer_FallsBackToCaseInsensitiveLemmaComparison()
    {
        // Першы праход (light) захоўвае рэгістр і лемы разыходзяцца; аграсіўны праход іх зводзіць
        var lower = Info(40, "a", "NMSNN", "NMS", "род");
        var upper = Info(40, "a", "NMSGN", "NMS", "Род");

        var (_, lemma, _) = GrammarInference.Infer([lower, upper]);

        Assert.Equal("род", lemma);
    }

    [Fact]
    public void Infer_DifferentLemmas_ReturnsNoLemma()
    {
        var (_, lemma, _) = GrammarInference.Infer([Noun, Verb]);

        Assert.Null(lemma);
    }

    // Наборы літараў бяруцца з UposMap, каб тэсты ішлі за той самай табліцай, што і код
    private static ReadOnlySpan<char> UposMapAcceptableVerb => Services.Linguistics.UposMap.Acceptable("VERB");
    private static ReadOnlySpan<char> UposMapAcceptableAdj => Services.Linguistics.UposMap.Acceptable("ADJ");
}
