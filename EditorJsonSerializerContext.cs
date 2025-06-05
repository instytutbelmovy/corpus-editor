using System.Text.Json.Serialization;

namespace Editor;

[JsonSerializable(typeof(IEnumerable<RegistryFileDto>))]
[JsonSerializable(typeof(IEnumerable<Paragraph>))]
[JsonSerializable(typeof(CorpusDocument))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}