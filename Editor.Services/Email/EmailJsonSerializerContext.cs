using System.Text.Json.Serialization;

namespace Editor.Services.Email;

/// <summary> Сэрыялізацыя для выходнага HTTP-кліента Mailgun - не частка HTTP-адказаў API </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Dictionary<string, string>))]
internal partial class EmailJsonSerializerContext : JsonSerializerContext
{
}
