using Editor.Domain.Corpus;

namespace Editor.Services.Converters;

public static class DocumentConverter
{
    public static List<Paragraph> GetParagraphs(Stream stream, IDocumentReader reader)
    {
        var paragraphTexts = reader.Read(stream);

        var paragraphId = 1;
        var paragraphs = new List<Paragraph>();

        foreach (var paragraphText in paragraphTexts)
        {
            var sentences = new List<Sentence>();

            // Нумарацыя сказаў - у межах параграфу: EditingService трактуе Id сказу як індэкс у параграфе
            var sentenceId = 1;

            var tokens = Tokenizer.Parse(paragraphText);
            var sentenceTokens = Sentencer.ToSentences(tokens);

            foreach (var sentenceTokenList in sentenceTokens)
            {
                var sentenceItems = sentenceTokenList.Select(item => new LinguisticItem(item.Text, item.Type, item.GlueNext)).ToList();
                var sentence = new Sentence(sentenceId++, Guid.NewGuid(), sentenceItems);
                sentences.Add(sentence);
            }

            var paragraph = new Paragraph(paragraphId++, Guid.NewGuid(), sentences);
            paragraphs.Add(paragraph);
        }

        return paragraphs;
    }
}