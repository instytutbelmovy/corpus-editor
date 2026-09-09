namespace Editor.Services.Registry;

public enum UploadJobState
{
    Queued = 0,
    Running = 1,
    Succeeded = 2,
    Failed = 3,
}

public enum UploadJobStage
{
    Queued = 0,
    Parsing = 1,
    LookingUpGrammar = 2,
    Tagging = 3,
    Saving = 4,
    Done = 5,
}

/// <summary>
/// Стан заданьня загрузкі. Жыве толькі ў памяці працэсу: пасьля перазапуску заданьні зьнікаюць, і апытаньне вяртае 404.
/// Гэта бясьпечна, бо запіс у сховішча - апошні крок, таму згубленае заданьне не пакідае недаробленага дакумэнту.
/// </summary>
public record UploadJobStatus(
    Guid Id,
    int N,
    string Title,
    UploadJobState State,
    UploadJobStage Stage,
    int ProcessedTokens,
    int TotalTokens,
    string? Error,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);

/// <summary> Адказ на даданьне файлу ў чаргу. </summary>
public record UploadJobAccepted(Guid JobId);

/// <summary>
/// Паведамленьне пра прагрэс. Даецца на кожным этапе, а падчас тэгаваньня - раз на кавалак (~2000 токенаў): апытаньне ідзе раз на секунду-дзьве, таму драбней ня мае сэнсу.
/// </summary>
public readonly record struct UploadProgress(UploadJobStage Stage, int ProcessedTokens, int TotalTokens);

public sealed record UploadJobItem(Guid Id, DocumentUploadRequest Request);
