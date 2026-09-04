namespace Editor.Domain.Grammar;

/// <summary> Адна парадыгма ГрамБазы; варыянты захоўваюцца як jsonb </summary>
public class Paradigm
{
    public int ParadigmId { get; set; }
    /// <summary> Лема ўзроўню парадыгмы (даведачная; лема варыянту - у Variants) </summary>
    public required string Lemma { get; set; }
    /// <summary>
    /// Лема ў выглядзе ключа пошуку (Normalizer.GrammarDbSearchNormalize) - калёнка пад прэфіксны індэкс.
    /// Запаўняецца на кожным запісе: канвэртэрам для апстрыму, GrammarEditRepository для лакальных парадыгмаў.
    /// </summary>
    public string LemmaNormalized { get; set; } = "";
    /// <summary> Неапрацаваны тэг узроўню парадыгмы (даведачны; эфэктыўны тэг - у Variants) </summary>
    public required string Tag { get; set; }
    public string? Meaning { get; set; }
    public List<ParadigmVariant> Variants { get; set; } = [];
    /// <summary> Крыніца: апстрым (пераімпартуецца) ці лакальная (уласная, перажывае пераімпарт) </summary>
    public ParadigmSource Source { get; set; } = ParadigmSource.Upstream;
}

public class ParadigmVariant
{
    public required string Id { get; set; }
    public required string Lemma { get; set; }
    /// <summary> Эфэктыўны тэг: тэг варыянту, або тэг парадыгмы калі ў варыянта яго няма (вылічаецца канвэртэрам) </summary>
    public required string Tag { get; set; }
    public List<ParadigmForm> Forms { get; set; } = [];
}

public class ParadigmForm
{
    public required string Tag { get; set; }
    /// <summary> Паверхневая форма з націскам (U+0301) </summary>
    public required string Value { get; set; }
}
