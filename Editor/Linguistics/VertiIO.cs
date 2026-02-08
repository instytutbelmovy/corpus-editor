using System.Xml.Linq;
using System.Text.Json;

namespace Editor;

public static class VertiIO
{
    private static ILogger? _logger;
    private const string Punct = "PUNCT";
    private const string LineBreakTag = "<lb/>";
    private const string GlueTag = "<g/>";

    public static void InitializeLogging(ILogger logger) => _logger = logger;

    public static bool TryReadHeader(string line, out CorpusDocumentHeader header)
    {
        header = default!;
        if (!line.StartsWith("<doc"))
            return false;

        header = ReadCorpusDocumentHeader(line);
        return true;
    }

    public static async Task<List<CorpusDocumentHeader>> GetDocumentHeaders(string folder)
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
                    if (TryReadHeader(line, out var doc))
                    {
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

    public static async Task<CorpusDocument> ReadDocument(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {filePath} not found");
        }

        using var reader = new StreamReader(filePath);
        
        return await ReadDocument(reader);
    }

    public static async Task<CorpusDocument> ReadDocument(StreamReader reader)
    {
        List<Paragraph> paragraphs = new ();
        CorpusDocument document = new CorpusDocument(default, paragraphs);
        Paragraph currentParagraph = null!;
        Sentence currentSentence = null!;

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (line.StartsWith("<!--")) continue;

            if (line.StartsWith("<doc"))
            {
                document = document with {
                    Header = ReadCorpusDocumentHeader(line),
                };
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
                    SentenceItems: new List<LinguisticItem>()
                );
            }
            else if (line == "</s>")
            {
                currentParagraph.Sentences.Add(currentSentence);
            }
            else if (line == LineBreakTag)
            {
                currentSentence.SentenceItems.Add(new LinguisticItem("", SentenceItemType.LineBreak));
            }
            else if (line == GlueTag)
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
                        var paradigmFormId = ParadigmFormId.FromString(parts[1]);
                        var lemma = parts.Length > 2 ? parts[2] : null;
                        var linguisticTag = LinguisticTag.FromString(parts.Length > 3 ? parts[3] : null);
                        var commentText = parts.Length > 4 ? parts[4] : null;
                        var comment = !string.IsNullOrEmpty(commentText) && (commentText[0] == '"' && commentText[^1] == '"' || commentText[0] == '\'' && commentText[^1] == '\'')
                            ? JsonSerializer.Deserialize(commentText, VertiJsonSerializerContext.Default.String)
                            : commentText;

                        var metadata = parts.Length > 5 && !string.IsNullOrEmpty(parts[5])
                            ? JsonSerializer.Deserialize(parts[5], VertiJsonSerializerContext.Default.LinguisticItemMetadata)
                            : null;

