using System.Text.Json.Serialization;
using Editor;

[JsonSerializable(typeof(List<Registry.RegistryFile>))]
internal partial class EditorJsonSerializerContext : JsonSerializerContext
{

}