using System.Text.Json.Serialization;

namespace Editor.Api.Infrastructure;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(FrontendConfigResponse))]
[JsonSerializable(typeof(ErrorResponse))]
internal partial class InfrastructureJsonSerializerContext : JsonSerializerContext
{
}