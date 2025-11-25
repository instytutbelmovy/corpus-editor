namespace Editor.Converters;

public interface IDocumentReader
{
    IEnumerable<string> Read(Stream stream);
} 