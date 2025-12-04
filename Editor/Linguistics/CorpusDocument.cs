namespace Editor;

public record CorpusDocumentHeader(int N, string? Title, string? Author, string? Language, string? PublicationDate, string? Url, string? Type, string? Style)
{
    public int? PercentCompletion { get; set; }
};

public record CorpusDocument(CorpusDocumentHeader Header, List<Paragraph> Paragraphs)
{
    public CorpusDocumentHeader Header { get; set; } = Header;
    public List<Paragraph> Paragraphs { get; set; } = Paragraphs;

    public int ComputeCompletion()
        => ComputeCompletion(Paragraphs);

    public static int ComputeCompletion(IEnumerable<Paragraph> paragraphs)
    {
        int completedWords = 0, totalWords = 0;
        foreach (var paragraph in paragraphs)
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
        List<Paragraph> replaceParagraphs = null!;
        for (int i = 0; i < document.Paragraphs.Count; i++)
        {
            var paragraph = document.Paragraphs[i];
            var updateParagraphId = paragraph.Id != i + 1;
            var updateParagraphStamp = paragraph.ConcurrencyStamp == default;
            List<Sentence> replaceSentences = null!;
            for (int j = 0; j < paragraph.Sentences.Count; j++)
            {
                var sentence = paragraph.Sentences[j];
                var updateSentenceId = sentence.Id != j + 1;
                var updateSentenceStamp = sentence.ConcurrencyStamp == default;
                var replaceSentence = updateSentenceId || updateSentenceStamp;

                if (replaceSentence)
                {
                    sentence = sentence with
                    {
                        Id = j + 1,
                        ConcurrencyStamp = updateSentenceId ? Guid.NewGuid() : sentence.ConcurrencyStamp,
                    };

                    replaceSentences ??= [..paragraph.Sentences.Take(j)];
                }

                if (replaceSentences != null)
                    replaceSentences.Add(sentence);
            }

            var replaceParagraph = updateParagraphId || updateParagraphStamp || replaceSentences != null;
            if (replaceParagraph)
            {
                paragraph = paragraph with
                {
                    Id = i + 1,
                    ConcurrencyStamp = updateParagraphStamp ? Guid.NewGuid() : paragraph.ConcurrencyStamp,
                    Sentences = replaceSentences ?? paragraph.Sentences,
                };

                replaceParagraphs ??= [..document.Paragraphs.Take(i)];
            }

            replaceParagraphs?.Add(paragraph);
        }

        return replaceParagraphs != null
            ? document with { Paragraphs = replaceParagraphs }
            : null;
    }
}

public record Paragraph(int Id, Guid ConcurrencyStamp, List<Sentence> Sentences);

public record Sentence(int Id, Guid ConcurrencyStamp, List<LinguisticItem> SentenceItems);