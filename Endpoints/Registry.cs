using Editor.Converters;
using Microsoft.AspNetCore.Authorization;

namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var todosApi = builder.MapGroup("/api/registry-files");
        todosApi.MapGet("/", GetAllFiles).Viewer();
        todosApi.MapPost("/", UploadFile).Editor();
    }

    public static ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles()
    {
        return AwsFilesCache.GetAllDocumentHeaders();
    }

    private static async Task<IResult> UploadFile(HttpRequest request)
    {
        if (!request.HasFormContentType)
            return Results.BadRequest("Expected multipart/form-data");

        var form = await request.ReadFormAsync();
        var file = form.Files.GetFile("file");
        if (file == null)
            return Results.BadRequest("'file' not present in the form");

        var n = Convert.ToInt32(form["n"]);
        var title = form["title"].ToString();
        var url = form["url"].ToString();
        var publicationDate = form["publicationDate"].ToString();
        var textType = form["textType"].ToString();
        var style = form["style"].ToString();

        var extension = Path.GetExtension(file.FileName);
        var reader = extension switch
        {
            ".txt" => (IDocumentReader)new TxtReader(),
            ".docx" => new DocxReader(),
            ".epub" => new EpubReader(),
            _ => throw new NotSupportedException($"Unsupported file type: {extension}")
        };
        await using var stream = file.OpenReadStream();
        var paragraphs = DocumentConverter.GetParagraphs(stream, reader);

        paragraphs = paragraphs.Select(p => p with
        {
            Sentences = p.Sentences.Select(s => s with
            {
                SentenceItems = s.SentenceItems.Select(FillObviousGrammar).ToList(),
            }).ToList(),
        }).ToList();

        var percentCompletion = CorpusDocument.ComputeCompletion(paragraphs);
        var header = new CorpusDocumentHeader(n, title, null, null, publicationDate, url, textType, style)
        {
            PercentCompletion = percentCompletion,
        };
        var corpusDocument = new CorpusDocument(header, paragraphs.ToList());

        await AwsFilesCache.AddFile(corpusDocument);

        return Results.Ok();


        static LinguisticItem FillObviousGrammar(LinguisticItem item)
        {
            if (item.Type != SentenceItemType.Word)
                return item;

            var (paradigmFormId, lemma, linguisticTag) = GrammarDB.InferGrammarInfo(item.Text);
            return item with
            {
                ParadigmFormId = paradigmFormId,
                Lemma = lemma,
                LinguisticTag = linguisticTag,
                Metadata = paradigmFormId != null && paradigmFormId.IsSingular()
                    ? new LinguisticItemMetadata(null, DateOnly.FromDateTime(DateTime.UtcNow))
                    : null,
            };
        }
    }
}
