using System.Xml.Linq;

namespace Editor;

public static class VertiIO
{
    private static ILogger? _logger;

    public static void Initialize(ILogger logger) => _logger = logger;

    public static async Task<List<CorpusDocumentHeader>> GetDocuments(string folder)
    {
        var documents = new List<CorpusDocumentHeader>();
        var files = Directory.GetFiles(folder, "*.verti");

        foreach (var file in files)
        {
            try
            {
                using var reader = new StreamReader(file);
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (line.StartsWith("<!--")) continue;

                    if (line.StartsWith("<doc"))
                    {
                        var doc = ReadCorpusDocumentHeader(line);
                        documents.Add(doc);
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error reading file {File}", file);
            }
        }

        return documents;
    }

    public static async Task<CorpusDocument> ReadDocument(string folder, int id)
    {
        var filePath = Path.Combine(folder, $"{id}.verti");
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {filePath} not found");
        }

        CorpusDocument document = null!;
        List<Paragraph> paragraphs = null!;
        Paragraph currentParagraph = null!;
        Sentence currentSentence = null!;

        using var reader = new StreamReader(filePath);
        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (line.StartsWith("<!--")) continue;

            if (line.StartsWith("<doc"))
            {
                document = new CorpusDocument(
                    ReadCorpusDocumentHeader(line),
                    paragraphs = new ()
                );
            }
            else if (line.StartsWith("<p"))
            {
                var closeIndex = line.LastIndexOf('>');
                var pXml = XElement.Parse(line[..closeIndex] + "/>");
                currentParagraph = new Paragraph(
                    Id: int.Parse(pXml.Attribute("id")?.Value ?? "0"),
                    ConcurrencyStamp: Guid.TryParse(pXml.Attribute("concurrency_stamp")?.Value, out var stamp) ? stamp : Guid.Empty,
                    Sentences: new List<Sentence>()
                );
            }
            else if (line == "</p>")
            {
                paragraphs.Add(currentParagraph);
            }
            else if (line.StartsWith("<s"))
            {
                var closeIndex = line.LastIndexOf('>');
                var sXml = XElement.Parse(line[..closeIndex] + "/>");
                currentSentence = new Sentence(
                    Id: int.Parse(sXml.Attribute("id")?.Value ?? "0"),
                    ConcurrencyStamp: Guid.TryParse(sXml.Attribute("concurrency_stamp")?.Value, out var stamp) ? stamp : Guid.Empty,
                    SentenceItems: new List<SentenceItem>()
                );
            }
            else if (line == "</s>")
            {
                currentParagraph.Sentences.Add(currentSentence);
            }
            else if (line == "<g/>")
            {
                currentSentence.SentenceItems.Add(new LinguisticItem("", SentenceItemType.LineBreak));
            }
            else if (line == "<g>")
            {
                if (currentSentence.SentenceItems.Count > 0)
                {
                    var lastItem = currentSentence.SentenceItems[^1];
                    currentSentence.SentenceItems[^1] = lastItem with { GlueNext = true };
                }
            }
            else if (!line.StartsWith("</"))
            {
                var parts = line.Split('\t');
                if (parts.Length >= 2)
                {
                    if (parts[1] == "PUNCT")
                    {
                        currentSentence.SentenceItems.Add(new LinguisticItem(parts[0], SentenceItemType.Punctuation));
                    }
                    else
                    {
                        var text = parts[0];
                        var paradigmaFormId = ParadigmFormId.FromString(parts[1]);
                        var lemma = parts.Length > 2 ? parts[2] : null;
                        var linguisticTag = LinguisticTag.FromString(parts.Length > 3 ? parts[3] : null);
                        var comment = parts.Length > 4 ? parts[4] : null;
                        var metadata = parts.Length > 5 && !string.IsNullOrEmpty(parts[5]) ? parts[5] : null;

                        var item = new LinguisticItem(
                            Text: text,
                            Type: SentenceItemType.Word,
                            ParadigmaFormId: paradigmaFormId,
                            Lemma: lemma,
                            LinguisticTag: linguisticTag,
                            Comment: comment,
                            Metadata: metadata
                        );
                        currentSentence.SentenceItems.Add(item);
                    }
                }
            }
        }

        return document;
    }

    private static CorpusDocumentHeader ReadCorpusDocumentHeader(string line)
    {
        var closeIndex = line.LastIndexOf('>');
        var docXml = XElement.Parse(line[..closeIndex] + "/>");
        var corpusDocumentHeader = new CorpusDocumentHeader(
            N: int.Parse(docXml.Attribute("n")?.Value ?? "0"),
            Title: docXml.Attribute("title")?.Value,
            Author: docXml.Attribute("author")?.Value,
            Language: docXml.Attribute("language")?.Value,
            PublicationDate: docXml.Attribute("publication_date")?.Value,
            Url: docXml.Attribute("url")?.Value,
            Type: docXml.Attribute("type")?.Value,
            Style: docXml.Attribute("style")?.Value
        );
        return corpusDocumentHeader;
    }
}

