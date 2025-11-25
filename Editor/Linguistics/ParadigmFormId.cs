using System.Text.RegularExpressions;

namespace Editor;

public partial record ParadigmFormId(
    int ParadigmId,
    string? VariantId = "a",
    string? FormTag = null
)
{
    public override string ToString()
    {
        return $"{ParadigmId}{VariantId ?? ""}.{FormTag ?? ""}";
    }

    public static ParadigmFormId? FromString(string? stringRepr)
    {
        if (string.IsNullOrEmpty(stringRepr))
            return null;

        var match = ParsingRegex().Match(stringRepr);
        if (!match.Success)
            return null;

        var paradigmIdStr = match.Groups[1].Value;
        var variantId = match.Groups[2].Value;
        var formTag = match.Groups[3].Value;

        var paradigmId = int.Parse(paradigmIdStr);
        variantId = string.IsNullOrEmpty(variantId) ? null : variantId;
        formTag = string.IsNullOrEmpty(formTag) ? null : formTag;

        return new ParadigmFormId(paradigmId, variantId, formTag);
    }

    public ParadigmFormId? IntersectWith(ParadigmFormId? other)
    {
        if (other == null)
            return null;

        var intersectedParadigmId = ParadigmId == other.ParadigmId ? ParadigmId : (int?)null;
        var intersectedVariantId = VariantId == other.VariantId && intersectedParadigmId.HasValue ? VariantId : null;
        var intersectedFormTag = FormTag == other.FormTag && intersectedParadigmId.HasValue ? FormTag : null;

        return intersectedParadigmId.HasValue
            ? new ParadigmFormId(intersectedParadigmId.Value, intersectedVariantId, intersectedFormTag)
            : null;
    }

    public ParadigmFormId UnionWith(ParadigmFormId? other)
    {
        if (other == null)
            return this;

        return new ParadigmFormId(
            ParadigmId != 0 ? ParadigmId : other.ParadigmId,
            VariantId ?? other.VariantId,
            FormTag ?? other.FormTag
        );
    }

    public virtual bool Equals(ParadigmFormId? other)
    {
        if (ReferenceEquals(null, other)) return false;
        if (ReferenceEquals(this, other)) return true;
        return ParadigmId == other.ParadigmId && VariantId == other.VariantId && FormTag == other.FormTag;
    }

    public override int GetHashCode() => HashCode.Combine(ParadigmId, VariantId, FormTag);

    public bool IsSingular() => VariantId != null && FormTag != null;

    [GeneratedRegex(@"^\s*(\d+)([a-z]?)(?:\.(.*))?\s*$")]
    private static partial Regex ParsingRegex();
}