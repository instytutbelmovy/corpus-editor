using Editor.Converters;

namespace Editor.Tests;

public class SentencerTests
{
    [Fact]
    public void ToSentences_EmptyTokenList_ReturnsEmpty()
    {
        var tokens = new List<Token>();

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void ToSentences_SingleWord_ReturnsSingleSentence()
    {
        var tokens = new List<Token>
        {
            new("слова", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Single(result[0]);
        Assert.True(result[0][0] is { Text: "слова", Type: SentenceItemType.Word, GlueNext: false });
    }

    [Fact]
    public void ToSentences_TwoWords_ReturnsSingleSentence()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("другое", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(2, result[0].Count);
        Assert.True(result[0][0] is { Text: "першае", Type: SentenceItemType.Word, GlueNext: false });
        Assert.True(result[0][1] is { Text: "другое", Type: SentenceItemType.Word, GlueNext: false });
    }

    [Fact]
    public void ToSentences_WordWithPeriod_GluesPunctuationToWord()
    {
        var tokens = new List<Token>
        {
            new("слова", TokenType.AlphaNumeric),
            new(".", TokenType.NonAlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(2, result[0].Count);
        Assert.True(result[0][0] is { Text: "слова", Type: SentenceItemType.Word, GlueNext: true });
        Assert.True(result[0][1] is { Text: ".", Type: SentenceItemType.Punctuation, GlueNext: false });
    }

    [Fact]
    public void ToSentences_TwoSentences_ReturnsTwoSentences()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new(".", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator),
            new("другое", TokenType.AlphaNumeric),
            new(".", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal(2, result[0].Count);
        Assert.True(result[0][0] is { Text: "першае" });
        Assert.True(result[0][1] is { Text: "." });
        Assert.Equal(2, result[1].Count);
        Assert.True(result[1][0] is { Text: "другое" });
        Assert.True(result[1][1] is { Text: "." });
    }

    [Fact]
    public void ToSentences_SeparatorAtStart_SkipsEmpty()
    {
        var tokens = new List<Token>
        {
            new("", TokenType.SentenceSeparator),
            new("слова", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Single(result[0]);
        Assert.True(result[0][0] is { Text: "слова" });
    }

    [Fact]
    public void ToSentences_LineBreakInSentence_AddsLineBreakItem()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new("", TokenType.LineBreak),
            new("другое", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(3, result[0].Count);
        Assert.True(result[0][0] is { Text: "першае", Type: SentenceItemType.Word });
        Assert.True(result[0][1] is { Text: "", Type: SentenceItemType.LineBreak });
        Assert.True(result[0][2] is { Text: "другое", Type: SentenceItemType.Word });
    }

    [Fact]
    public void ToSentences_LineBreakAtStart_DoesNotAddLineBreak()
    {
        var tokens = new List<Token>
        {
            new("", TokenType.LineBreak),
            new("слова", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Single(result[0]);
        Assert.True(result[0][0] is { Text: "слова", Type: SentenceItemType.Word });
    }

    [Fact]
    public void ToSentences_WordsWithComma_GluesCommaAndSpace()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new(", ", TokenType.NonAlphaNumeric),
            new("другое", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(3, result[0].Count);
        Assert.True(result[0][0] is { Text: "першае", GlueNext: true });
        Assert.True(result[0][1] is { Text: ",", Type: SentenceItemType.Punctuation, GlueNext: false });
        Assert.True(result[0][2] is { Text: "другое", GlueNext: false });
    }

    [Fact]
    public void ToSentences_OnlySpaces_ReturnsEmpty()
    {
        var tokens = new List<Token>
        {
            new(" ", TokenType.NonAlphaNumeric),
            new("  ", TokenType.NonAlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void ToSentences_WordSpaceWord_GluesCorrectly()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("другое", TokenType.AlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(2, result[0].Count);
        Assert.True(result[0][0] is { Text: "першае", GlueNext: false });
        Assert.True(result[0][1] is { Text: "другое", GlueNext: false });
    }

    [Fact]
    public void ToSentences_QuotedWord_GluesQuotes()
    {
        var tokens = new List<Token>
        {
            new("слова", TokenType.AlphaNumeric),
            new(" \"", TokenType.NonAlphaNumeric),
            new("цудоўны", TokenType.AlphaNumeric),
            new("\"", TokenType.NonAlphaNumeric)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(4, result[0].Count);
        Assert.True(result[0][0] is { Text: "слова", GlueNext: false });
        Assert.True(result[0][1] is { Text: "\"", Type: SentenceItemType.Punctuation, GlueNext: true });
        Assert.True(result[0][2] is { Text: "цудоўны", GlueNext: true });
        Assert.True(result[0][3] is { Text: "\"" });
    }

    [Fact]
    public void ToSentences_MultipleSeparators_CreatesMultipleSentences()
    {
        var tokens = new List<Token>
        {
            new("першае", TokenType.AlphaNumeric),
            new(".", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator),
            new("", TokenType.SentenceSeparator),
            new("другое", TokenType.AlphaNumeric),
            new("!", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0][0] is { Text: "першае" });
        Assert.True(result[1][0] is { Text: "другое" });
    }

    [Fact]
    public void ToSentences_Ellipsis_GluesEllipsis()
    {
        var tokens = new List<Token>
        {
            new("слова", TokenType.AlphaNumeric),
            new("...", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(2, result[0].Count);
        Assert.True(result[0][0] is { Text: "слова", GlueNext: true });
        Assert.True(result[0][1] is { Text: "...", Type: SentenceItemType.Punctuation });
    }

    [Fact]
    public void ToSentences_ComplexSentence_HandlesCorrectly()
    {
        var tokens = new List<Token>
        {
            new("Гэта", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("першае", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("слова", TokenType.AlphaNumeric),
            new(", ", TokenType.NonAlphaNumeric),
            new("а", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("гэта", TokenType.AlphaNumeric),
            new(" ", TokenType.NonAlphaNumeric),
            new("другое", TokenType.AlphaNumeric),
            new("!", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Equal(8, result[0].Count);
        Assert.True(result[0][0] is { Text: "Гэта", GlueNext: false });
        Assert.True(result[0][1] is { Text: "першае", GlueNext: false });
        Assert.True(result[0][2] is { Text: "слова", GlueNext: true });
        Assert.True(result[0][3] is { Text: ",", Type: SentenceItemType.Punctuation });
        Assert.True(result[0][4] is { Text: "а" });
        Assert.True(result[0][5] is { Text: "гэта" });
        Assert.True(result[0][6] is { Text: "другое", GlueNext: true });
        Assert.True(result[0][7] is { Text: "!", Type: SentenceItemType.Punctuation });
    }

    [Fact]
    public void ToSentences_PunctuationOnly_HandlesCorrectly()
    {
        var tokens = new List<Token>
        {
            new("...", TokenType.NonAlphaNumeric),
            new("", TokenType.SentenceSeparator)
        };

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Single(result[0]);
        Assert.True(result[0][0] is { Text: "...", Type: SentenceItemType.Punctuation });
    }
}

