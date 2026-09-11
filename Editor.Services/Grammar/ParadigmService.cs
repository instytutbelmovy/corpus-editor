using Editor.Domain;
using Editor.Domain.Grammar;
using Editor.Services.Exceptions;

namespace Editor.Services.Grammar;

public interface IParadigmService
{
    Task<List<ParadigmResponse>> SearchParadigms(string query, CancellationToken cancellationToken = default);
    Task<ParadigmResponse> GetParadigm(int id, CancellationToken cancellationToken = default);
    Task<CreatedParadigmResponse> CreateParadigm(ParadigmCreateVm createVm, CancellationToken cancellationToken = default);
    Task<ParadigmResponse> UpdateParadigm(int id, ParadigmCreateVm createVm, CancellationToken cancellationToken = default);
    Task DeleteParadigm(int id, CancellationToken cancellationToken = default);
    Task HideParadigm(int id, string? userId, CancellationToken cancellationToken = default);
    Task UnhideParadigm(int id, CancellationToken cancellationToken = default);
}

public class ParadigmService(IGrammarEditRepository grammarEditRepository) : IParadigmService
{
    /// <summary> Столькі парадыгмаў аддае пошук; фронт паказвае, што вынікі абрэзаныя, калі іх роўна столькі </summary>
    public const int SearchLimit = 50;

    public async Task<List<ParadigmResponse>> SearchParadigms(string query, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new BadRequestException("Пусты запыт пошуку");

        var results = await grammarEditRepository.SearchParadigms(query.Trim(), SearchLimit, cancellationToken);
        return results
            .Select(r => ToParadigmResponse(r.Paradigm, r.Hidden))
            .ToList();
    }

    public async Task<ParadigmResponse> GetParadigm(int id, CancellationToken cancellationToken = default)
    {
        var detail = await grammarEditRepository.GetParadigm(id, cancellationToken)
            ?? throw new NotFoundException("Парадыгма ня знойдзеная");
        return ToParadigmResponse(detail.Paradigm, detail.Hidden);
    }

    public async Task<CreatedParadigmResponse> CreateParadigm(ParadigmCreateVm createVm, CancellationToken cancellationToken = default)
    {
        var id = await grammarEditRepository.CreateLocalParadigm(ToParadigm(createVm), cancellationToken);
        return new CreatedParadigmResponse(id);
    }

    public async Task<ParadigmResponse> UpdateParadigm(int id, ParadigmCreateVm createVm, CancellationToken cancellationToken = default)
    {
        if (!GrammarIds.IsLocal(id))
            throw new BadRequestException("Рэдагаваць можна толькі ўласныя (лакальныя) парадыгмы");

        var existing = await grammarEditRepository.GetParadigm(id, cancellationToken)
            ?? throw new NotFoundException("Парадыгма ня знойдзеная");

        var entity = ToParadigm(createVm, id);
        await grammarEditRepository.UpdateLocalParadigm(entity, cancellationToken);
        return ToParadigmResponse(entity, existing.Hidden);
    }

    public async Task DeleteParadigm(int id, CancellationToken cancellationToken = default)
    {
        if (!GrammarIds.IsLocal(id))
            throw new BadRequestException("Выдаляць можна толькі ўласныя (лакальныя) парадыгмы");
        await grammarEditRepository.DeleteLocalParadigm(id, cancellationToken);
    }

    public Task HideParadigm(int id, string? userId, CancellationToken cancellationToken = default)
        => grammarEditRepository.HideParadigm(id, userId, cancellationToken);

    public Task UnhideParadigm(int id, CancellationToken cancellationToken = default)
        => grammarEditRepository.UnhideParadigm(id, cancellationToken);

    // Уваход -> сутнасьць: нармалізуем тыпаграфічны націск (як канвэртэр), эфэктыўны тэг варыянту з fallback на тэг парадыгмы
    private static Paradigm ToParadigm(ParadigmCreateVm createVm, int paradigmId = 0) => new()
    {
        ParadigmId = paradigmId,
        Lemma = Normalizer.NormalizeTypographicStress(createVm.Lemma),
        Tag = createVm.Tag,
        Meaning = string.IsNullOrWhiteSpace(createVm.Meaning) ? null : createVm.Meaning,
        Source = ParadigmSource.Local,
        Variants = createVm.Variants.Select(v => new ParadigmVariant
        {
            Id = v.Id,
            Lemma = Normalizer.NormalizeTypographicStress(v.Lemma),
            Tag = string.IsNullOrEmpty(v.Tag) ? createVm.Tag : v.Tag,
            Forms = v.Forms.Select(f => new ParadigmForm
            {
                Tag = f.Tag,
                Value = Normalizer.NormalizeTypographicStress(f.Value),
            }).ToList(),
        }).ToList(),
    };

    private static ParadigmResponse ToParadigmResponse(Paradigm p, bool hidden) => new(
        p.ParadigmId, p.Lemma, p.Tag, p.Meaning, p.Source, hidden,
        p.Variants.Select(v => new VariantResponse(v.Id, v.Lemma, v.Tag,
            v.Forms.Select(f => new FormResponse(f.Tag, f.Value)).ToList())).ToList());
}
