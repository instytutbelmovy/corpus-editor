using System.Text;

namespace Editor;

public static class Normalizer
{
    public const string CorrectStress = "\u0301";
    public const string GrammarDbStress = "+";
    public const string AllStresses = CorrectStress + "\u00b4";
    public const string CorrectApostrophe = "\u02bc";
    public const string AllApostrophes = CorrectApostrophe + "'\u2019";
    public const string Dash = "-";

    private static readonly Dictionary<char, char> GrammarSearchAggressiveNormalize;
    private static readonly Dictionary<char, char> GrammarSearchLightNormalize;
    private static readonly Dictionary<char, char> TypographicStressNormalize = new() { { GrammarDbStress[0], CorrectStress[0] } };

    [ThreadStatic]
    private static StringBuilder? _stringBuilder;

    static Normalizer()
    {
        var tokenizationNormalize = new Dictionary<char, char>();

        // Запаўненне базавых табліц
        for (int c = 0; c < 0x2020; c++)
        {
            if (char.IsLetterOrDigit((char)c))
            {
                tokenizationNormalize[(char)c] = (char)c;
            }
        }

        // Апострафы
        foreach (char c in AllApostrophes)
        {
            tokenizationNormalize[c] = CorrectApostrophe[0];
        }

        // Націскі
        foreach (char c in AllStresses)
        {
            tokenizationNormalize[c] = CorrectStress[0];
        }

        // Ангельская i ў беларускую
        tokenizationNormalize['i'] = 'і';
        tokenizationNormalize['I'] = 'І';

        // Злучкі
        tokenizationNormalize[Dash[0]] = Dash[0];

        var lowercaseNormalize = tokenizationNormalize.ToDictionary(
            kvp => kvp.Key,
            kvp => char.ToLowerInvariant(kvp.Value)
        );

        GrammarSearchAggressiveNormalize = new Dictionary<char, char>(lowercaseNormalize);
        GrammarSearchAggressiveNormalize['ў'] = 'у';
        GrammarSearchAggressiveNormalize['Ў'] = 'у';

        GrammarSearchLightNormalize = new Dictionary<char, char>(tokenizationNormalize);
        GrammarSearchLightNormalize[GrammarDbStress[0]] = CorrectStress[0];
    }

    public static string GrammarDbAggressiveNormalize(string word) => NormalizeWith(word, GrammarSearchAggressiveNormalize);

    public static string GrammarDbLightNormalize(string word) => NormalizeWith(word, GrammarSearchLightNormalize);
    
    public static string NormalizeTypographicStress(string word) => NormalizeOnly(word, TypographicStressNormalize);
    
    public static string TokinizationNormalize(string word) => NormalizeWith(word, GrammarSearchLightNormalize);
    
    public static bool IsApostrophe(char ch) => AllApostrophes.Contains(ch);
    
    public static bool IsLetter(char ch) => char.IsLetter(ch);

    private static string NormalizeWith(string word, Dictionary<char, char> mapping)
    {
        if (string.IsNullOrEmpty(word))
            return word;

        _stringBuilder ??= new ();
        _stringBuilder.Clear();
        bool somethingChanged = false;
        for (int i = 0; i < word.Length; i++)
        {
            if (mapping.TryGetValue(word[i], out var mapped))
            {
                _stringBuilder.Append(mapped);
                somethingChanged |= word[i] != mapped; 
            }
            else
                somethingChanged = true;
        }

        return somethingChanged ? _stringBuilder.ToString() : word;
    }

    private static string NormalizeOnly(string word, Dictionary<char, char> mapping)
    {
        if (string.IsNullOrEmpty(word))
            return word;

        _stringBuilder ??= new ();
        _stringBuilder.Clear();
        bool somethingChanged = false;
        for (int i = 0; i < word.Length; i++)
        {
            if (mapping.TryGetValue(word[i], out var mapped))
            {
                _stringBuilder.Append(mapped);
                somethingChanged = true; 
            }
            else
                _stringBuilder.Append(word[i]);
        }

        return somethingChanged ? _stringBuilder.ToString() : word;
    }
} 