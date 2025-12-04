
namespace Editor.Tests.Endpoints;

public class EditingTests
{
    private readonly Func<Paragraph, ParagraphView> _mapParagraphToView = p => new ParagraphView(p) { Sentences = p.Sentences.Select(s => new SentenceView(s) { SentenceItems = s.SentenceItems.Select(i => new LinguisticItemView(i, [])) }) };

    [Fact]
    public void EditDocumentCore_ThrowsNotFound_WhenParagraphDoesNotExist()
    {
        var document = CreateDocument(paragraphCount: 3);
        var request = new DocumentEditRequest([new() { ParagraphId = 5, OperationType = OperationType.Delete }]);

        Assert.Throws<NotFoundException>(() => Editing.EditDocumentCore(document, request, _mapParagraphToView));
    }

    [Fact]
    public void EditDocumentCore_ThrowsConflict_WhenConcurrencyStampMismatch_Update()
    {
        var document = CreateDocument(paragraphCount: 3);
        var request = new DocumentEditRequest([
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Update,
                ConcurrencyStamp = Guid.NewGuid(), // Mismatch
                ReplacementSentences = []
            },
        ]);

        Assert.Throws<ConflictException>(() => Editing.EditDocumentCore(document, request, _mapParagraphToView));
    }

    [Fact]
    public void EditDocumentCore_ThrowsConflict_WhenConcurrencyStampMismatch_Delete()
    {
        var document = CreateDocument(paragraphCount: 3);
        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = Guid.NewGuid() // Mismatch
            }
        });

        Assert.Throws<ConflictException>(() => Editing.EditDocumentCore(document, request, _mapParagraphToView));
    }

    [Fact]
    public void EditDocumentCore_CreatesParagraph_WhenOperationIsCreate()
    {
        var document = CreateDocument(paragraphCount: 3);
        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("word", SentenceItemType.Word)]]
            }
        });

        var response = Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(4, document.Paragraphs.Count);
        AssertConsecutiveIds(document);
        Assert.Single(response.EditedParagraphs);
        Assert.Equal(2, response.EditedParagraphs[0].Id);
        Assert.Single(response.EditedParagraphs[0].Sentences);
        Assert.Single(response.EditedParagraphs[0].Sentences.First().SentenceItems);
        Assert.Equal("word", response.EditedParagraphs[0].Sentences.First().SentenceItems.First().LinguisticItem.Text);
        Assert.Equal("word", document.Paragraphs[1].Sentences[0].SentenceItems[0].Text);
    }

    [Fact]
    public void EditDocumentCore_UpdatesParagraph_WhenOperationIsUpdate()
    {
        var document = CreateDocument(paragraphCount: 3);
        var targetParagraph = document.Paragraphs[1]; // Paragraph id 2
        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Update,
                ConcurrencyStamp = targetParagraph.ConcurrencyStamp,
                ReplacementSentences = [[new LinguisticItem("word", SentenceItemType.Word)]]
            }
        });

        var response = Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(3, document.Paragraphs.Count);
        AssertConsecutiveIds(document);
        Assert.NotEqual(targetParagraph.ConcurrencyStamp, document.Paragraphs[1].ConcurrencyStamp); // Should have new stamp
        Assert.Single(response.EditedParagraphs);
        Assert.Equal("word", response.EditedParagraphs[0].Sentences.First().SentenceItems.First().LinguisticItem.Text);
        Assert.Equal("word", document.Paragraphs[1].Sentences[0].SentenceItems[0].Text);
    }

    [Fact]
    public void EditDocumentCore_DeletesParagraph_WhenOperationIsDelete()
    {
        var document = CreateDocument(paragraphCount: 3);
        var previousLastStamp = document.Paragraphs[^1].ConcurrencyStamp;
        var targetParagraph = document.Paragraphs[1]; // Paragraph id 2
        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = targetParagraph.ConcurrencyStamp
            }
        });

        var response = Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(2, document.Paragraphs.Count);
        AssertConsecutiveIds(document);
        Assert.Empty(response.EditedParagraphs);
        Assert.Equal(previousLastStamp, document.Paragraphs[^1].ConcurrencyStamp);
    }

    [Fact]
    public void EditDocumentCore_HandlesMixedOperations_Correctly()
    {
        var document = CreateDocument(paragraphCount: 5);
        var p2 = document.Paragraphs[1];
        var p5 = document.Paragraphs[4];

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Delete P2
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = p2.ConcurrencyStamp
            },
            // Insert last
            new()
            {
                ParagraphId = 5,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("word", SentenceItemType.Word)]]
            }
        });


        var response = Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(5, document.Paragraphs.Count);
        AssertConsecutiveIds(document);
        Assert.Equal(p5.ConcurrencyStamp, document.Paragraphs[3].ConcurrencyStamp); // after deletion of P2, P5 becomes P4

        Assert.Single(response.EditedParagraphs);
        Assert.Equal(5, response.EditedParagraphs[0].Id);
    }

    [Fact]
    public void EditDocumentCore_Handles_UpdateP1_DeleteP2_CreateP3()
    {
        var document = CreateDocument(paragraphCount: 3);
        var p1 = document.Paragraphs[0];
        var p2 = document.Paragraphs[1];

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Update P1
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Update,
                ConcurrencyStamp = p1.ConcurrencyStamp,
                ReplacementSentences = [[new LinguisticItem("updated", SentenceItemType.Word)]]
            },
            // Delete P2
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = p2.ConcurrencyStamp
            },
            // Create P3
            new()
            {
                ParagraphId = 3,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("created", SentenceItemType.Word)]]
            }
        });

        var response = Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(3, document.Paragraphs.Count);
        AssertConsecutiveIds(document);

        // P1 updated
        Assert.Equal("updated", document.Paragraphs[0].Sentences[0].SentenceItems[0].Text);
        // P2 deleted, so old P3 is now P2
        // New P3 created
        Assert.Equal("created", document.Paragraphs[2].Sentences[0].SentenceItems[0].Text);

        Assert.Equal(2, response.EditedParagraphs.Count); // Update P1, Create P3
        Assert.Equal(1, response.EditedParagraphs[0].Id);
        Assert.Equal(3, response.EditedParagraphs[1].Id);
    }

    [Fact]
    public void EditDocumentCore_Handles_CreateP1_CreateP2()
    {
        var document = CreateDocument(paragraphCount: 2);
        var p1 = document.Paragraphs[0];

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Create P1 (Insert at 0)
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("new1", SentenceItemType.Word)]]
            },
            // Create P2 (Insert at 1)
            new()
            {
                ParagraphId = 2,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("new2", SentenceItemType.Word)]]
            }
        });

        Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(4, document.Paragraphs.Count);
        AssertConsecutiveIds(document);

        // Expected: [New1, New2, Old1, Old2]
        Assert.Equal("new1", document.Paragraphs[0].Sentences[0].SentenceItems[0].Text);
        Assert.Equal("new2", document.Paragraphs[1].Sentences[0].SentenceItems[0].Text);
        Assert.Equal(p1.ConcurrencyStamp, document.Paragraphs[2].ConcurrencyStamp);
    }

    [Fact]
    public void EditDocumentCore_Handles_DeleteP1_DeleteP2()
    {
        var document = CreateDocument(paragraphCount: 3);
        var p1 = document.Paragraphs[0];
        var p2 = document.Paragraphs[1];
        var p3 = document.Paragraphs[2];

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Delete P1
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = p1.ConcurrencyStamp
            },
            // Delete P1 (Original P2)
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = p2.ConcurrencyStamp
            }
        });

        Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Single(document.Paragraphs);
        AssertConsecutiveIds(document);
        // Only P3 remains
        Assert.Equal(p3.ConcurrencyStamp, document.Paragraphs[0].ConcurrencyStamp);
    }

    [Fact]
    public void EditDocumentCore_Handles_CreateP1_UpdateP3_DeleteP4()
    {
        var document = CreateDocument(paragraphCount: 3);
        // [P1(1w), P2(2w), P3(3w)]
        var p1 = document.Paragraphs[0]; // Will be P2 after Create P1
        var p2 = document.Paragraphs[1]; // Will be P3 after Create P1
        var p3 = document.Paragraphs[2]; // Will be P4 after Create P1

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Create P1
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("new", SentenceItemType.Word)]]
            },
            // Update P3 (Original P2)
            new()
            {
                ParagraphId = 3,
                OperationType = OperationType.Update,
                ConcurrencyStamp = p2.ConcurrencyStamp,
                ReplacementSentences = [[new LinguisticItem("updated", SentenceItemType.Word)]]
            },
            // Delete P4 (Original P3)
            new()
            {
                ParagraphId = 4,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = p3.ConcurrencyStamp
            }
        });

        Editing.EditDocumentCore(document, request, _mapParagraphToView);

        Assert.Equal(3, document.Paragraphs.Count);
        AssertConsecutiveIds(document);
        // [NewP1, P1, UpdatedP2]
        Assert.Equal("new", document.Paragraphs[0].Sentences[0].SentenceItems[0].Text);
        Assert.Equal(p1.ConcurrencyStamp, document.Paragraphs[1].ConcurrencyStamp);
        Assert.Equal("updated", document.Paragraphs[2].Sentences[0].SentenceItems[0].Text);
    }

    [Fact]
    public void EditDocumentCore_ThrowsNotFound_WhenCreateIsTooFar()
    {
        var document = CreateDocument(paragraphCount: 2);
        // [P1, P2]

        var request = new DocumentEditRequest(new List<ParagraphOperation>
        {
            // Delete P1
            new()
            {
                ParagraphId = 1,
                OperationType = OperationType.Delete,
                ConcurrencyStamp = document.Paragraphs[0].ConcurrencyStamp
            },
            // Create P3
            new()
            {
                ParagraphId = 3,
                OperationType = OperationType.Create,
                ReplacementSentences = [[new LinguisticItem("new", SentenceItemType.Word)]]
            }
        });

        Assert.Throws<NotFoundException>(() => Editing.EditDocumentCore(document, request, _mapParagraphToView));
    }

    private static void AssertConsecutiveIds(CorpusDocument document)
    {
        for (var i = 0; i < document.Paragraphs.Count; i++)
        {
            Assert.Equal(i + 1, document.Paragraphs[i].Id);
        }
    }

    private static CorpusDocument CreateDocument(int paragraphCount)
    {
        var paragraphs = Enumerable.Range(1, paragraphCount)
            .Select(i => CreateParagraph(i, i))
            .ToList();

        return new CorpusDocument(
            new CorpusDocumentHeader(1, "Title", "Author", "Language", "Date", "Url", "Type", "Style"),
            paragraphs
        );
    }

    private static Paragraph CreateParagraph(int id, int sentenceCount)
    {
        var sentences = Enumerable.Range(1, sentenceCount)
            .Select(i => CreateSentence(i, i))
            .ToList();

        return new Paragraph(id, Guid.NewGuid(), sentences);
    }

    private static Sentence CreateSentence(int id, int wordCount)
    {
        var sentenceItems = Enumerable.Range(1, wordCount)
            .Select(i => new LinguisticItem($"word{i}", SentenceItemType.Word))
            .ToList();
        return new Sentence(id, Guid.NewGuid(), sentenceItems);
    }
}
