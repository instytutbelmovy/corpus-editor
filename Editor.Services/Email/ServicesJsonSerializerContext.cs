using System.Text.Json.Serialization;

namespace Editor;

/// <summary> Сэрыялізацыя для выходных HTTP-кліентаў сэрвісаў (Mailgun, reCAPTCHA) — не частка HTTP-адказаў API </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSerializable(typeof(ReCaptchaResponse))]
internal partial class ServicesJsonSerializerContext : JsonSerializerContext
{
}
