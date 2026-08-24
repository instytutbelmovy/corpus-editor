using System.Text.Json.Serialization;

namespace Editor.Services.Auth;

/// <summary> Сэрыялізацыя для выходнага HTTP-кліента reCAPTCHA — не частка HTTP-адказаў API </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ReCaptchaResponse))]
internal partial class ReCaptchaJsonSerializerContext : JsonSerializerContext
{
}
