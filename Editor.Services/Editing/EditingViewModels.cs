using Editor.Domain;
using Editor.Domain.Corpus;
using FluentValidation;

namespace Editor.Services.Editing;

public record CorpusDocumentView(CorpusDocumentHeader Header, IEnumerable<ParagraphView> Paragraphs);

public record ParagraphView(int Id, Guid ConcurrencyStamp)
{
    public ParagraphView(Paragraph paragraph) : this(paragraph.Id, paragraph.ConcurrencyStamp)
    {
    }

    public required IEnumerable<SentenceView> Sentences { get; init; }
}

public record SentenceView(int Id, Guid ConcurrencyStamp)
{
    public SentenceView(Sentence sentence) : this(sentence.Id, sentence.ConcurrencyStamp) { }

    public required IEnumerable<LinguisticItemView> SentenceItems { get; init; }
}

public record LinguisticItemView(LinguisticItem LinguisticItem, IEnumerable<GrammarInfo> Options);

public record LemmaTag(string Lemma, string LinguisticTag);

public record UpdateMetadataRequest(
    string Title,
    string? Url,
    string? PublicationDate,
    string? Type,
    string? Style,
    string? Corpus
);

public record DocumentEditRequest(List<ParagraphOperation> Operations);

public record ParagraphOperation
{
    /// <summary> For Create operations, this is the ID at which the new paragraph will be inserted, shifting the paragraph that previously had this id to have ID = ID + 1 </summary>
    public required int ParagraphId { get; set; }
    public required OperationType OperationType { get; set; }

    /// <summary> Will be null only for deletion </summary>
    public List<List<LinguisticItem>>? ReplacementSentences { get; set; } = null;
    public Guid? ConcurrencyStamp { get; set; }
}

public enum OperationType
{
    Delete = -1,
    Update = 0,
    Create = 1,
}

public record DocumentEditResponse(IList<ParagraphView> EditedParagraphs);

public record IdShift(int Id, int Shift);

public class DocumentEditRequestValidator : AbstractValidator<DocumentEditRequest>
{
    public DocumentEditRequestValidator()
    {
        RuleFor(x => x.Operations).NotEmpty();
        RuleFor(x => x.Operations)
            .Must(x =>
            {
                var previousId = -1;
                var previousOperationType = (OperationType)42; // invalid
                foreach (var op in x)
                {
                    if (op.ParagraphId < previousId || (op.ParagraphId == previousId && previousOperationType != OperationType.Delete))
                        return false;
                    previousId = op.ParagraphId;
                    previousOperationType = op.OperationType;
                }
                return true;
            })
            .WithMessage($"{nameof(ParagraphOperation.ParagraphId)} must go in non-decreasing order, and can only equal previous if it's a {nameof(OperationType.Delete)}");
        RuleForEach(x => x.Operations).SetValidator(new ParagraphOperationValidator());
    }
}

public class ParagraphOperationValidator : AbstractValidator<ParagraphOperation>
{
    public ParagraphOperationValidator()
    {
        RuleFor(x => x.ParagraphId).GreaterThan(0);
        RuleFor(x => x.OperationType).IsInEnum();
        RuleFor(x => x.ReplacementSentences).NotEmpty().When(x => x.OperationType is OperationType.Create or OperationType.Update);
        RuleFor(x => x.ConcurrencyStamp).NotEmpty().When(x => x.OperationType == OperationType.Update);
    }
}

public class LinguisticItemValidator : AbstractValidator<LinguisticItem>
{
    public LinguisticItemValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Text).NotEmpty().When(x => x.Type is SentenceItemType.Word or SentenceItemType.Punctuation);
    }
}
