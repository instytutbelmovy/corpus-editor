using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ReCaptchaResponse))]
[JsonSerializable(typeof(FrontendConfigResponse))]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSerializable(typeof(ErrorResponse))]
internal partial class InfrastructureJsonSerializerContext : JsonSerializerContext
{
}