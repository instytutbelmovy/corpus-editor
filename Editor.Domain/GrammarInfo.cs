namespace Editor;

public record GrammarInfo(
    ParadigmFormId? ParadigmFormId,
    LinguisticTag LinguisticTag,
    string Lemma,
    string? Meaning
);
