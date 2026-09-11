using Editor.Domain.Grammar;
using FluentValidation;

namespace Editor.Services.Grammar;

public record ParadigmCreateVm(string Lemma, string Tag, string? Meaning, List<VariantInput> Variants);
public record VariantInput(string Id, string Lemma, string Tag, List<FormInput> Forms);
public record FormInput(string Tag, string Value);

public record ParadigmResponse(int ParadigmId, string Lemma, string Tag, string? Meaning, ParadigmSource Source, bool Hidden, List<VariantResponse> Variants, int? CopiedFromParadigmId);
public record VariantResponse(string Id, string Lemma, string Tag, List<FormResponse> Forms);
public record FormResponse(string Tag, string Value);

public record CreatedParadigmResponse(int ParadigmId);

public class ParadigmCreateVmValidator : AbstractValidator<ParadigmCreateVm>
{
    public ParadigmCreateVmValidator()
    {
        RuleFor(x => x.Lemma).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Tag).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Variants).NotEmpty();
        RuleFor(x => x.Variants)
            .Must(vs => vs == null || vs.Select(v => v.Id).Distinct().Count() == vs.Count)
            .WithMessage("Ідэнтыфікатары варыянтаў мусяць быць унікальныя");
        RuleForEach(x => x.Variants).ChildRules(v =>
        {
            // Адна малая літара - каб ParadigmFormId round-trip-аваўся праз рэгэкс [a-z]?
            v.RuleFor(y => y.Id).Matches("^[a-z]$").WithMessage("Id варыянту мусіць быць адной малой лацінскай літарай (a-z)");
            v.RuleFor(y => y.Lemma).NotEmpty().MaximumLength(200);
            v.RuleFor(y => y.Tag).MaximumLength(50);
            v.RuleFor(y => y.Forms).NotEmpty();
            v.RuleForEach(y => y.Forms).ChildRules(f =>
            {
                // Нязьменныя часьціны мовы маюць пусты тэг формы.
                f.RuleFor(z => z.Tag).NotNull().MaximumLength(50);
                f.RuleFor(z => z.Value).NotEmpty().MaximumLength(200);
            });
        });
    }
}
