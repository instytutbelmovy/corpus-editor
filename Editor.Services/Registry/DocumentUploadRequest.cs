namespace Editor.Services.Registry;

public sealed record DocumentUploadRequest(
    int N,
    string FileExtension,
    MemoryStream Content,
    string Title,
    string? Url,
    string? PublicationDate,
    string? Type,
    string? Style,
    string? Corpus) : JobRequest(N, Title)
{
    public override UploadJobKind Kind => UploadJobKind.Upload;

    public override ValueTask DisposeAsync() => Content.DisposeAsync();
}
