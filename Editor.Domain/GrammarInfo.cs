namespace Editor.Domain;

public record GrammarInfo(
    ParadigmFormId? ParadigmFormId,
    LinguisticTag LinguisticTag,
    string Lemma,
    string? Meaning
);
