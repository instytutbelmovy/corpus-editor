using Editor.Domain;
using Editor.Services.Linguistics;

namespace Editor.Tests.Linguistics;

public class StanzaTextNormalizerTests
{
    [Fact]
    public void StripsStress()
    {
        // Tokenizer запісвае націск як U+0301; у золатам разьмечаных файлах яго няма
        Assert.Equal("галава", StanzaTextNormalizer.Clean("гала" + Normalizer.CorrectStress + "ва"));
        Assert.Equal("галава", StanzaTextNormalizer.Clean("гала´ва"));
    }

    [Fact]
    public void ConvertsApostropheToPlainAscii()
    {
        Assert.Equal("сям'я", StanzaTextNormalizer.Clean("сям" + Normalizer.CorrectApostrophe + "я"));
        Assert.Equal("сям'я", StanzaTextNormalizer.Clean("сям’я"));
    }

    [Fact]
    public void StripsEditorialMarks()
    {
        Assert.Equal("слова", StanzaTextNormalizer.Clean("*слова"));
        Assert.Equal("слова", StanzaTextNormalizer.Clean("[слова]"));
    }

    [Fact]
    public void PreservesShortU()
    {
        // GrammarDbAggressiveNormalize замяніў бы "ў" на "у", а Stanza гэтую літару ведае
        Assert.Equal("ва ўсім", StanzaTextNormalizer.Clean("ва ўсім"));
    }

    [Fact]
    public void PreservesCaseAndHyphens()
    {
        Assert.Equal("па-беларуску", StanzaTextNormalizer.Clean("па-беларуску"));
        Assert.Equal("Менск", StanzaTextNormalizer.Clean("Менск"));
    }

    [Theory]
    [InlineData("*")]
    [InlineData("**")]
    [InlineData("[]")]
    [InlineData("")]
    public void ReturnsNull_WhenNothingSurvives(string token)
        => Assert.Null(StanzaTextNormalizer.Clean(token));

    [Fact]
    public void LeavesOrdinaryPunctuationAlone()
    {
        // Знакі прыпынку перадаюцца ў Stanza як карысны кантэкст для тэгера
        Assert.Equal(".", StanzaTextNormalizer.Clean("."));
        Assert.Equal("—", StanzaTextNormalizer.Clean("—"));
    }
}
