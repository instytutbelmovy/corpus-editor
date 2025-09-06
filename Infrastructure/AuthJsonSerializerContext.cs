using System.Security.Claims;
using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SignInRequest))]
[JsonSerializable(typeof(WhoAmIResponse))]
internal partial class AuthJsonSerializerContext : JsonSerializerContext
{
}