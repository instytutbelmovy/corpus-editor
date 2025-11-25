using Editor.Converters;

namespace Editor.Tests;

public class TokenizerTests
{
    [Fact]
    public void Parse_EmptyString_ReturnsEmptyList()
    {
        var result = Tokenizer.Parse("");

        Assert.Empty(result);
    }

    [Fact]
    public void Parse_WhiteSpaceOnly_ReturnsEmptyList()
    {
        var result = Tokenizer.Parse("   ");

        Assert.Empty(result);
    }

    [Fact]
    public void Parse_SingleWord_ReturnsSingleToken()
    {
        var result = Tokenizer.Parse("слова");

        Assert.Single(result);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_TwoWords_ReturnsTwoTokens()
    {
        var result = Tokenizer.Parse("першае другое");

        Assert.Equal(3, result.Count);
        Assert.Equal("першае", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal(" ", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("другое", result[2].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[2].Type);
    }

    [Fact]
    public void Parse_WordWithPeriod_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова.");

        Assert.Equal(3, result.Count);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal(".", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("", result[2].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[2].Type);
    }

    [Fact]
    public void Parse_WordWithQuestionMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова?");

        Assert.Equal(3, result.Count);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal("?", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("", result[2].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[2].Type);
    }

    [Fact]
    public void Parse_WordWithExclamationMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова!");

        Assert.Equal(3, result.Count);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal("!", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("", result[2].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[2].Type);
    }

    [Fact]
    public void Parse_MultiplePeriodsAfterSeparator_AddsToNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("слова...");

        Assert.Equal(3, result.Count);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal("...", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("", result[2].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[2].Type);
    }

    [Fact]
    public void Parse_WordWithApostropheInMiddle_KeepsApostropheInWord()
    {
        var result = Tokenizer.Parse("вераб'і");

        Assert.Single(result);
        Assert.Equal("верабʼі", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_WordWithDash_KeepsDashInWord()
    {
        var result = Tokenizer.Parse("кветка-роза");

        Assert.Single(result);
        Assert.Equal("кветка-роза", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_LineBreak_ReturnsLineBreakToken()
    {
        var result = Tokenizer.Parse("слова\nслова");

        Assert.Equal(3, result.Count);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal("", result[1].Text);
        Assert.Equal(TokenType.LineBreak, result[1].Type);
        Assert.Equal("слова", result[2].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[2].Type);
    }

    [Fact]
    public void Parse_LeadingWhitespace_SkipsLeadingSpaces()
    {
        var result = Tokenizer.Parse("   слова");

        Assert.Single(result);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_TrailingWhitespace_SkipsTrailingSpaces()
    {
        var result = Tokenizer.Parse("слова   ");

        Assert.Single(result);
        Assert.Equal("слова", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_WordsWithComma_ReturnsCommaAsNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("першае, другое");

        Assert.Equal(3, result.Count);
        Assert.Equal("першае", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal(", ", result[1].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[1].Type);
        Assert.Equal("другое", result[2].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[2].Type);
    }

    [Fact]
    public void Parse_ComplexSentence_ParsesCorrectly()
    {
        var result = Tokenizer.Parse("Гэта першае слова, а гэта другое!");

        Assert.Equal(13, result.Count);
        Assert.Equal("Гэта", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal(" ", result[1].Text);
        Assert.Equal("першае", result[2].Text);
        Assert.Equal(" ", result[3].Text);
        Assert.Equal("слова", result[4].Text);
        Assert.Equal(", ", result[5].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[5].Type);
        Assert.Equal("а", result[6].Text);
        Assert.Equal(" ", result[7].Text);
        Assert.Equal("гэта", result[8].Text);
        Assert.Equal(" ", result[9].Text);
        Assert.Equal("другое", result[10].Text);
        Assert.Equal("!", result[11].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[12].Type);
    }

    [Fact]
    public void Parse_EnglishIConvertsToBelarusian()
    {
        var result = Tokenizer.Parse("i");

        Assert.Single(result);
        Assert.Equal("і", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
    }

    [Fact]
    public void Parse_Quotes()
    {
        var result = Tokenizer.Parse("Вітаю ў \"цудоўным\" «спальным» „вагоне“");

        Assert.Equal(10, result.Count);
        Assert.Equal("Вітаю", result[0].Text);
        Assert.Equal(" ", result[1].Text);
        Assert.Equal("ў", result[2].Text);
        Assert.Equal(" \"", result[3].Text);
        Assert.Equal("цудоўным", result[4].Text);
        Assert.Equal("\" «", result[5].Text);
        Assert.Equal("спальным", result[6].Text);
        Assert.Equal("» „", result[7].Text);
        Assert.Equal("вагоне", result[8].Text);
        Assert.Equal("“", result[9].Text);
    }

    [Fact]
    public void Parse_NumbersAreKept()
    {
        var result = Tokenizer.Parse("123 слова");

        Assert.Equal(3, result.Count);
        Assert.Equal("123", result[0].Text);
        Assert.Equal(TokenType.AlphaNumeric, result[0].Type);
        Assert.Equal(" ", result[1].Text);
        Assert.Equal("слова", result[2].Text);
    }

    [Fact]
    public void Parse_PunctuationWithoutWord_OnlyPunctuation()
    {
        var result = Tokenizer.Parse("...");

        Assert.Equal(2, result.Count);
        Assert.Equal("...", result[0].Text);
        Assert.Equal(TokenType.NonAlphaNumeric, result[0].Type);
        Assert.Equal("", result[1].Text);
        Assert.Equal(TokenType.SentenceSeparator, result[1].Type);
    }
}

