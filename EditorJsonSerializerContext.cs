using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(IEnumerable<CorpusDocumentBasicInfo>))]
[JsonSerializable(typeof(IEnumerable<Paragraph>))]
[JsonSerializable(typeof(CorpusDocumentView))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}