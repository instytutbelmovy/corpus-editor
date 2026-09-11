using System.Text;
using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Corpus;

namespace Editor.Tests.Linguistics;

public class VertiResolutionSourceTests
{
    private static async Task<CorpusDocument> Read(string metadataJson)
    {
        var verti = string.Join('\n',
            """<doc n="1" title="T">""",
            """<p id="1">""",
            """<s id="1">""",
            $"кот\t1a.NMSNN\tкот\tNMS|NMSNN\t\t{metadataJson}",
            "</s>",
            "</p>",
            "</doc>");

        using var reader = new StreamReader(new MemoryStream(Encoding.UTF8.GetBytes(verti)));
        return await VertiIO.ReadDocument(reader);
    }

    private static LinguisticItem FirstWord(CorpusDocument document)
        => document.Paragraphs[0].Sentences[0].SentenceItems[0];

    [Fact]
    public async Task ResolvedWordWithoutSource_IsBackfilledAsUnknown()
    {
        // Файлы, зробленыя да зьяўленьня ResolvedBy, поля не маюць зусім
        var document = await Read("""{"suggested":null,"resolvedOn":"2025-01-01"}""");

        var metadata = FirstWord(document).Metadata;
        Assert.Equal(new DateOnly(2025, 1, 1), metadata?.ResolvedOn);
        Assert.Equal(ResolutionSource.Unknown, metadata?.ResolvedBy);
    }

    [Fact]
    public async Task UnresolvedWord_IsNotBackfilled()
    {
        var document = await Read("""{"suggested":null,"resolvedOn":null}""");

        Assert.Equal(ResolutionSource.NotResolved, FirstWord(document).Metadata?.ResolvedBy);
    }

    [Fact]
    public async Task ExistingSource_IsPreserved()
    {
        var document = await Read("""{"suggested":null,"resolvedOn":"2026-09-08","resolvedBy":1}""");

        Assert.Equal(ResolutionSource.Human, FirstWord(document).Metadata?.ResolvedBy);
    }

    [Fact]
    public async Task SuggestionSurvivesTheRoundTrip()
    {
        var document = await Read("""{"suggested":{"paradigmId":7,"variantId":"b","formTag":"NMSGN"},"resolvedOn":null}""");

        var suggested = FirstWord(document).Metadata?.Suggested;
        Assert.Equal(new ParadigmFormId(7, "b", "NMSGN"), suggested);
    }

    [Fact]
    public async Task WrittenDocument_KeepsResolutionSource()
    {
        var item = new LinguisticItem("кот", SentenceItemType.Word,
            ParadigmFormId: new ParadigmFormId(1, "a", "NMSNN"),
            Lemma: "кот",
            LinguisticTag: new LinguisticTag("NMS", "NMSNN"),
            Metadata: new LinguisticItemMetadata(null, new DateOnly(2026, 9, 8), ResolvedBy: ResolutionSource.Stanza));

        var document = new CorpusDocument(
            new CorpusDocumentHeader(1, "T", null, null, null, null, null, null, null),
            [new Paragraph(1, Guid.NewGuid(), [new Sentence(1, Guid.NewGuid(), [item])])]);

        using var buffer = new MemoryStream();
        await VertiIO.WriteDocument(buffer, document);
        buffer.Position = 0;

        using var reader = new StreamReader(buffer);
        var reloaded = await VertiIO.ReadDocument(reader);

        Assert.Equal(ResolutionSource.Stanza, FirstWord(reloaded).Metadata?.ResolvedBy);
    }
}