                        var item = new LinguisticItem(
                            Text: text,
                            Type: SentenceItemType.Word,
                            ParadigmFormId: paradigmFormId,
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

    public static async Task WriteDocument(string filePath, CorpusDocument document)
    {
        try
        {
            await using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
            await WriteDocument(fileStream, document);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error writing file {File}", filePath);
            throw;
        }
    }

    public static async Task WriteDocument(Stream stream, CorpusDocument document)
    {
        await using var writer = new StreamWriter(stream, System.Text.Encoding.UTF8, leaveOpen: true);

        // Запіс метададзеных
        await writer.WriteLineAsync(CreateDocumentHeaderXml(document.Header));

        // Запіс параграфаў
        foreach (var paragraph in document.Paragraphs)
        {
            var pAttrs = new List<string>();
            if (paragraph.Id != 0)
                pAttrs.Add($"id=\"{paragraph.Id}\"");
            if (paragraph.ConcurrencyStamp != Guid.Empty)
                pAttrs.Add($"concurrency_stamp=\"{paragraph.ConcurrencyStamp}\"");

            await writer.WriteAsync($"<p{(pAttrs.Count == 0 ? "" : " ")}{string.Join(" ", pAttrs)}>\n");

            foreach (var sentence in paragraph.Sentences)
            {
                var sAttrs = new List<string>();
                if (sentence.Id != 0)
                    sAttrs.Add($"id=\"{sentence.Id}\"");
                if (sentence.ConcurrencyStamp != Guid.Empty)
                    sAttrs.Add($"concurrency_stamp=\"{sentence.ConcurrencyStamp}\"");

                await writer.WriteAsync($"<s{(sAttrs.Count == 0 ? "" : " ")}{string.Join(" ", sAttrs)}>\n");

                foreach (var item in sentence.SentenceItems)
                {
                    if (item.Type == SentenceItemType.Word)
                    {
                        await writer.WriteAsync(item.Text);
                        var metadataJson = item.Metadata != null
                            ? JsonSerializer.Serialize(item.Metadata, VertiJsonSerializerContext.Default.LinguisticItemMetadata)
                            : "";
                        var commentJson = !string.IsNullOrWhiteSpace(item.Comment)
                            ? JsonSerializer.Serialize(item.Comment, VertiJsonSerializerContext.Default.String)
                            : "";

                        await writer.WriteAsync($"\t{item.ParadigmFormId}\t{item.Lemma}\t{item.LinguisticTag}\t{commentJson}\t{metadataJson}");
                        await writer.WriteLineAsync();
                        if (item.GlueNext)
                            await writer.WriteLineAsync(GlueTag);
                    }
                    else if (item.Type == SentenceItemType.Punctuation)
                    {
                        await writer.WriteLineAsync($"{item.Text}\t{Punct}");
                    }
                    else if (item.Type == SentenceItemType.LineBreak)
                    {
                        await writer.WriteLineAsync(LineBreakTag);
                    }
                    else
                    {
                        throw new ArgumentException($"Невядомы тып элемэнта: {item.Type}");
                    }
                }
                await writer.WriteLineAsync("</s>");
            }
            await writer.WriteLineAsync("</p>");
        }

        if (document.Header.Title != null)
            await writer.WriteLineAsync("</doc>");
        
        await writer.FlushAsync();
    }

    public static async Task UpdateDocumentHeader(string filePath, CorpusDocumentHeader header)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {filePath} not found");
        }

        var tempFilePath = Path.GetTempFileName();
        using (var reader = new StreamReader(filePath))
        await using (var writer = new StreamWriter(tempFilePath, false, System.Text.Encoding.UTF8))
        {
            while (await reader.ReadLineAsync() is { } line)
            {
                if (line.StartsWith("<doc"))
                {
                    await writer.WriteLineAsync(CreateDocumentHeaderXml(header));
                    break;
                }
                else
                    await writer.WriteLineAsync(line);
            }

            while (await reader.ReadLineAsync() is { } line)
                await writer.WriteLineAsync(line);
        }

        File.Move(tempFilePath, filePath, overwrite: true);
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
            Style: docXml.Attribute("style")?.Value,
            Corpus: docXml.Attribute("corpus")?.Value
        )
        {
            PercentCompletion = int.TryParse(docXml.Attribute("percent_completion")?.Value, out var percentCompletion) ? percentCompletion : null
        };
        return corpusDocumentHeader;
    }

    private static string CreateDocumentHeaderXml(CorpusDocumentHeader header)
    {
        var docElement = new XElement("doc");
        docElement.SetAttributeValue("n", header.N);
        if (header.Title != null)
            docElement.SetAttributeValue("title", header.Title);
        if (header.Author != null)
            docElement.SetAttributeValue("author", header.Author);
        if (header.Language != null)
            docElement.SetAttributeValue("language", header.Language);
        if (header.PublicationDate != null)
            docElement.SetAttributeValue("publication_date", header.PublicationDate);
        if (header.Url != null)
            docElement.SetAttributeValue("url", header.Url);
        if (header.Type != null)
            docElement.SetAttributeValue("type", header.Type);
        if (header.Style != null)
            docElement.SetAttributeValue("style", header.Style);
        if (header.Corpus != null)
            docElement.SetAttributeValue("corpus", header.Corpus);
        if (header.PercentCompletion != null)
            docElement.SetAttributeValue("percent_completion", header.PercentCompletion);

        var docString = docElement.ToString();
        return docString[..^2] + ">";
    }
}

