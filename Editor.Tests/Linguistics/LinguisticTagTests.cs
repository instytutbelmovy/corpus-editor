using Editor.Domain;

namespace Editor.Tests.Linguistics;

public class LinguisticTagTests
{
    [Fact]
    public void IntersectWith_IsSymmetric()
    {
        var kot = new LinguisticTag("NMS", "NMSNN");
        var kata = new LinguisticTag("NFS", "NMSGN");

        Assert.Equal(kot.IntersectWith(kata), kata.IntersectWith(kot));
    }

    [Fact]
    public void IntersectWith_KeepsCommonCharacters_AndDotsTheRest()
    {
        var result = new LinguisticTag("NMS", "NMSNN").IntersectWith(new LinguisticTag("NFS", "NMSGN"));

        Assert.NotNull(result);
        Assert.Equal("N.S", result.ParadigmTag);
        Assert.Equal("NMS.N", result.FormTag);
    }

    [Fact]
    public void IntersectWith_DifferentPartsOfSpeech_DropsParadigmTag()
    {
        var result = new LinguisticTag("NMS", "NMSNN").IntersectWith(new LinguisticTag("VMS", "NMSNN"));

        Assert.NotNull(result);
        Assert.Null(result.ParadigmTag);
        Assert.Equal("NMSNN", result.FormTag);
    }

    [Fact]
    public void IntersectWith_NothingInCommon_ReturnsNull()
    {
        // Розныя часьціны мовы і няма формавага тэгу з абодвух бакоў - агульнага не застаецца зусім
        Assert.Null(new LinguisticTag("NMS").IntersectWith(new LinguisticTag("VMS")));
    }

    [Fact]
    public void IntersectWith_DifferentLengths_PadsToLongest()
    {
        var result = new LinguisticTag("NMS", "NN").IntersectWith(new LinguisticTag("NMS", "NNXX"));

        Assert.NotNull(result);
        Assert.Equal("NMS", result.ParadigmTag);
        Assert.Equal("NN..", result.FormTag);
    }

    [Fact]
    public void IntersectWith_Null_ReturnsNull()
    {
        Assert.Null(new LinguisticTag("NMS", "NMSNN").IntersectWith(null));
    }

    [Fact]
    public void PartOfSpeechOnlyTag_RoundTrips()
    {
        // Форма, у якой апынуцца словы па-за ГрамБазай: толькі літара часьціны мовы, без формавага тэгу
        var tag = new LinguisticTag("N");

        Assert.Equal("N|", tag.ToString());
        Assert.Equal('N', tag.Pos());
        Assert.Equal(tag, LinguisticTag.FromString(tag.ToString()));
    }

    [Fact]
    public void Pos_IsNull_WhenParadigmTagStartsWithDot()
    {
        // Пасьля перасячэньня розных часьцін мовы першы сымбаль можа стаць кропкай
        Assert.Null(new LinguisticTag(".MS", "NMSNN").Pos());
    }
}
