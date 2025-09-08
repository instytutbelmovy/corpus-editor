using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SignInRequest))]
[JsonSerializable(typeof(WhoAmIResponse))]
[JsonSerializable(typeof(ForgotPasswordRequest))]
[JsonSerializable(typeof(ResetPasswordRequest))]
[JsonSerializable(typeof(ReCaptchaResponse))]
[JsonSerializable(typeof(FrontendConfigResponse))]
internal partial class AuthJsonSerializerContext : JsonSerializerContext
{
}