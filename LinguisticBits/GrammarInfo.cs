namespace Editor;

public record GrammarInfo(
    ParadigmFormId ParadigmFormId,
    int ParadigmLine,
    int FormLine,
    LinguisticTag LinguisticTag,
    string FileName,
    string Lemma,
    string NormalizedLemma,
    string Meaning,
    Dictionary<string, string>? Properties = null,
    List<string>? FormDescription = null
);