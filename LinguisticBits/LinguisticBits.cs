namespace Editor;

public record CorpusDocumentHeader(int N, string? Title, string? Author, string? Language, string? PublicationDate, string? Url, string? Type, string? Style, int? PercentCompletion = null);

public record CorpusDocument(CorpusDocumentHeader Header, IEnumerable<Paragraph> Paragraphs)
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
}
 
public record RegistryFileDto(int Id, string? Title, int PercentCompletion);

public record Paragraph(int Id, Guid ConcurrencyStamp, List<Sentence> Sentences);

public record Sentence(int Id, Guid ConcurrencyStamp, List<LinguisticItem> SentenceItems);