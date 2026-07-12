namespace Editor;

/// <summary> Крыніца парадыгмы/формы: апстрым (з GrammarDB XML) ці ўласная (лакальная) </summary>
public enum ParadigmSource
{
    Upstream = 0,
    Local = 1,
}

public static class GrammarIds
{
    /// <summary>
    /// Пачатак зарэзэрваванага дыяпазону ідэнтыфікатараў для ўласных (лакальных) парадыгмаў.
    /// Апстрымныя pdgId заўсёды ніжэй за гэтую мяжу, таму дыяпазоны не перасякаюцца.
    /// int.MaxValue (~2.1 млрд) пакідае ~1.1 млрд лакальных ідэнтыфікатараў.
    /// </summary>
    public const int LocalParadigmIdBase = 1_000_000_000;

    public const string LocalParadigmIdSequence = "local_paradigm_id_seq";

    public static bool IsLocal(int paradigmId) => paradigmId >= LocalParadigmIdBase;
}

/// <summary>
/// Оверлэй схаваных парадыгмаў: асобная табліца (не калонка на paradigms), каб схаванасьць
/// апстрымнай парадыгмы перажывала пераімпарт, які выдаляе і перазапісвае апстрымныя радкі.
/// </summary>
public class HiddenParadigm
{
    public int ParadigmId { get; set; }
    public string? HiddenBy { get; set; }
    public DateTime HiddenAt { get; set; }
}
