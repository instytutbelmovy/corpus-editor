using System.Security.Claims;
using Editor.Api.Infrastructure;
using Editor.Services.Grammar;
using Microsoft.AspNetCore.Mvc;

namespace Editor.Api;

public static class Grammar
{
    public static void MapGrammar(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/grammar");

        group.MapGet("/paradigms", SearchParadigms).Viewer();
        group.MapGet("/paradigms/{id:int}", GetParadigm).Viewer();
        group.MapPost("/paradigms", CreateParadigm).Validate<ParadigmCreateVm>().Editor();
        group.MapPost("/paradigms/{id:int}/copy", CopyParadigm).Validate<ParadigmCreateVm>().Editor();
        group.MapPut("/paradigms/{id:int}", UpdateParadigm).Validate<ParadigmCreateVm>().Editor();
        group.MapDelete("/paradigms/{id:int}", DeleteParadigm).Editor();
        group.MapPost("/paradigms/{id:int}/hide", HideParadigm).Editor();
        group.MapDelete("/paradigms/{id:int}/hide", UnhideParadigm).Editor();
    }

    private static Task<List<ParadigmResponse>> SearchParadigms(
        [FromQuery] string query, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.SearchParadigms(query, cancellationToken);

    private static Task<ParadigmResponse> GetParadigm(
        int id, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.GetParadigm(id, cancellationToken);

    private static Task<ParadigmResponse> CreateParadigm(
        [FromBody] ParadigmCreateVm createVm, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.CreateParadigm(createVm, cancellationToken);

    private static Task<ParadigmResponse> UpdateParadigm(
        int id, [FromBody] ParadigmCreateVm createVm, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.UpdateParadigm(id, createVm, cancellationToken);

    private static Task<ParadigmResponse> CopyParadigm(
        int id, [FromBody] ParadigmCreateVm createVm, ClaimsPrincipal user, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.CopyParadigm(id, createVm, user.GetUserId(), cancellationToken);

    private static Task DeleteParadigm(
        int id, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.DeleteParadigm(id, cancellationToken);

    private static Task HideParadigm(
        int id, ClaimsPrincipal user, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.HideParadigm(id, user.GetUserId(), cancellationToken);

    private static Task UnhideParadigm(
        int id, IParadigmService paradigmService, CancellationToken cancellationToken)
        => paradigmService.UnhideParadigm(id, cancellationToken);
}
