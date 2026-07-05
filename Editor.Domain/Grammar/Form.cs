namespace Editor;

/// <summary> Зваротны індэкс ГрамБазы: нармалізаваная форма → кандыдат (парадыгма, варыянт, тэг формы) </summary>
public class Form
{
    public required string NormalizedForm { get; set; }
    public int ParadigmId { get; set; }
    public required string VariantId { get; set; }
    public required string FormTag { get; set; }
}
