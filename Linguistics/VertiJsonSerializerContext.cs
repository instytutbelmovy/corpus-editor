using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(LinguisticItemMetadata))]
internal partial class VertiJsonSerializerContext : JsonSerializerContext
{
}