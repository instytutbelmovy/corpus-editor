using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(IEnumerable<RegistryFileDto>))]
[JsonSerializable(typeof(IEnumerable<Paragraph>))]
[JsonSerializable(typeof(CorpusDocument))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}