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
    public void Parse_WhiteSpaceOnly_ReturnsWordSeparator()
    {
        var result = Tokenizer.Parse("   ");

        Assert.Single(result);
        Assert.True(result[0] is { Type: TokenType.WordSeparator });
    }

    [Fact]
    public void Parse_SingleWord_ReturnsSingleToken()
    {
        var result = Tokenizer.Parse("слова");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_TwoWords_ReturnsTwoTokens()
    {
        var result = Tokenizer.Parse("першае другое");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "першае", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: " ", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Text: "другое", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WordWithPeriod_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова.");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: ".", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithQuestionMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова?");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "?", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithExclamationMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова!");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "!", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_MultiplePeriodsAfterSeparator_AddsToNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("слова...");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "...", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithApostropheInMiddle_KeepsApostropheInWord()
    {
        var result = Tokenizer.Parse("вераб'і");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "верабʼі", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WordWithDash_KeepsDashInWord()
    {
        var result = Tokenizer.Parse("кветка-роза");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "кветка-роза", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_LineBreak_ReturnsLineBreakToken()
    {
        var result = Tokenizer.Parse("слова\nслова");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: "", Type: TokenType.LineBreak });
        Assert.True(result[2] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_LeadingWhitespace_SkipsLeadingSpaces()
    {
        var result = Tokenizer.Parse("   слова");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_TrailingWhitespace_SkipsTrailingSpaces()
    {
        var result = Tokenizer.Parse("слова   ");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WordsWithComma_ReturnsCommaAsNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("першае, другое");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "першае", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: ", ", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Text: "другое", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_ComplexSentence_ParsesCorrectly()
    {
        var result = Tokenizer.Parse("Гэта першае слова, а гэта другое!");

        Assert.Equal(13, result.Count);
        Assert.True(result[0] is { Text: "Гэта", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: " " });
        Assert.True(result[2] is { Text: "першае" });
        Assert.True(result[3] is { Text: " " });
        Assert.True(result[4] is { Text: "слова" });
        Assert.True(result[5] is { Text: ", ", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[6] is { Text: "а" });
        Assert.True(result[7] is { Text: " " });
        Assert.True(result[8] is { Text: "гэта" });
        Assert.True(result[9] is { Text: " " });
        Assert.True(result[10] is { Text: "другое" });
        Assert.True(result[11] is { Text: "!" });
        Assert.True(result[12] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_EnglishIConvertsToBelarusian()
    {
        var result = Tokenizer.Parse("i");

        Assert.Single(result);
        Assert.True(result[0] is { Text: "і", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_Quotes()
    {
        var result = Tokenizer.Parse("Вітаю ў \"цудоўным\" «спальным» „вагоне“");

        Assert.Equal(10, result.Count);
        Assert.True(result[0] is { Text: "Вітаю", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: " ", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Text: "ў", Type: TokenType.AlphaNumeric });
        Assert.True(result[3] is { Text: " \"", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[4] is { Text: "цудоўным", Type: TokenType.AlphaNumeric });
        Assert.True(result[5] is { Text: "\" «", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[6] is { Text: "спальным", Type: TokenType.AlphaNumeric });
        Assert.True(result[7] is { Text: "» „", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[8] is { Text: "вагоне", Type: TokenType.AlphaNumeric });
        Assert.True(result[9] is { Text: "“", Type: TokenType.NonAlphaNumeric });
    }

    [Fact]
    public void Parse_NumbersAreKept()
    {
        var result = Tokenizer.Parse("123 слова");

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "123", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: " " });
        Assert.True(result[2] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_PunctuationWithoutWord_OnlyPunctuation()
    {
        var result = Tokenizer.Parse("...");

        Assert.Equal(2, result.Count);
        Assert.True(result[0] is { Text: "...", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[1] is { Text: "", Type: TokenType.SentenceSeparator });
    }
}

