using System.Text;

namespace Editor.Converters;

public enum TokenType
{
    AlphaNumeric = 1,
    NonAlphaNumeric = 2,
    SentenceSeparator = 3,
    LineBreak = 4,
}

public record Token(string Text, TokenType Type);

public static class Tokenizer
{
    public static List<Token> Parse(string line)
    {
        var result = new List<Token>();
        var currentWord = new StringBuilder();
        var currentTail = new StringBuilder();

        void AppendTailCharacter(char ch)
        {
            if (currentTail.Length == 0)
            {
                while (currentWord.Length > 0)
                {
                    var lastChar = currentWord[^1];
                    if (Normalizer.IsApostrophe(lastChar) || lastChar == Normalizer.Dash[0])
                    {
                        currentWord.Remove(currentWord.Length - 1, 1);
                        currentTail.Insert(0, lastChar);
                    }
                    else
                    {
                        break;
                    }
                }
            }
            currentTail.Append(ch);
        }

        void CloseWord()
        {
            if (currentWord.Length > 0)
            {
                var word = currentWord.ToString();
                var normalizedWord = Normalizer.TokinizationNormalize(word);
                result.Add(new Token(normalizedWord, TokenType.AlphaNumeric));
            }

            if (currentTail.Length > 0)
            {
                result.Add(new Token(currentTail.ToString(), TokenType.NonAlphaNumeric));
            }

            currentWord.Clear();
            currentTail.Clear();
        }

        var lastNonSpaceIndex = line.Length - 1;
        while (lastNonSpaceIndex >= 0 && char.IsWhiteSpace(line[lastNonSpaceIndex]))
        {
            lastNonSpaceIndex--;
        }

        var i = 0;
        while (i < line.Length && char.IsWhiteSpace(line[i]))
        {
            i++;
        }

        while (i <= lastNonSpaceIndex)
        {
            var ch = line[i];

            if (ch == '\n')
            {
                CloseWord();
                result.Add(new Token("", TokenType.LineBreak));
            }
            else if (ch == '.' || ch == '?' || ch == '!')
            {
                if (currentWord.Length == 0 && currentTail.Length == 0 && result.Count > 0 && result[^1].Type == TokenType.SentenceSeparator)
                {
                    var prev = result[^2];
                    if (prev.Type == TokenType.NonAlphaNumeric)
                    {
                        prev = prev with { Text = prev.Text + ch };
                        result[^2] = prev;
                    }
                }
                else
                {
                    AppendTailCharacter(ch);
                    CloseWord();
                    result.Add(new Token("", TokenType.SentenceSeparator));
                }
            }
            else if (Normalizer.IsApostrophe(ch) || ch == Normalizer.Dash[0])
            {
                if (currentWord.Length > 0 && currentTail.Length == 0)
                {
                    currentWord.Append(ch);
                }
                else
                {
                    AppendTailCharacter(ch);
                }
            }
            else if (Normalizer.IsLetter(ch) || ch == '[' || ch == ']')
            {
                if (currentTail.Length > 0)
                {
                    CloseWord();
                }
                currentWord.Append(ch);
            }
            else
            {
                AppendTailCharacter(ch);
            }

            i++;
        }

        CloseWord();

        return result;
    }
} 