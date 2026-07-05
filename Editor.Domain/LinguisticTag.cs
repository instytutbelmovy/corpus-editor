using System.Text;
using System.Text.RegularExpressions;

namespace Editor;

public partial record LinguisticTag(
    string? ParadigmTag,
    string? FormTag = null
)
{
    private const string Missing = ".";
    private const string DbMissing = "X";

    public char? Pos()
    {
        return !string.IsNullOrEmpty(ParadigmTag) && ParadigmTag.Length > 0 && ParadigmTag[0] != '.'
            ? ParadigmTag[0]
            : null;
    }

    public override string ToString() => $"{ParadigmTag ?? ""}|{FormTag ?? ""}";

    public static LinguisticTag? FromString(string? stringRepr)
    {
        if (string.IsNullOrEmpty(stringRepr))
            return null;

        var match = ParsingRegex().Match(stringRepr);
        if (!match.Success)
            return null;

        var paradigmTag = match.Groups[1].Value;
        var formTag = match.Groups[2].Value;

        paradigmTag = string.IsNullOrEmpty(paradigmTag) ? null : paradigmTag;
        formTag = string.IsNullOrEmpty(formTag) ? null : formTag;

        return new LinguisticTag(paradigmTag, formTag);
    }

    public LinguisticTag? IntersectWith(LinguisticTag? other)
    {
        if (other == null)
            return null;

        string? intersectedParadigmTag;
        if (string.IsNullOrEmpty(ParadigmTag) || string.IsNullOrEmpty(other.ParadigmTag))
            intersectedParadigmTag = null;
        else if (ParadigmTag[0] != other.ParadigmTag[0])
            // калі гэта розныя часьціны мовы, ня будзем спрабаваць знайсьці нічога агульнага
            intersectedParadigmTag = null;
        else
            intersectedParadigmTag = IntersectStrings(ParadigmTag, other.ParadigmTag);

        string? intersectedFormTag;
        if (string.IsNullOrEmpty(FormTag) || string.IsNullOrEmpty(other.FormTag))
            intersectedFormTag = null;
        else
            intersectedFormTag = IntersectStrings(FormTag, other.FormTag);

        if (intersectedParadigmTag == null && intersectedFormTag == null)
            return null;

        return new LinguisticTag(intersectedParadigmTag, intersectedFormTag);
    }

    private static string IntersectStrings(string str1, string str2)
    {
        var maxLen = Math.Max(str1.Length, str2.Length);

        var result = new StringBuilder();
        for (int i = 0; i < maxLen; i++)
        {
            var c1 = i < str1.Length ? str1[i] : Missing[0];
            var c2 = i < str1.Length ? str1[i] : Missing[0];
            result.Append(c1 == c2 ? c1 : Missing[0]);
        }

        return result.ToString();
    }

    [GeneratedRegex(@"^\s*([\w.]*)(?:\|([\w.]*))?\s*$")]
    private static partial Regex ParsingRegex();
}