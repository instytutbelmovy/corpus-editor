using System.IO.Compression;
using System.Text;
using System.Xml.Linq;

namespace Editor.Converters;

public sealed class OdtReader : IDocumentReader
{
    private static readonly XNamespace TextNs = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
    private static readonly XNamespace OfficeNs = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";

    public IEnumerable<string> Read(Stream stream)
    {
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
        var contentEntry = archive.GetEntry("content.xml");
        if (contentEntry == null)
            throw new InvalidOperationException("Немагчыма прачытаць ODT файл: адсутнічае content.xml");

        using var contentStream = contentEntry.Open();
        var doc = XDocument.Load(contentStream);

        var officeText = doc.Descendants(OfficeNs + "text").FirstOrDefault();
        if (officeText == null)
            return Enumerable.Empty<string>();

        var result = new List<string>();
        var builder = new StringBuilder();

        foreach (var element in officeText.Elements())
            CollectParagraphs(element, result, builder);

        return result;
    }

    /// <summary>
    /// Recursively collects paragraph-level text from block elements.
    /// Handles: text:p, text:h (headings), text:list, text:list-item,
    /// text:section, and table cells.
    /// </summary>
    private static void CollectParagraphs(XElement element, List<string> result, StringBuilder builder)
    {
        var name = element.Name;

        if (name == TextNs + "p" || name == TextNs + "h")
        {
            builder.Clear();
            AppendInlineContent(element, builder);
            var text = builder.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(text))
                result.Add(text);
        }
        else if (name == TextNs + "list" ||
                 name == TextNs + "list-item" ||
                 name == TextNs + "section")
        {
            // Recurse into structural containers — their children
            // will contain the actual <text:p> elements.
            foreach (var child in element.Elements())
                CollectParagraphs(child, result, builder);
        }
        else
        {
            // For any other block-level element (e.g. tables),
            // try to find nested paragraphs.
            foreach (var child in element.Elements())
                CollectParagraphs(child, result, builder);
        }
    }

    /// <summary>
    /// Recursively appends inline content to the StringBuilder.
    /// Handles: plain text nodes, text:span, text:a (links),
    /// text:s (spaces), text:tab, text:line-break, text:note.
    /// </summary>
    private static void AppendInlineContent(XElement element, StringBuilder builder)
    {
        foreach (var node in element.Nodes())
        {
            if (node is XText textNode)
            {
                builder.Append(textNode.Value);
            }
            else if (node is XElement child)
            {
                var name = child.Name;

                if (name == TextNs + "s")
                {
                    // <text:s/> = single space, <text:s text:c="N"/> = N spaces
                    var countAttr = child.Attribute(TextNs + "c");
                    int count = countAttr != null ? int.Parse(countAttr.Value) : 1;
                    builder.Append(' ', count);
                }
                else if (name == TextNs + "tab")
                {
                    builder.Append('\t');
                }
                else if (name == TextNs + "line-break")
                {
                    builder.Append('\n');
                }
                else if (name == TextNs + "span" || name == TextNs + "a")
                {
                    // Inline containers — recurse into their content.
                    AppendInlineContent(child, builder);
                }
                else if (name == TextNs + "note")
                {
                    // Footnotes/endnotes: extract the note body text in parentheses.
                    var noteBody = child.Element(TextNs + "note-body");
                    if (noteBody != null)
                    {
                        var noteText = new StringBuilder();
                        foreach (var p in noteBody.Elements(TextNs + "p"))
                            AppendInlineContent(p, noteText);

                        var trimmed = noteText.ToString().Trim();
                        if (trimmed.Length > 0)
                        {
                            builder.Append(" (");
                            builder.Append(trimmed);
                            builder.Append(')');
                        }
                    }
                }
                else
                {
                    // Unknown inline element — try to extract its text content
                    // (covers elements like text:bookmark-ref, text:ruby, etc.)
                    AppendInlineContent(child, builder);
                }
            }
        }
    }
}
