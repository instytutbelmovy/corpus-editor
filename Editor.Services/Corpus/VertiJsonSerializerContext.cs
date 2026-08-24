using System.Text.Json.Serialization;
using Editor.Domain.Corpus;

namespace Editor.Services.Corpus;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(LinguisticItemMetadata))]
public partial class VertiJsonSerializerContext : JsonSerializerContext
{
}