using Editor.Services.Converters;

namespace Editor.Tests;

public class DocumentConverterTests
{
    [Fact]
    public void GetParagraphs_NumbersSentencesWithinEachParagraph()
    {
        var reader = new FakeDocumentReader([
            "Першы сказ. Другі сказ.",
            "Трэці сказ. Чацьверты сказ. Пяты сказ.",
        ]);

        var paragraphs = DocumentConverter.GetParagraphs(Stream.Null, reader);

        Assert.Equal([1, 2], paragraphs.Select(p => p.Id));
        // Нумарацыя сказаў пачынаецца нанова ў кожным параграфе: EditingService.MarkupWord трактуе Id сказу як індэкс у параграфе, таму скразная нумарацыя ламала праўку.
        Assert.Equal([1, 2], paragraphs[0].Sentences.Select(s => s.Id));
        Assert.Equal([1, 2, 3], paragraphs[1].Sentences.Select(s => s.Id));
    }

    [Fact]
    public void GetParagraphs_ReadsTheSourceOnlyOnce()
    {
        var reader = new FakeDocumentReader(["Адзін сказ."]);

        var paragraphs = DocumentConverter.GetParagraphs(Stream.Null, reader);

        // Вынік мусіць быць ужо матэрыялізаваны.
        _ = paragraphs.Count;
        _ = paragraphs.SelectMany(p => p.Sentences).ToList();
        _ = paragraphs.SelectMany(p => p.Sentences).ToList();

        Assert.Equal(1, reader.ReadCount);
    }

    [Fact]
    public void GetParagraphs_GivesEverySentenceItsOwnConcurrencyStamp()
    {
        var reader = new FakeDocumentReader(["Першы сказ. Другі сказ."]);

        var paragraphs = DocumentConverter.GetParagraphs(Stream.Null, reader);

        var stamps = paragraphs.SelectMany(p => p.Sentences).Select(s => s.ConcurrencyStamp).ToList();
        Assert.Equal(stamps.Count, stamps.Distinct().Count());
        Assert.DoesNotContain(Guid.Empty, stamps);
    }

    private sealed class FakeDocumentReader(IReadOnlyList<string> paragraphs) : IDocumentReader
    {
        public int ReadCount;

        public IEnumerable<string> Read(Stream stream)
        {
            ReadCount++;
            return paragraphs;
        }
    }
}
