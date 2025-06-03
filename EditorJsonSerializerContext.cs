using System.Text.Json.Serialization;

namespace Editor;

[JsonSerializable(typeof(IEnumerable<Registry.RegistryFile>))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{
}