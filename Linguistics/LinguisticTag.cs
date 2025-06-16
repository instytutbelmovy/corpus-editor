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
        {
            intersectedParadigmTag = null;
        }
        else if (ParadigmTag[0] != other.ParadigmTag[0])
        {
            // Different parts of speech
            intersectedParadigmTag = null;
        }
        else
        {
            intersectedParadigmTag = IntersectStrings(ParadigmTag, other.ParadigmTag);
        }

        string? intersectedFormTag;
        if (string.IsNullOrEmpty(FormTag) || string.IsNullOrEmpty(other.FormTag))
        {
            intersectedFormTag = null;
        }
        else
        {
            intersectedFormTag = IntersectStrings(FormTag, other.FormTag);
        }

        if (intersectedParadigmTag == null && intersectedFormTag == null)
            return null;

        return intersectedParadigmTag != null
            ? new LinguisticTag(intersectedParadigmTag, intersectedFormTag)
            : null;
    }

    public LinguisticTag UnionWith(LinguisticTag? other)
    {
        if (other == null)
            return this;

        string? unionedParadigmTag;
        if (string.IsNullOrEmpty(ParadigmTag) || string.IsNullOrEmpty(other.ParadigmTag))
        {
            unionedParadigmTag = ParadigmTag ?? other.ParadigmTag;
        }
        else if (ParadigmTag[0] != other.ParadigmTag[0])
        {
            // Different parts of speech - keeping first one
            unionedParadigmTag = ParadigmTag;
        }
        else
        {
            unionedParadigmTag = UnionStrings(ParadigmTag, other.ParadigmTag);
        }

        string? unionedFormTag;
        if (string.IsNullOrEmpty(FormTag) || string.IsNullOrEmpty(other.FormTag))
        {
            unionedFormTag = FormTag ?? other.FormTag;
        }
        else
        {
            unionedFormTag = UnionStrings(FormTag, other.FormTag);
        }

        return new LinguisticTag(unionedParadigmTag, unionedFormTag);
    }

    public string ToExpandedString()
    {
        var result = new string[30];
        var pos = !string.IsNullOrEmpty(ParadigmTag) && ParadigmTag.Length > 0 && ParadigmTag[0] != Missing[0]
            ? ParadigmTag[0].ToString()
            : "";

        void MapIntoResult(string? tag, Dictionary<int, (int, Dictionary<char, string>)> mapping)
        {
            if (tag == null) return;

            for (int index = 0; index < tag.Length; index++)
            {
                var ch = tag[index];
                if (ch != Missing[0] && ch != DbMissing[0] && mapping.ContainsKey(index))
                {
                    var (mapToIndex, valueMap) = mapping[index];
                    if (valueMap.ContainsKey(ch))
                        result[mapToIndex] = valueMap[ch];
                }
            }
        }

        var posMappingDict = new Dictionary<string, string>
        {
            {"N", "назоўнік"}, {"A", "прыметнік"}, {"M", "лічэбнік"}, {"S", "займеньнік"},
            {"V", "дзеяслоў"}, {"P", "дзеепрыметнік"}, {"R", "прыслоўе"}, {"C", "злучнік"},
            {"I", "прыназоўнік"}, {"E", "часціца"}, {"Y", "выклічнік"}, {"Z", "пабочнае слова"},
            {"W", "прэдыкатыў"}, {"F", "частка"}, {"K", "абрэвіятура"}
        };

        if (posMappingDict.ContainsKey(pos))
            result[1] = posMappingDict[pos];

        // Additional mapping logic would go here based on POS type
        // This is a simplified version - the full implementation would include
        // all the detailed mappings from the Python code

        return string.Join("\t", result.Skip(1));
    }

    private static string IntersectStrings(string str1, string str2)
    {
        var maxLen = Math.Max(str1.Length, str2.Length);
        str1 = str1.PadRight(maxLen);
        str2 = str2.PadRight(maxLen);

        var result = new StringBuilder();
        for (int i = 0; i < maxLen; i++)
        {
            result.Append(str1[i] == str2[i] ? str1[i] : Missing[0]);
        }
        return result.ToString();
    }

    private static string UnionStrings(string str1, string str2)
    {
        var maxLen = Math.Max(str1.Length, str2.Length);
        str1 = str1.PadRight(maxLen);
        str2 = str2.PadRight(maxLen);

        var result = new StringBuilder();
        for (int i = 0; i < maxLen; i++)
        {
            var c1 = str1[i];
            var c2 = str2[i];
            result.Append(c2 == Missing[0] ? c1 : c2);
        }
        return result.ToString();
    }

    [GeneratedRegex(@"^\s*([\w.]*)(?:\|([\w.]*))?\s*$")]
    private static partial Regex ParsingRegex();
}