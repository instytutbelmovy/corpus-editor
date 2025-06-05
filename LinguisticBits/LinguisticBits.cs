namespace Editor;

public record RegistryFile(int Id, int PercentCompletion, int PercentManualCompletion);

public record CorpusDocumentHeader(int N, string? Title, string? Author, string? Language, string? PublicationDate, string? Url, string? Type, string? Style);

public record CorpusDocument(CorpusDocumentHeader Header, IEnumerable<Paragraph> Paragraphs);
 
public record RegistryFileDto(int Id, string? Title, int PercentCompletion, int PercentManualCompletion);

public record Paragraph(int Id, Guid ConcurrencyStamp, List<Sentence> Sentences);

public record Sentence(int Id, Guid ConcurrencyStamp, List<SentenceItem> SentenceItems);