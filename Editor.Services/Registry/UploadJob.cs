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
    Loading = 6,
}

/// <summary> Што за праца стаіць у чарзе: загрузка новага дакумэнту ці перазьметка ўжо наяўнага. </summary>
public enum UploadJobKind
{
    Upload = 0,
    Tagging = 1,
}

/// <summary>
/// Стан заданьня. Жыве толькі ў памяці працэсу: пасьля перазапуску заданьні зьнікаюць, і апытаньне вяртае 404.
/// Гэта бясьпечна, бо запіс у сховішча - апошні крок: загубленая загрузка не пакідае недаробленага дакумэнту,
/// а загубленая перазьметка проста ня мае эфэкту, бо адзіны скід ідзе ў канцы, пад блякаваньнем.
/// </summary>
public record UploadJobStatus(
    Guid Id,
    int N,
    string Title,
    UploadJobKind Kind,
    UploadJobState State,
    UploadJobStage Stage,
    int ProcessedTokens,
    int TotalTokens,
    string? Error,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);

/// <summary> Адказ на даданьне заданьня ў чаргу. </summary>
public record UploadJobAccepted(Guid JobId);

/// <summary> Адказ на масавую перазьметку: колькі дакумэнтаў сталі ў чаргу. </summary>
public record TagAllAccepted(int Enqueued);

/// <summary>
/// Паведамленьне пра прагрэс. Даецца на кожным этапе, а падчас тэгаваньня - раз на кавалак (~2000 токенаў): апытаньне ідзе раз на секунду-дзьве, таму драбней ня мае сэнсу.
/// </summary>
public readonly record struct UploadProgress(UploadJobStage Stage, int ProcessedTokens, int TotalTokens);

/// <summary> Заданьне ў чарзе. Нашчадкі апісваюць, што менавіта рабіць - разгаліноўвае іх UploadJobWorker. </summary>
public abstract record JobRequest(int N, string Title)
{
    public abstract UploadJobKind Kind { get; }

    /// <summary> Вызваленьне рэсурсаў, захопленых пры пастаноўцы ў чаргу (напрыклад, буфэр загружанага файлу). </summary>
    public virtual ValueTask DisposeAsync() => ValueTask.CompletedTask;
}

/// <summary> Перазьметка ўжо наяўнага дакумэнту праз Stanza. </summary>
public sealed record DocumentTagRequest(int N, string Title) : JobRequest(N, Title)
{
    public override UploadJobKind Kind => UploadJobKind.Tagging;
}

public sealed record UploadJobItem(Guid Id, JobRequest Request);
