using System.Text.Json.Serialization;

namespace Editor.Services.Linguistics;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(StanzaTagRequest))]
[JsonSerializable(typeof(StanzaTagResponse))]
internal partial class StanzaJsonSerializerContext : JsonSerializerContext
{
}
