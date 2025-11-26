namespace Editor.Converters;

public static class Sentencer
{
    public static IEnumerable<List<SentenceItem>> ToSentences(IEnumerable<Token> tokens)
    {
        var currentSentence = new List<SentenceItem>();
        var nextGlueable = false;

        foreach (var token in tokens)
        {
            if (token.Type == TokenType.SentenceSeparator)
            {
                nextGlueable = false;
                if (currentSentence.Count > 0)
                {
                    yield return currentSentence;
                    currentSentence = new List<SentenceItem>();
                }
                continue;
            }

            if (token.Type == TokenType.LineBreak)
            {
                nextGlueable = false;
                if (currentSentence.Count > 0)
                {
                    currentSentence.Add(new SentenceItem("", SentenceItemType.LineBreak));
                }
                continue;
            }

            if (token.Type == TokenType.AlphaNumeric)
            {
                if (nextGlueable)
                {
                    var lastItem = currentSentence[^1];
                    currentSentence[^1] = lastItem with { GlueNext = true };
                }
                currentSentence.Add(new SentenceItem(token.Text, SentenceItemType.Word));
                nextGlueable = true;
            }
            else if (token.Type == TokenType.NonAlphaNumeric)
            {
                if (nextGlueable && !string.IsNullOrEmpty(token.Text) && !char.IsWhiteSpace(token.Text[0]))
                {
                    var lastItem = currentSentence[^1];
                    currentSentence[^1] = lastItem with { GlueNext = true };
                }
                nextGlueable = !string.IsNullOrEmpty(token.Text) && !char.IsWhiteSpace(token.Text[^1]);
                var strippedText = token.Text.Trim();
                if (!string.IsNullOrEmpty(strippedText))
                {
                    currentSentence.Add(new SentenceItem(strippedText, SentenceItemType.Punctuation));
                }
            }
        }

        if (currentSentence.Count > 0)
            yield return currentSentence;
    }
} 