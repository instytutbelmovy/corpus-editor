namespace Editor.Converters;

public static class Sentencer
{
    public static IEnumerable<List<SentenceItem>> ToSentences(IEnumerable<Token> tokens)
    {
        var currentSentence = new List<SentenceItem>();
        var nextGlueable = false;

        foreach (var token in tokens)
        {
            switch (token.Type)
            {
                case TokenType.WordSeparator:
                    nextGlueable = false;
                    break;
                case TokenType.SentenceSeparator:
                {
                    nextGlueable = false;
                    if (currentSentence.Count > 0)
                    {
                        yield return currentSentence;
                        currentSentence = [];
                    }

                    break;
                }
                case TokenType.LineBreak:
                {
                    nextGlueable = false;
                    if (currentSentence.Count > 0)
                        currentSentence.Add(new SentenceItem("", SentenceItemType.LineBreak));

                    break;
                }
                case TokenType.AlphaNumeric:
                case TokenType.NonAlphaNumeric:
                {
                    if (string.IsNullOrEmpty(token.Text))
                        continue;
                    if (nextGlueable)
                        currentSentence[^1] = currentSentence[^1] with { GlueNext = true };
                    currentSentence.Add(new SentenceItem(token.Text, token.Type == TokenType.AlphaNumeric ? SentenceItemType.Word : SentenceItemType.Punctuation));
                    nextGlueable = true;
                    break;
                }
                default:
                    throw new ArgumentException($"Unexpected token type in {token}");
            }
        }

        if (currentSentence.Count > 0)
            yield return currentSentence;
    }
}