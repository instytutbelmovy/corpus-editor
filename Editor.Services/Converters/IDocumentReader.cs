namespace Editor.Services.Converters;

public interface IDocumentReader
{
    IEnumerable<string> Read(Stream stream);
} 