using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(FrontendConfigResponse))]
[JsonSerializable(typeof(ErrorResponse))]
internal partial class InfrastructureJsonSerializerContext : JsonSerializerContext
{
}