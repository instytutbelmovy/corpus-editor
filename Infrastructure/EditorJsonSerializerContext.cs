using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ICollection<CorpusDocumentBasicInfo>))]
[JsonSerializable(typeof(CorpusDocumentView))]
[JsonSerializable(typeof(LemmaTag))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}