using System.Text.Json.Serialization;

namespace Editor;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(IEnumerable<EditorUserDto>))]
[JsonSerializable(typeof(EditorUserCreateDto))]
internal partial class AdministrationJsonSerializerContext : JsonSerializerContext
{
}