using System.Collections.Concurrent;
using Editor.Domain.Corpus;
using Editor.Services.Corpus;

namespace Editor.Tests.Linguistics;

public class InMemoryCorpusStorage : ICorpusStorage
{
    public ConcurrentDictionary<string, byte[]> Files { get; } = new();
    public ConcurrentQueue<string> WrittenKeys { get; } = new();

    /// <summary> Hooks for failure/delay injection; invoked before the corresponding operation. </summary>
    public Func<string, Task>? OnRead { get; set; }
    public Func<string, Task>? OnWrite { get; set; }
    public Func<Task>? OnList { get; set; }
    public Func<List<string>>? ListKeysOverride { get; set; }

    public async Task<Stream> OpenRead(string key)
    {
        if (OnRead != null) await OnRead(key);
        if (!Files.TryGetValue(key, out var bytes))
            throw new FileNotFoundException($"File {key} not found");
        return new MemoryStream(bytes);
    }

    public async Task Write(string key, CorpusDocument document)
    {
        if (OnWrite != null) await OnWrite(key);
        var stream = new MemoryStream();
        await VertiIO.WriteDocument(stream, document);
        Files[key] = stream.ToArray();
        WrittenKeys.Enqueue(key);
    }

    public async Task<List<string>> ListKeys(string suffix)
    {
        if (OnList != null) await OnList();
        return ListKeysOverride?.Invoke() ?? Files.Keys.Where(x => x.EndsWith(suffix)).ToList();
    }

    public Task<bool> Exists(string key) => Task.FromResult(Files.ContainsKey(key));
}
