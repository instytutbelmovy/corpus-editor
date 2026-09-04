using System.Text.Json.Serialization;

namespace Editor.Services.Auth;

/// <summary> Сэрыялізацыя для выходнага HTTP-кліента Turnstile - не частка HTTP-адказаў API </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(TurnstileResponse))]
internal partial class TurnstileJsonSerializerContext : JsonSerializerContext
{
}
