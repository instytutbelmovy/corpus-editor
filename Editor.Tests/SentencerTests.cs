using Editor.Converters;

namespace Editor.Tests;

public class SentencerTests
{
    [Fact]
    public void ToSentences_EmptyTokenList_ReturnsEmpty()
    {
        var tokens = Tokenizer.Parse("");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void ToSentences_SingleWord_ReturnsSingleSentence()
    {
        var tokens = Tokenizer.Parse("слова");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        Assert.Single(result[0]);
        Assert.True(result[0][0] is { Text: "слова", Type: SentenceItemType.Word, GlueNext: false });
    }

    [Fact]
    public void ToSentences_TwoWords_ReturnsSingleSentence()
    {
        var tokens = Tokenizer.Parse("першае другое");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(2, sentence.Count);
        Assert.True(sentence[0] is { Text: "першае", Type: SentenceItemType.Word, GlueNext: false });
        Assert.True(sentence[1] is { Text: "другое", Type: SentenceItemType.Word, GlueNext: false });
    }

    [Fact]
    public void ToSentences_WordWithPeriod_GluesPunctuationToWord()
    {
        var tokens = Tokenizer.Parse("слова.");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(2, sentence.Count);
        Assert.True(sentence[0] is { Text: "слова", Type: SentenceItemType.Word, GlueNext: true });
        Assert.True(sentence[1] is { Text: ".", Type: SentenceItemType.Punctuation, GlueNext: false });
    }

    [Fact]
    public void ToSentences_TwoSentences_ReturnsTwoSentences()
    {
        var tokens = Tokenizer.Parse("першае. другое .");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        var sentense0 = result[0];
        Assert.Equal(2, sentense0.Count);
        Assert.True(sentense0[0] is { Text: "першае", Type: SentenceItemType.Word, GlueNext: true });
        Assert.True(sentense0[1] is { Text: ".", Type: SentenceItemType.Punctuation });
        var sentence1 = result[1];
        Assert.Equal(2, sentence1.Count);
        Assert.True(sentence1[0] is { Text: "другое", Type: SentenceItemType.Word, GlueNext: false });
        Assert.True(sentence1[1] is { Text: ".", Type: SentenceItemType.Punctuation });
    }

    [Fact]
    public void ToSentences_SeparatorAtStart_SkipsEmpty()
    {
        var tokens = Tokenizer.Parse(". слова");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        var sentence0 = result[0];
        Assert.Single(sentence0);
        Assert.True(sentence0[0] is { Text: ".", Type: SentenceItemType.Punctuation });
        var sentence1 = result[1];
        Assert.Single(sentence1);
        Assert.True(sentence1[0] is { Text: "слова", Type: SentenceItemType.Word });
    }

    [Fact]
    public void ToSentences_LineBreakInSentence_AddsLineBreakItem()
    {
        var tokens = Tokenizer.Parse("першае\nдругое");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(3, sentence.Count);
        Assert.True(sentence[0] is { Text: "першае", Type: SentenceItemType.Word });
        Assert.True(sentence[1] is { Text: "", Type: SentenceItemType.LineBreak });
        Assert.True(sentence[2] is { Text: "другое", Type: SentenceItemType.Word });
    }

    [Fact]
    public void ToSentences_LineBreakAtStart_DoesNotAddLineBreak()
    {
        var tokens = Tokenizer.Parse("\nслова");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Single(sentence);
        Assert.True(sentence[0] is { Text: "слова", Type: SentenceItemType.Word });
    }

    [Fact]
    public void ToSentences_WordsWithComma_GluesCommaAndSpace()
    {
        var tokens = Tokenizer.Parse("першае, другое");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(3, sentence.Count);
        Assert.True(sentence[0] is { Text: "першае", GlueNext: true });
        Assert.True(sentence[1] is { Text: ",", Type: SentenceItemType.Punctuation, GlueNext: false });
        Assert.True(sentence[2] is { Text: "другое", GlueNext: false });
    }

    [Fact]
    public void ToSentences_OnlySpaces_ReturnsEmpty()
    {
        var tokens = Tokenizer.Parse("   ");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void ToSentences_WordSpaceWord_GluesCorrectly()
    {
        var tokens = Tokenizer.Parse("першае другое");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(2, sentence.Count);
        Assert.True(sentence[0] is { Text: "першае", GlueNext: false });
        Assert.True(sentence[1] is { Text: "другое", GlueNext: false });
    }

    [Fact]
    public void ToSentences_QuotedWord_GluesQuotes()
    {
        var tokens = Tokenizer.Parse("слова \"цудоўны\"");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(4, sentence.Count);
        Assert.True(sentence[0] is { Text: "слова", GlueNext: false });
        Assert.True(sentence[1] is { Text: "\"", Type: SentenceItemType.Punctuation, GlueNext: true });
        Assert.True(sentence[2] is { Text: "цудоўны", GlueNext: true });
        Assert.True(sentence[3] is { Text: "\"", Type: SentenceItemType.Punctuation, GlueNext: false });
    }

    [Fact]
    public void ToSentences_MultipleSeparators_CreatesMultipleSentences()
    {
        var tokens = Tokenizer.Parse("першае.  другое!");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0][0] is { Text: "першае", GlueNext: true });
        Assert.True(result[0][1] is { Text: ".", Type: SentenceItemType.Punctuation, GlueNext: false });
        Assert.True(result[1][0] is { Text: "другое", GlueNext: true });
        Assert.True(result[1][1] is { Text: "!", Type: SentenceItemType.Punctuation });
    }

    [Fact]
    public void ToSentences_Ellipsis_GluesEllipsis()
    {
        var tokens = Tokenizer.Parse("слова...");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Equal(2, sentence.Count);
        Assert.True(sentence[0] is { Text: "слова", GlueNext: true });
        Assert.True(sentence[1] is { Text: "...", Type: SentenceItemType.Punctuation });
    }

    [Fact]
    public void ToSentences_ComplexSentence_HandlesCorrectly()
    {
        var tokens = Tokenizer.Parse("пайшоў...лесам");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Equal(2, result.Count);
        var sentence0 = result[0];
        Assert.Equal(2, sentence0.Count);
        Assert.True(sentence0[0] is { Text: "пайшоў", GlueNext: true });
        Assert.True(sentence0[1] is { Text: "...", Type: SentenceItemType.Punctuation, GlueNext: false });

        var sentence1 = result[1];
        Assert.Single(sentence1);
        Assert.True(sentence1[0] is { Text: "лесам", GlueNext: false });
    }

    [Fact]
    public void ToSentences_PunctuationOnly_HandlesCorrectly()
    {
        var tokens = Tokenizer.Parse("...");

        var result = Sentencer.ToSentences(tokens).ToList();

        Assert.Single(result);
        var sentence = result[0];
        Assert.Single(sentence);
        Assert.True(sentence[0] is { Text: "...", Type: SentenceItemType.Punctuation });
    }
}

