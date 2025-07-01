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

    [GeneratedRegex(@"^\s*([\w.]*)(?:\|([\w.]*))?\s*$")]
    private static partial Regex ParsingRegex();
}