namespace Editor.Services.Registry;

public record DocumentUploadRequest(
    int N,
    string FileExtension,
    MemoryStream Content,
    string Title,
    string? Url,
    string? PublicationDate,
    string? Type,
    string? Style,
    string? Corpus);
