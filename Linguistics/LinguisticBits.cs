namespace Editor;

public record CorpusDocumentHeader(int N, string? Title, string? Author, string? Language, string? PublicationDate, string? Url, string? Type, string? Style, int? PercentCompletion = null);

public record CorpusDocument(CorpusDocumentHeader Header, List<Paragraph> Paragraphs)
{
    public int ComputeCompletion()
    {
        int completedWords = 0, totalWords = 0;
        foreach (var paragraph in Paragraphs)
        foreach (var sentence in paragraph.Sentences)
        foreach (var linguisticItem in sentence.SentenceItems.Where(x => x.Type == SentenceItemType.Word))
        {
            totalWords++;
            if (linguisticItem.Metadata is { ResolvedOn: not null })
                completedWords++;
        }

        if (totalWords == 0)
            return 100;

        return completedWords * 100 / totalWords;
    }

    public static CorpusDocument? CheckIdsAndConcurrencyStamps(CorpusDocument document)
    {
        var previousParagraphId = 0;
        List<Paragraph> replaceParagraphs = null;
        for (int i = 0; i < document.Paragraphs.Count; i++)
        {
            var paragraph = document.Paragraphs[i];
            var updateParagraphId = paragraph.Id <= previousParagraphId;
            var updateParagraphStamp = paragraph.ConcurrencyStamp == default;
            int previousSentenceId = 0;
            List<Sentence> replaceSentences = null;
            for (int j = 0; j < paragraph.Sentences.Count; j++)
            {
                var sentence = paragraph.Sentences[j];
                var updateSentenceId = sentence.Id <= previousSentenceId;
                var updateSentenceStamp = sentence.ConcurrencyStamp == default;
                var replaceSentence = updateSentenceId || updateSentenceStamp;

                if (replaceSentence)
                {
                    sentence = sentence with
                    {
                        Id = updateSentenceId ? previousSentenceId + 1 : sentence.Id,
                        ConcurrencyStamp = updateSentenceId ? Guid.NewGuid() : sentence.ConcurrencyStamp,
                    };

                    replaceSentences ??= [..paragraph.Sentences.Take(j)];
                }

                if (replaceSentences != null)
                    replaceSentences.Add(sentence);

                previousSentenceId = sentence.Id;
            }

            var replaceParagraph = updateParagraphId || updateParagraphStamp || replaceSentences != null;
            if (replaceParagraph)
            {
                paragraph = paragraph with
                {
                    Id = updateParagraphId ? previousParagraphId + 1 : paragraph.Id,
                    ConcurrencyStamp = updateParagraphStamp ? Guid.NewGuid() : paragraph.ConcurrencyStamp,
                    Sentences = replaceSentences ?? paragraph.Sentences,
                };

                replaceParagraphs ??= [..document.Paragraphs.Take(i)];
            }

            if (replaceParagraphs != null)
                replaceParagraphs.Add(paragraph);

            previousParagraphId = paragraph.Id;
        }

        return replaceParagraphs != null
            ? document with { Paragraphs = replaceParagraphs }
            : null;
    }
}

public record Paragraph(int Id, Guid ConcurrencyStamp, List<Sentence> Sentences);

public record Sentence(int Id, Guid ConcurrencyStamp, List<LinguisticItem> SentenceItems);