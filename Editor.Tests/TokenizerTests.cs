using Editor.Converters;

namespace Editor.Tests;

public class TokenizerTests
{
    [Fact]
    public void Parse_EmptyString_ReturnsEmptyList()
    {
        var result = Tokenizer.Parse("").ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void Parse_WhiteSpaceOnly_ReturnsWordSeparator()
    {
        var result = Tokenizer.Parse("   ").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Type: TokenType.WordSeparator });
    }

    [Fact]
    public void Parse_SingleWord_ReturnsSingleToken()
    {
        var result = Tokenizer.Parse("слова").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_TwoWords_ReturnsTwoTokens()
    {
        var result = Tokenizer.Parse("першае другое").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "першае", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
        Assert.True(result[2] is { Text: "другое", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WordWithPeriod_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова.").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: ".", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithQuestionMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова?").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "?", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithExclamationMark_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова!").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "!", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithInterrobang_ReturnsSeparatorToken()
    {
        var result = Tokenizer.Parse("слова?!").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "?!", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_MultiplePeriodsAfterSeparator_AddsToNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("слова...").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова" });
        Assert.True(result[1] is { Text: "...", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_WordWithApostropheInMiddle_KeepsApostropheInWord()
    {
        var result = Tokenizer.Parse("вераб'і").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Text: "верабʼі", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WordWithDash_KeepsDashInWord()
    {
        var result = Tokenizer.Parse("кветка-роза").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Text: "кветка-роза", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_LineBreak_ReturnsLineBreakToken()
    {
        var result = Tokenizer.Parse("слова1\nслова2").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова1", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.LineBreak });
        Assert.True(result[2] is { Text: "слова2", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_WindowsLineBreak_ReturnsLineBreakToken()
    {
        var result = Tokenizer.Parse("слова1\r\nслова2").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "слова1", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.LineBreak });
        Assert.True(result[2] is { Text: "слова2", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_LeadingWhitespace_SkipsLeadingSpaces()
    {
        var result = Tokenizer.Parse("   слова").ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0] is { Type: TokenType.WordSeparator });
        Assert.True(result[1] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_TrailingWhitespace_SkipsTrailingSpaces()
    {
        var result = Tokenizer.Parse("слова   ").ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0] is { Text: "слова", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
    }

    [Fact]
    public void Parse_WordsWithComma_ReturnsCommaAsNonAlphaNumeric()
    {
        var result = Tokenizer.Parse("першае, другое").ToList();

        Assert.Equal(4, result.Count);
        Assert.True(result[0] is { Text: "першае", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Text: ",", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[2] is { Type: TokenType.WordSeparator });
        Assert.True(result[3] is { Text: "другое", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_ComplexSentence_ParsesCorrectly()
    {
        var result = Tokenizer.Parse("Гэта першае слова, а гэта другое!").ToList();

        Assert.Equal(14, result.Count);
        Assert.True(result[0] is { Text: "Гэта", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
        Assert.True(result[2] is { Text: "першае" });
        Assert.True(result[3] is { Type: TokenType.WordSeparator });
        Assert.True(result[4] is { Text: "слова" });
        Assert.True(result[5] is { Text: ",", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[6] is { Type: TokenType.WordSeparator });
        Assert.True(result[7] is { Text: "а" });
        Assert.True(result[8] is { Type: TokenType.WordSeparator });
        Assert.True(result[9] is { Text: "гэта" });
        Assert.True(result[10] is { Type: TokenType.WordSeparator });
        Assert.True(result[11] is { Text: "другое" });
        Assert.True(result[12] is { Text: "!", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[13] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_EnglishIConvertsToBelarusian()
    {
        var result = Tokenizer.Parse("i").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Text: "і", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_MultipleSentences()
    {
        var result = Tokenizer.Parse("Прыйшоў дадому! Бахнуў піва. Лёг спаць. ").ToList();

        Assert.Equal(15, result.Count);
        Assert.True(result[0] is { Text: "Прыйшоў", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
        Assert.True(result[2] is { Text: "дадому", Type: TokenType.AlphaNumeric });
        Assert.True(result[3] is { Text: "!", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[4] is { Type: TokenType.SentenceSeparator });
        
        Assert.True(result[5] is { Text: "Бахнуў", Type: TokenType.AlphaNumeric });
        Assert.True(result[6] is { Type: TokenType.WordSeparator });
        Assert.True(result[7] is { Text: "піва", Type: TokenType.AlphaNumeric });
        Assert.True(result[8] is { Text: ".", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[9] is { Type: TokenType.SentenceSeparator });

        Assert.True(result[10] is { Text: "Лёг", Type: TokenType.AlphaNumeric });
        Assert.True(result[11] is { Type: TokenType.WordSeparator });
        Assert.True(result[12] is { Text: "спаць", Type: TokenType.AlphaNumeric });
        Assert.True(result[13] is { Text: ".", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[14] is { Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_Quotes()
    {
        var result = Tokenizer.Parse("Вітаю ў \"цудоўным\" «спальным» „вагоне“").ToList();

        Assert.Equal(15, result.Count);
        Assert.True(result[0] is { Text: "Вітаю", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
        Assert.True(result[2] is { Text: "ў", Type: TokenType.AlphaNumeric });
        Assert.True(result[3] is { Type: TokenType.WordSeparator });
        Assert.True(result[4] is { Text: "\"", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[5] is { Text: "цудоўным", Type: TokenType.AlphaNumeric });
        Assert.True(result[6] is { Text: "\"", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[7] is { Type: TokenType.WordSeparator });
        Assert.True(result[8] is { Text: "«", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[9] is { Text: "спальным", Type: TokenType.AlphaNumeric });
        Assert.True(result[10] is { Text: "»", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[11] is { Type: TokenType.WordSeparator });
        Assert.True(result[12] is { Text: "„", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[13] is { Text: "вагоне", Type: TokenType.AlphaNumeric });
        Assert.True(result[14] is { Text: "“", Type: TokenType.NonAlphaNumeric });
    }

    [Fact]
    public void Parse_NumbersAreWords()
    {
        var result = Tokenizer.Parse("123 слова").ToList();

        Assert.Equal(3, result.Count);
        Assert.True(result[0] is { Text: "123", Type: TokenType.AlphaNumeric });
        Assert.True(result[1] is { Type: TokenType.WordSeparator });
        Assert.True(result[2] is { Text: "слова", Type: TokenType.AlphaNumeric });
    }

    [Fact]
    public void Parse_PunctuationWithoutWord_OnlyPunctuation()
    {
        var result = Tokenizer.Parse("...").ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0] is { Text: "...", Type: TokenType.NonAlphaNumeric });
        Assert.True(result[1] is { Text: "", Type: TokenType.SentenceSeparator });
    }

    [Fact]
    public void Parse_Asterisk_AsAlphanumeric()
    {
        var result = Tokenizer.Parse("ві*дзік").ToList();

        Assert.Single(result);
        Assert.True(result[0] is { Text: "ві*дзік", Type: TokenType.AlphaNumeric });
    }
}

