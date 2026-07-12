using System.Text.Json.Serialization;

namespace Editor;

// Асобны ад Editor.DB.GrammarJsonSerializerContext (той — snake_case для jsonb варыянтаў у базе);
// гэты — camelCase DTO для HTTP API рэдагаваньня граматыкі.
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ParadigmCreateVm))]
[JsonSerializable(typeof(ParadigmResponse))]
[JsonSerializable(typeof(CreatedParadigmResponse))]
[JsonSerializable(typeof(List<ParadigmSummaryResponse>))]
internal partial class GrammarApiJsonSerializerContext : JsonSerializerContext
{
}
