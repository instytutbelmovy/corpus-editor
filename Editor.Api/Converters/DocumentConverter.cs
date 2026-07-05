namespace Editor.Converters;

public static class DocumentConverter
{
    public static IEnumerable<Paragraph> GetParagraphs(Stream stream, IDocumentReader reader)
    {
        var paragraphTexts = reader.Read(stream);

        var paragraphId = 1;
        var sentenceId = 1;

        foreach (var paragraphText in paragraphTexts)
        {
            var sentences = new List<Sentence>();

            var tokens = Tokenizer.Parse(paragraphText);
            var sentenceTokens = Sentencer.ToSentences(tokens);

            foreach (var sentenceTokenList in sentenceTokens)
            {
                var sentenceItems = sentenceTokenList.Select(item => new LinguisticItem(item.Text, item.Type, item.GlueNext)).ToList();
                var sentence = new Sentence(sentenceId++, Guid.NewGuid(), sentenceItems);
                sentences.Add(sentence);
            }

            var paragraph = new Paragraph(paragraphId++, Guid.NewGuid(), sentences);
            yield return paragraph;
        }
    }
}