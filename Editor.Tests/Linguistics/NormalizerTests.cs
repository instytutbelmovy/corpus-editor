using Editor.Domain;

namespace Editor.Tests.Linguistics;

public class NormalizerTests
{
    [Theory]
    [InlineData("хата", "хата")]
    [InlineData("Хата", "хата")]
    // Тыпаграфічны націск (+) і карэктны (U+0301) - абодва выкідаюцца, не толькі мапуюцца
    [InlineData("ха+та", "хата")]
    [InlineData("ха́та", "хата")]
    [InlineData("ўзгорак", "узгорак")]
    [InlineData("Ўзгорак", "узгорак")]
    public void GrammarDbSearchNormalize_MatchesFormIndexNormalization(string input, string expected)
    {
        Assert.Equal(expected, Normalizer.GrammarDbSearchNormalize(input));
    }

    [Fact]
    public void GrammarDbSearchNormalize_SameKey_ForStressedAndUnstressedSpelling()
    {
        // Лема ў базе нясе націск, запыт карыстальніка - не; ключы пошуку мусяць супасьці
        Assert.Equal(
            Normalizer.GrammarDbSearchNormalize("ха́та"),
            Normalizer.GrammarDbSearchNormalize("хата"));
    }

    [Fact]
    public void GrammarDbSearchNormalize_SameKey_AsAggressiveFormNormalization()
    {
        // Пошук па леме і зваротны індэкс формаў мусяць трапляць у адзін і той жа алфавіт (ў->у, рэгістр)
        const string word = "ЎзгорАк";
        Assert.Equal(
            Normalizer.GrammarDbAggressiveNormalize(word),
            Normalizer.GrammarDbSearchNormalize(word));
    }

    [Fact]
    public void GrammarDbSearchNormalize_EmptyString_ReturnsEmpty()
    {
        Assert.Equal("", Normalizer.GrammarDbSearchNormalize(""));
    }
}
