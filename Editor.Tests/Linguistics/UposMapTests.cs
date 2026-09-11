using Editor.Domain;
using Editor.Services.Linguistics;

namespace Editor.Tests.Linguistics;

public class UposMapTests
{
    private static readonly string[] AllUpos =
    [
        "NOUN", "PROPN", "ADJ", "VERB", "AUX", "ADV", "PRON", "DET",
        "NUM", "ADP", "CCONJ", "SCONJ", "PART", "INTJ", "SYM", "X", "PUNCT",
    ];

    [Fact]
    public void EveryAcceptableLetter_BelongsToTheGrammarDbAlphabet()
    {
        foreach (var upos in AllUpos)
            foreach (var letter in UposMap.Acceptable(upos).ToArray())
                Assert.Contains(letter, LinguisticTag.PosLetters);
    }

    [Theory]
    [InlineData("PUNCT")]
    [InlineData("SYM")]
    [InlineData("X")]
    [InlineData("NONSENSE")]
    [InlineData(null)]
    public void NonWordTags_HaveNoPrimaryLetter(string? upos)
    {
        Assert.Null(UposMap.Primary(upos));
        Assert.True(UposMap.Acceptable(upos).IsEmpty);
    }

    [Theory]
    [InlineData("NOUN", 'N')]
    [InlineData("PROPN", 'N')]
    [InlineData("ADJ", 'A')]
    [InlineData("VERB", 'V')]
    [InlineData("DET", 'S')]
    [InlineData("ADP", 'I')]
    public void Primary_IsTheDominantGoldLetter(string upos, char expected)
        => Assert.Equal(expected, UposMap.Primary(upos));

    [Fact]
    public void AcceptableSets_CoverTheCategoriesUdLacks()
    {
        // ГрамБаза мае катэгорыі, якіх у UD няма - адной літары было б мала
        Assert.Contains('P', UposMap.Acceptable("VERB").ToArray());   // дзеепрыметнік, 202 выпадкі
        Assert.Contains('W', UposMap.Acceptable("VERB").ToArray());   // прэдыкатыў, 196 выпадкаў
        Assert.Contains('M', UposMap.Acceptable("ADJ").ToArray());    // парадкавыя лічэбнікі, 156
        Assert.Contains('Z', UposMap.Acceptable("ADV").ToArray());    // пабочнае слова, 118
    }

    [Fact]
    public void Preference_OrdersByConfidence()
    {
        // Для ADJ прыметнік мацнейшы за лічэбнік, хоць абодва дапушчальныя
        Assert.True(UposMap.Preference("ADJ", 'A') < UposMap.Preference("ADJ", 'M'));
        Assert.Equal(0, UposMap.Preference("VERB", 'V'));
    }

    [Fact]
    public void Preference_IsNegative_ForUnacceptableLetters()
    {
        Assert.Equal(-1, UposMap.Preference("ADP", 'N'));
        Assert.Equal(-1, UposMap.Preference("NOUN", null));
        Assert.Equal(-1, UposMap.Preference("X", 'N'));
    }
}
