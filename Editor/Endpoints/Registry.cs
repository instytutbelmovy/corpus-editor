using Editor.Converters;

namespace Editor;

public static class Registry
{
    public static void MapRegistry(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/registry-files");
        group.MapGet("/", GetAllFiles).Viewer();
        group.MapPost("/", UploadFile).Editor();
        group.MapGet("/{n:int}/download", DownloadFile).Viewer();
        group.MapPost("/refresh", ReloadFilesList).Admin();
        group.MapPost("/{n:int}/refresh", ReloadFile).Admin();
    }

    public static ValueTask<ICollection<CorpusDocumentHeader>> GetAllFiles(AwsFilesCache awsFilesCache)
    {
        return awsFilesCache.GetAllDocumentHeaders();
    }

    private static async Task<IResult> UploadFile(HttpRequest request, GrammarDb grammarDb, AwsFilesCache awsFilesCache)
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
                SentenceItems = s.SentenceItems.Select(x => FillObviousGrammar(x, grammarDb)).ToList(),
            }).ToList(),
        }).ToList();

        var percentCompletion = CorpusDocument.ComputeCompletion(paragraphs);
        var header = new CorpusDocumentHeader(n, title, null, null, publicationDate, url, textType, style)
        {
            PercentCompletion = percentCompletion,
        };
        var corpusDocument = new CorpusDocument(header, paragraphs.ToList());

        await awsFilesCache.AddFile(corpusDocument);

        return Results.Ok();


        static LinguisticItem FillObviousGrammar(LinguisticItem item, GrammarDb grammarDb)
        {
            if (item.Type != SentenceItemType.Word)
                return item;

            var (paradigmFormId, lemma, linguisticTag) = grammarDb.InferGrammarInfo(item.Text);
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

    public static async Task<IResult> DownloadFile(int n, AwsFilesCache awsFilesCache)
    {
        if (n < 0)
            throw new BadRequestException();

        try
        {
            var stream = await awsFilesCache.GetRawFile(n);
            var fileName = $"{n}.verti";

            return Results.File(stream, "text/plain", fileName);
        }
        catch (FileNotFoundException)
        {
            throw new NotFoundException();
        }
    }

    public static async Task<ICollection<CorpusDocumentHeader>> ReloadFilesList(AwsFilesCache awsFilesCache)
    {
        await awsFilesCache.ReloadFilesList();
        return await awsFilesCache.GetAllDocumentHeaders();
    }

    public static async Task<CorpusDocumentHeader> ReloadFile(int n, AwsFilesCache awsFilesCache)
    {
        if (n < 0)
            throw new BadRequestException();

        return await awsFilesCache.ReloadFile(n);
    }
}
