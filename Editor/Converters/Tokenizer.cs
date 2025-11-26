using System.Text;

namespace Editor.Converters;

public enum TokenType
{
    AlphaNumeric = 1,
    NonAlphaNumeric = 2,
    WordSeparator = 3,
    SentenceSeparator = 3,
    LineBreak = 4,
}

public record Token(string Text, TokenType Type);

public static class Tokenizer
{
    public static IEnumerable<Token> Parse(string line)
    {
        var currentWord = new StringBuilder();
        var currentTail = new StringBuilder();
        Token? wordToken, tailToken;
        var yieldQueue = new List<Token>(2);

        var i = 0;
        while (i < line.Length)
        {
            var ch = line[i];

            if (ch is '\n' or '\r')
            {
                CloseWord();
                if (wordToken is not null)
                {
                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }
                    yieldQueue.Add(wordToken);
                }
                if (tailToken is not null)
                {
                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }
                    yieldQueue.Add(tailToken);
                }

                if (yieldQueue.Count == 2)
                {
                    yield return yieldQueue[0];
                    yieldQueue.RemoveAt(0);
                }

                yieldQueue.Add(new Token("", TokenType.LineBreak));
                if (i + 1 < line.Length && line[i + 1] is '\n' or '\r' && line[i + 1] != ch)
                    ++i;
            }
            else if (ch == '.' || ch == '?' || ch == '!')
            {
                if (currentWord.Length == 0 && currentTail.Length == 0 && yieldQueue.Count > 1 && yieldQueue[^1].Type == TokenType.SentenceSeparator)
                {
                    var prev = yieldQueue[^2];
                    if (prev.Type == TokenType.NonAlphaNumeric)
                    {
                        prev = prev with { Text = prev.Text + ch };
                        yieldQueue[^2] = prev;
                    }
                }
                else
                {
                    AppendTailCharacter(ch);
                    CloseWord();
                    if (wordToken is not null)
                    {
                        if (yieldQueue.Count == 2)
                        {
                            yield return yieldQueue[0];
                            yieldQueue.RemoveAt(0);
                        }
                        yieldQueue.Add(wordToken);
                    }
                    if (tailToken is not null)
                    {
                        if (yieldQueue.Count == 2)
                        {
                            yield return yieldQueue[0];
                            yieldQueue.RemoveAt(0);
                        }
                        yieldQueue.Add(tailToken);
                    }

                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }
                    yieldQueue.Add(new Token("", TokenType.SentenceSeparator));
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
                    if (wordToken is not null)
                    {
                        if (yieldQueue.Count == 2)
                        {
                            yield return yieldQueue[0];
                            yieldQueue.RemoveAt(0);
                        }
                        yieldQueue.Add(wordToken);
                    }
                    if (tailToken is not null)
                    {
                        if (yieldQueue.Count == 2)
                        {
                            yield return yieldQueue[0];
                            yieldQueue.RemoveAt(0);
                        }
                        yieldQueue.Add(tailToken);
                    }
                }
                currentWord.Append(ch);
            }
            else if (char.IsWhiteSpace(ch))
            {
                CloseWord();
                if (wordToken is not null)
                {
                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }
                    yieldQueue.Add(wordToken);
                }
                if (tailToken is not null)
                {
                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }
                    yieldQueue.Add(tailToken);
                }

                // coalesce multiple whitespace characters into a single word separator
                if (yieldQueue.Count == 0 || yieldQueue[^1].Type is not TokenType.WordSeparator and not TokenType.SentenceSeparator)
                {
                    if (yieldQueue.Count == 2)
                    {
                        yield return yieldQueue[0];
                        yieldQueue.RemoveAt(0);
                    }

                    yieldQueue.Add(new Token("", TokenType.WordSeparator));
                }
            }
            else
            {
                AppendTailCharacter(ch);
            }

            i++;
        }

        CloseWord();

        for (int j = 0; j < yieldQueue.Count; j++)
            yield return yieldQueue[j];

        if (wordToken is not null)
            yield return wordToken;
        if (tailToken is not null)
            yield return tailToken;

        yield break;

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
            wordToken = null;
            tailToken = null;
            if (currentWord.Length > 0)
            {
                var word = currentWord.ToString();
                var normalizedWord = Normalizer.TokenizationNormalize(word);
                wordToken = new Token(normalizedWord, TokenType.AlphaNumeric);
            }

            if (currentTail.Length > 0)
                tailToken = new Token(currentTail.ToString(), TokenType.NonAlphaNumeric);

            currentWord.Clear();
            currentTail.Clear();
        }
    }
}