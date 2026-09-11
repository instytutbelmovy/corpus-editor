using System.Text;
using Editor.Domain;

namespace Editor.Services.Linguistics;

/// <summary>
/// Прыводзіць токен корпусу да выгляду, на якім навучаная мадэль UD_Belarusian-HSE.
///
/// Tokenizer захоўвае словы пасьля Normalizer.TokenizationNormalize, таму ў тэксьце сустракаюцца націск U+0301, апостраф U+02BC і службовая зорачка.
///
/// Літара "ў" наўмысна застаецца: GrammarDbAggressiveNormalize замяніў бы яе на "у", а Stanza гэтую літару ведае.
/// </summary>
public static class StanzaTextNormalizer
{
    /// <summary>
    /// Чым замяняецца токен, ад якога пасьля чысткі нічога не засталося.
    /// Пусты радок зламаў бы tokenize_pretokenized, а выраўноўваньне па індэксах трымаецца на нязьменнай колькасьці токенаў. Вынік для такіх пазыцый адкідаецца.
    /// </summary>
    public const string Placeholder = "·";

    /// <summary> Вяртае ачышчаны токен, або null - калі не засталося нічога. </summary>
    public static string? Clean(string token)
    {
        if (string.IsNullOrEmpty(token))
            return null;

        var builder = new StringBuilder(token.Length);

        foreach (var ch in token)
        {
            if (Normalizer.AllStresses.Contains(ch))
                continue;

            // Службовыя пазнакі рэдактара - не частка слова
            if (ch is '*' or '[' or ']')
                continue;

            builder.Append(Normalizer.IsApostrophe(ch) ? '\'' : ch);
        }

        return builder.Length > 0 ? builder.ToString() : null;
    }
}
