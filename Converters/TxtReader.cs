namespace Editor.Converters;

public sealed class TxtReader : IDocumentReader
{
    public IEnumerable<string> Read(Stream stream)
    {
        var file = new StreamReader(stream);

        while (file.ReadLine() is { } line)
        {
            line = line.Trim();
            if (!string.IsNullOrEmpty(line))
                yield return line;
        }
    }
}