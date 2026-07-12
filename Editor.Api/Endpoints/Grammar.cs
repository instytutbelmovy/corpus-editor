using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Editor;

public static class Grammar
{
    public static void MapGrammar(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/grammar");

        // Прагляд/пошук/рэдагаваньне ўласных парадыгмаў — роля Editor
        group.MapGet("/paradigms", SearchParadigms).Editor();
        group.MapGet("/paradigms/{id:int}", GetParadigm).Editor();
        group.MapPost("/paradigms", CreateParadigm).Validate<ParadigmInput>().Editor();
        group.MapPut("/paradigms/{id:int}", UpdateParadigm).Validate<ParadigmInput>().Editor();

        // Разбуральныя/глябальныя апэрацыі (уплываюць на пошук усіх) — роля Admin
        group.MapDelete("/paradigms/{id:int}", DeleteParadigm).Admin();
        group.MapPost("/paradigms/{id:int}/hide", HideParadigm).Admin();
        group.MapDelete("/paradigms/{id:int}/hide", UnhideParadigm).Admin();
    }

    private static async Task<List<ParadigmSummaryResponse>> SearchParadigms(
        [FromQuery] string query, IGrammarEditRepository repo, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new BadRequestException("Пусты запыт пошуку");

        var results = await repo.SearchParadigmsAsync(query.Trim(), limit: 50, cancellationToken);
        return results
            .Select(r => new ParadigmSummaryResponse(r.ParadigmId, r.Lemma, r.Tag, r.Source, r.Hidden))
            .ToList();
    }

    private static async Task<ParadigmResponse> GetParadigm(
        int id, IGrammarEditRepository repo, CancellationToken cancellationToken)
    {
        var detail = await repo.GetParadigmAsync(id, cancellationToken)
            ?? throw new NotFoundException("Парадыгма ня знойдзеная");
        return ToResponse(detail.Paradigm, detail.Hidden);
    }

    private static async Task<CreatedParadigmResponse> CreateParadigm(
        [FromBody] ParadigmInput input, IGrammarEditRepository repo, CancellationToken cancellationToken)
    {
        var id = await repo.CreateLocalParadigmAsync(ToEntity(input), cancellationToken);
        return new CreatedParadigmResponse(id);
    }

    private static async Task<ParadigmResponse> UpdateParadigm(
        int id, [FromBody] ParadigmInput input, IGrammarEditRepository repo, CancellationToken cancellationToken)
    {
        if (!GrammarIds.IsLocal(id))
            throw new BadRequestException("Рэдагаваць можна толькі ўласныя (лакальныя) парадыгмы");

        var existing = await repo.GetParadigmAsync(id, cancellationToken)
            ?? throw new NotFoundException("Парадыгма ня знойдзеная");

        var entity = ToEntity(input, id);
        await repo.UpdateLocalParadigmAsync(entity, cancellationToken);
        return ToResponse(entity, existing.Hidden);
    }

    private static async Task DeleteParadigm(
        int id, IGrammarEditRepository repo, CancellationToken cancellationToken)
    {
        if (!GrammarIds.IsLocal(id))
            throw new BadRequestException("Выдаляць можна толькі ўласныя (лакальныя) парадыгмы");
        await repo.DeleteLocalParadigmAsync(id, cancellationToken);
    }

    private static async Task HideParadigm(
        int id, ClaimsPrincipal user, IGrammarEditRepository repo, CancellationToken cancellationToken)
        => await repo.HideParadigmAsync(id, user.GetUserId(), cancellationToken);

    private static async Task UnhideParadigm(
        int id, IGrammarEditRepository repo, CancellationToken cancellationToken)
        => await repo.UnhideParadigmAsync(id, cancellationToken);

    // Уваход → сутнасьць: нармалізуем тыпаграфічны націск (як канвэртэр), эфэктыўны тэг варыянту з fallback на тэг парадыгмы
    private static Paradigm ToEntity(ParadigmInput input, int paradigmId = 0) => new()
    {
        ParadigmId = paradigmId,
        Lemma = Normalizer.NormalizeTypographicStress(input.Lemma),
        Tag = input.Tag,
        Meaning = string.IsNullOrWhiteSpace(input.Meaning) ? null : input.Meaning,
        Source = ParadigmSource.Local,
        Variants = input.Variants.Select(v => new ParadigmVariant
        {
            Id = v.Id,
            Lemma = Normalizer.NormalizeTypographicStress(v.Lemma),
            Tag = string.IsNullOrEmpty(v.Tag) ? input.Tag : v.Tag,
            Forms = v.Forms.Select(f => new ParadigmForm
            {
                Tag = f.Tag,
                Value = Normalizer.NormalizeTypographicStress(f.Value),
            }).ToList(),
        }).ToList(),
    };

    private static ParadigmResponse ToResponse(Paradigm p, bool hidden) => new(
        p.ParadigmId, p.Lemma, p.Tag, p.Meaning, p.Source, hidden,
        p.Variants.Select(v => new VariantResponse(v.Id, v.Lemma, v.Tag,
            v.Forms.Select(f => new FormResponse(f.Tag, f.Value)).ToList())).ToList());
}

public record ParadigmInput(string Lemma, string Tag, string? Meaning, List<VariantInput> Variants);
public record VariantInput(string Id, string Lemma, string Tag, List<FormInput> Forms);
public record FormInput(string Tag, string Value);

public record ParadigmResponse(int ParadigmId, string Lemma, string Tag, string? Meaning, ParadigmSource Source, bool Hidden, List<VariantResponse> Variants);
public record VariantResponse(string Id, string Lemma, string Tag, List<FormResponse> Forms);
public record FormResponse(string Tag, string Value);

public record ParadigmSummaryResponse(int ParadigmId, string Lemma, string Tag, ParadigmSource Source, bool Hidden);
public record CreatedParadigmResponse(int ParadigmId);

public class ParadigmInputValidator : AbstractValidator<ParadigmInput>
{
    public ParadigmInputValidator()
    {
        RuleFor(x => x.Lemma).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Tag).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Variants).NotEmpty();
        RuleFor(x => x.Variants)
            .Must(vs => vs.Select(v => v.Id).Distinct().Count() == vs.Count)
            .WithMessage("Ідэнтыфікатары варыянтаў мусяць быць унікальныя");
        RuleForEach(x => x.Variants).ChildRules(v =>
        {
            // Адна малая літара — каб ParadigmFormId round-trip-аваўся праз рэгэкс [a-z]?
            v.RuleFor(y => y.Id).Matches("^[a-z]$").WithMessage("Id варыянту мусіць быць адной малой лацінскай літарай (a-z)");
            v.RuleFor(y => y.Lemma).NotEmpty().MaximumLength(200);
            v.RuleFor(y => y.Tag).MaximumLength(50);
            v.RuleFor(y => y.Forms).NotEmpty();
            v.RuleForEach(y => y.Forms).ChildRules(f =>
            {
                f.RuleFor(z => z.Tag).NotEmpty().MaximumLength(50);
                f.RuleFor(z => z.Value).NotEmpty().MaximumLength(200);
            });
        });
    }
}
