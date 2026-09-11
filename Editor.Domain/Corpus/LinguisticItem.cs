namespace Editor.Domain.Corpus;

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

public record LinguisticItemMetadata(
    ParadigmFormId? Suggested,
    DateOnly? ResolvedOn,
    LinguisticErrorType ErrorType = LinguisticErrorType.None,
    ResolutionSource ResolvedBy = ResolutionSource.NotResolved);

public enum ResolutionSource
{
    NotResolved = 0,

    /// <summary> Рэдактар выбраў форму ўручную. </summary>
    Human = 1,

    /// <summary> Слова было вырашанае да таго, як зьявілася гэтае поле: пры чытаньні старых файлаў крыніцу ўжо не аднавіць. </summary>
    Unknown = 10,

    /// <summary> ГрамБаза дала адзінага кандыдата - двухсэнсоўнасьці не было. </summary>
    GrammarDb = 20,

    /// <summary>
    /// Кандыдатаў было некалькі, і да аднаго іх звузіла часьціна мовы ад Stanza.
    /// Дакладнасьць мадэлі ~83%, таму такія словы - першыя кандыдаты на пераправерку.
    /// </summary>
    Stanza = 30,
}

public enum LinguisticErrorType
{
    None = 0,
    Lexical = 5,
    Orthoepic = 10,
    Formational = 15,
    Stylistic = 20,
    Grammatical = 25,
}