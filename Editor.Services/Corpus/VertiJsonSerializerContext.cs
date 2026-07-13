using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(LinguisticItemMetadata))]
public partial class VertiJsonSerializerContext : JsonSerializerContext
{
}