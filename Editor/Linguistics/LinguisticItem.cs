namespace Editor;

public record LinguisticItem(
    string Text,
    SentenceItemType Type,
    bool GlueNext = false,
    ParadigmFormId? ParadigmFormId = null,
    string? Lemma = null,
    LinguisticTag? LinguisticTag = null,
    string? Comment = null,
    LinguisticItemMetadata? Metadata = null
) : SentenceItem(Text, Type, GlueNext)
{
    public static LinguisticItem FromSentenceItem(SentenceItem sentenceItem)
        => new(sentenceItem.Text, sentenceItem.Type, sentenceItem.GlueNext);
}

public record LinguisticItemMetadata(ParadigmFormId? Suggested, DateOnly? ResolvedOn, LinguisticErrorType ErrorType = LinguisticErrorType.None);

public enum LinguisticErrorType
{
    None = 0,
    Lexical = 5,
    Orthoepic = 10,
    Formational = 15,
    Stylistic = 20,
    Grammatical = 25,
}