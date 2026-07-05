using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ICollection<CorpusDocumentHeader>))]
[JsonSerializable(typeof(CorpusDocumentView))]
[JsonSerializable(typeof(UpdateMetadataRequest))]
[JsonSerializable(typeof(LemmaTag))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}