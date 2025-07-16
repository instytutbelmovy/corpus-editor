using HtmlAgilityPack;

namespace Editor.Converters;

public sealed class EpubReader : IDocumentReader
{
    public IEnumerable<string> Read(Stream stream)
    {
        var epubBook = VersOne.Epub.EpubReader.ReadBook(stream);

        foreach (var chapter in epubBook.ReadingOrder)
        {
            var chapterParagraphs = ExtractParagraphs(chapter.Content);
            foreach (var paragraph in chapterParagraphs)
                yield return paragraph;
        }
    }

    private static IEnumerable<string> ExtractParagraphs(string htmlContent)
    {
        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(htmlContent);

        // Збіраем усе элементы
        var elements = htmlDoc.DocumentNode.SelectNodes("//p | //h1 | //h2 | //h3 | //h4 | //h5 | //h6 | //div");

        if (elements == null)
            yield break;

        for (int i = 0; i < elements.Count; i++)
        {
            var element = elements[i];

            // Правяраем, ці з'яўляецца блок паэзіяй
            if (IsPoetryBlock(element))
            {
                // Збіраем усе радкі паэзіі ў адзін параграф
                var poetryLines = new List<string>();

                // Праходзім па ўсіх наступных элементах, пакуль не сустрэнем не-паэзію
                while (i < elements.Count && IsPoetryBlock(elements[i]))
                {
                    // Збіраем усе параграфы ўнутры блока паэзіі
                    var paragraphElements = elements[i].SelectNodes(".//p");
                    if (paragraphElements != null)
                    {
                        foreach (var p in paragraphElements)
                        {
                            var text = p.InnerText.Trim();
                            if (!string.IsNullOrEmpty(text))
                            {
                                poetryLines.Add(text);
                            }
                        }
                    }
                    i++;
                }

                if (poetryLines.Count > 0)
                {
                    yield return string.Join("\n", poetryLines);
                }
                continue;
            }

            // Пропускаем параграфы ўнутры паэзіі
            if (element.Name == "p" && IsInsidePoetry(element))
            {
                continue;
            }

            // Звычайныя параграфы
            var elementText = element.InnerText.Trim();
            if (!string.IsNullOrEmpty(elementText) && !IsClearElement(element))
            {
                yield return elementText;
            }
        }
    }

    private static bool IsPoetryBlock(HtmlNode element)
    {
        var className = element.GetAttributeValue("class", "");
        if (className == "POETRY")
            return true;

        return element.SelectSingleNode(".//div[@class='POETRY']") != null;
    }

    private static bool IsInsidePoetry(HtmlNode element)
    {
        return element.SelectSingleNode("ancestor::div[@class='POETRY']") != null;
    }

    private static bool IsClearElement(HtmlNode element)
    {
        var className = element.GetAttributeValue("class", "");
        return className == "CLEAR";
    }
}