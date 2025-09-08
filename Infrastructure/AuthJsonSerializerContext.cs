using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SignInRequest))]
[JsonSerializable(typeof(WhoAmIResponse))]
[JsonSerializable(typeof(ForgotPasswordRequest))]
[JsonSerializable(typeof(ResetPasswordRequest))]
[JsonSerializable(typeof(ReCaptchaResponse))]
[JsonSerializable(typeof(FrontendConfigResponse))]
[JsonSerializable(typeof(Dictionary<string, string>))]
internal partial class AuthJsonSerializerContext : JsonSerializerContext
{
}