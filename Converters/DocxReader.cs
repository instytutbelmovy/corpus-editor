using System.Text;
using DocumentFormat.OpenXml.Packaging;
using WordParagraph = DocumentFormat.OpenXml.Wordprocessing.Paragraph;
using WordRun = DocumentFormat.OpenXml.Wordprocessing.Run;
using WordText = DocumentFormat.OpenXml.Wordprocessing.Text;

namespace Editor.Converters;

public sealed class DocxReader : IDocumentReader
{
    public IEnumerable<string> Read(Stream stream)
    {
        using var document = WordprocessingDocument.Open(stream, false);

        if (document.MainDocumentPart?.Document?.Body == null)
            throw new InvalidOperationException("Немагчыма прачытаць DOCX файл");

        var builder = new System.Text.StringBuilder();
        var body = document.MainDocumentPart.Document.Body;
        if (body != null)
            return body
                .Elements<WordParagraph>()
                .Select(x => GetParagraphText(x, builder))
                .Where(text => !string.IsNullOrWhiteSpace(text));

        return Enumerable.Empty<string>();
    }

    private static string GetParagraphText(WordParagraph paragraph, StringBuilder builder)
    {
        builder.Clear();

        foreach (var run in paragraph.Elements<WordRun>())
            foreach (var textElement in run.Elements<WordText>())
                builder.Append(textElement.Text);

        return builder.ToString().Trim();
    }
}