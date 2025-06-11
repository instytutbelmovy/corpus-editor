namespace Editor;

public record LinguisticItem(
    string Text,
    SentenceItemType Type,
    bool GlueNext = false,
    ParadigmFormId? paradigmFormId = null,
    string? Lemma = null,
    LinguisticTag? LinguisticTag = null,
    string? Comment = null,
    LinguisticItemMetadata? Metadata = null
) : SentenceItem(Text, Type, GlueNext)
{
    public static LinguisticItem FromSentenceItem(SentenceItem sentenceItem)
        => new(sentenceItem.Text, sentenceItem.Type, sentenceItem.GlueNext);
}

public record LinguisticItemMetadata(ParadigmFormId? Suggested, DateOnly? ResolvedOn);