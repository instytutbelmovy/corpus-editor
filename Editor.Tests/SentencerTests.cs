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
        Assert.Equal("слова", result[0][0].Text);
        Assert.Equal(SentenceItemType.Word, result[0][0].Type);
        Assert.False(result[0][0].GlueNext);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.Equal(SentenceItemType.Word, result[0][0].Type);
        Assert.False(result[0][0].GlueNext);
        Assert.Equal("другое", result[0][1].Text);
        Assert.Equal(SentenceItemType.Word, result[0][1].Type);
        Assert.False(result[0][1].GlueNext);
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
        Assert.Equal("слова", result[0][0].Text);
        Assert.Equal(SentenceItemType.Word, result[0][0].Type);
        Assert.True(result[0][0].GlueNext);
        Assert.Equal(".", result[0][1].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][1].Type);
        Assert.False(result[0][1].GlueNext);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.Equal(".", result[0][1].Text);
        Assert.Equal(2, result[1].Count);
        Assert.Equal("другое", result[1][0].Text);
        Assert.Equal(".", result[1][1].Text);
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
        Assert.Equal("слова", result[0][0].Text);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.Equal(SentenceItemType.Word, result[0][0].Type);
        Assert.Equal("", result[0][1].Text);
        Assert.Equal(SentenceItemType.LineBreak, result[0][1].Type);
        Assert.Equal("другое", result[0][2].Text);
        Assert.Equal(SentenceItemType.Word, result[0][2].Type);
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
        Assert.Equal("слова", result[0][0].Text);
        Assert.Equal(SentenceItemType.Word, result[0][0].Type);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.True(result[0][0].GlueNext);
        Assert.Equal(",", result[0][1].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][1].Type);
        Assert.False(result[0][1].GlueNext);
        Assert.Equal("другое", result[0][2].Text);
        Assert.False(result[0][2].GlueNext);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.False(result[0][0].GlueNext);
        Assert.Equal("другое", result[0][1].Text);
        Assert.False(result[0][1].GlueNext);
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
        Assert.Equal("слова", result[0][0].Text);
        Assert.False(result[0][0].GlueNext);

        Assert.Equal("\"", result[0][1].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][1].Type);
        Assert.True(result[0][1].GlueNext);

        Assert.Equal("цудоўны", result[0][2].Text);
        Assert.True(result[0][2].GlueNext);

        Assert.Equal("\"", result[0][3].Text);
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
        Assert.Equal("першае", result[0][0].Text);
        Assert.Equal("другое", result[1][0].Text);
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
        Assert.Equal("слова", result[0][0].Text);
        Assert.True(result[0][0].GlueNext);
        Assert.Equal("...", result[0][1].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][1].Type);
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
        Assert.Equal("Гэта", result[0][0].Text);
        Assert.False(result[0][0].GlueNext);
        Assert.Equal("першае", result[0][1].Text);
        Assert.False(result[0][1].GlueNext);
        Assert.Equal("слова", result[0][2].Text);
        Assert.True(result[0][2].GlueNext);
        Assert.Equal(",", result[0][3].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][3].Type);
        Assert.Equal("а", result[0][4].Text);
        Assert.Equal("гэта", result[0][5].Text);
        Assert.Equal("другое", result[0][6].Text);
        Assert.True(result[0][6].GlueNext);
        Assert.Equal("!", result[0][7].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][7].Type);
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
        Assert.Equal("...", result[0][0].Text);
        Assert.Equal(SentenceItemType.Punctuation, result[0][0].Type);
    }
}

