using Editor.Domain;
using Editor.Domain.Grammar;

namespace Editor.Tests.Linguistics;

public class LocalGrammarTests
{
    [Fact]
    public void GrammarIds_IsLocal_SplitsAtBase()
    {
        Assert.False(GrammarIds.IsLocal(GrammarIds.LocalParadigmIdBase - 1));
        Assert.True(GrammarIds.IsLocal(GrammarIds.LocalParadigmIdBase));
        Assert.True(GrammarIds.IsLocal(GrammarIds.LocalParadigmIdBase + 42));
    }

    [Fact]
    public void ParadigmFormId_RoundTrips_LocalId()
    {
        // Зарэзэрваваны дыяпазон застаецца ў межах int і серыялізуецца тым жа фарматам "{id}{variant}.{tag}"
        var original = new ParadigmFormId(GrammarIds.LocalParadigmIdBase + 123, "a", "NMSNN");

        var text = original.ToString();
        Assert.Equal("1000000123a.NMSNN", text);

        var parsed = ParadigmFormId.FromString(text);
        Assert.Equal(original, parsed);
    }
}
