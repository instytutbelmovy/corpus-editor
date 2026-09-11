namespace Editor.Services.Linguistics;

/// <summary>
/// Universal POS (Stanza) -> літары часьцін мовы ГрамБазы, у парадку зьніжэньня даверу.
///
/// Табліца пабудаваная з матрыцы памылак параўнаньня.(~44k токенаў ручной разьметкі).
///
/// Кожнаму UPOS адпавядае НАБОР літараў, а не адна.
/// У ГрамБазе ёсьць катэгорыі, якіх у UD няма (P дзеепрыметнік, W прэдыкатыў, Z пабочнае слова),
/// і адна літара сыстэматычна адкідала б правільнага кандыдата: напр. UD пазначае парадкавыя лічэбнікі як ADJ, а ГрамБаза - як M.
///
/// Першая літара - асноўная: яна ідзе ў тэг словам, якіх у ГрамБазе няма.
/// </summary>
public static class UposMap
{
    /// <summary>
    /// Дапушчальныя літары часьцін мовы. Пусты вынік - гэта не паўнавартаснае слова (PUNCT/SYM/X) ці невядомы тэг: тады падказка не ўжываецца зусім.
    /// </summary>
    public static ReadOnlySpan<char> Acceptable(string? upos) => upos switch
    {
        "NOUN" => "NAM",    // N 7512; субстантываваныя прыметнікі A 24; лічэбнікі-назоўнікі M 14
        "PROPN" => "N",     // N 539
        "ADJ" => "APMNW",   // A 2419; M 156 (парадкавыя лічэбнікі); N 139; W 29; P 23
        "VERB" => "VPWA",   // V 4050; P 202 дзеепрыметнік; W 196 прэдыкатыў; A 85
        "AUX" => "VWE",     // V 544; E 100
        "ADV" => "RZEC",    // R 2092; E 356; C 126; Z 118
        "PRON" => "SENC",   // S 2245; E 384; N 316; C 59
        "DET" => "SNMA",    // S 1491 (93%) - UD-азначальнікі тут займеннікавыя; N 60; M 26
        "NUM" => "MSR",     // M 142; S 34; R 19
        "ADP" => "I",       // I 3150 (96%)
        "CCONJ" => "CE",    // C 1748; E 59
        "SCONJ" => "CES",   // C 996; E 56; S 32
        "PART" => "EC",     // E 1313; C 41
        "INTJ" => "YE",     // Y 11; E 3
        // SYM: усе 63 выпадкі - золата PUNCT. X: 52 з 54 наогул без разьметкі. Літары F (часткі слоў) у матрыцы няма ніводнага разу.
        _ => "",
    };

    /// <summary>
    /// Асноўная літара, ці null калі гэта не паўнавартаснае слова.
    /// </summary>
    public static char? Primary(string? upos)
    {
        var acceptable = Acceptable(upos);
        return acceptable.IsEmpty ? null : acceptable[0];
    }

    /// <summary> Парадак перавагі: чым менш, тым лепш. -1 - літара непрыймальная. </summary>
    public static int Preference(string? upos, char? posLetter)
        => posLetter is null ? -1 : Acceptable(upos).IndexOf(posLetter.Value);
}
