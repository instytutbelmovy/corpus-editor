using System.Security.Claims;
using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SignInRequest))]
internal partial class AuthJsonSerializerContext : JsonSerializerContext
{
}