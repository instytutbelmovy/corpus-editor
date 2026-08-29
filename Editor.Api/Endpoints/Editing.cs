using Editor.Api.Infrastructure;
using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Editing;
using Microsoft.AspNetCore.Mvc;

namespace Editor.Api;

public static class Editing
{
    public static void MapEditing(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/registry-files");
        group.MapGet("/{n:int}", GetDocument).Viewer();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/paradigm-form-id", PutParadigmFormId).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/lemma-tag", PutLemmaTags).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/text", PutText).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/comment", PutComment).Editor();
        group.MapPut("/{n:int}/{paragraphId:int}.{paragraphStamp:guid}/{sentenceId:int}.{sentenceStamp:guid}/{wordIndex:int}/error-type", PutErrorType).Editor();
        group.MapPost("/{n:int}/edit", EditDocument).Validate<DocumentEditRequest>().Editor();
        group.MapGet("/{id}/metadata", GetMetadata).Viewer();
        group.MapPut("/{id}/metadata", PutMetadata).Editor();
    }

    private static Task<CorpusDocumentView> GetDocument(int n, IEditingService editingService, int skipUpToId = 0, int take = 20)
        => editingService.GetDocument(n, skipUpToId, take);

    private static Task PutParadigmFormId(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] ParadigmFormId paradigmFormId, IEditingService editingService)
        => editingService.PutParadigmFormId(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, paradigmFormId);

    private static Task PutLemmaTags(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LemmaTag lemmaTag, IEditingService editingService)
        => editingService.PutLemmaTags(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, lemmaTag);

    private static Task<IEnumerable<GrammarInfo>> PutText(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string text, IEditingService editingService)
        => editingService.PutText(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, text);

    private static Task PutComment(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] string comment, IEditingService editingService)
        => editingService.PutComment(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, comment);

    private static Task PutErrorType(int n, int paragraphId, Guid paragraphStamp, int sentenceId, Guid sentenceStamp, int wordIndex, [FromBody] LinguisticErrorType errorType, IEditingService editingService)
        => editingService.PutErrorType(n, paragraphId, paragraphStamp, sentenceId, sentenceStamp, wordIndex, errorType);

    private static Task<DocumentEditResponse> EditDocument(int n, DocumentEditRequest request, IEditingService editingService)
        => editingService.EditDocument(n, request);

    private static ValueTask<CorpusDocumentHeader> GetMetadata(int id, IEditingService editingService)
        => editingService.GetMetadata(id);

    private static Task PutMetadata(int id, UpdateMetadataRequest request, IEditingService editingService)
        => editingService.PutMetadata(id, request);
}
