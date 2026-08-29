using System.Text.Json.Serialization;
using Editor.Domain.Grammar;

namespace Editor.DB;

// snake_case, як і рэшта схемы (гл. UseSnakeCaseNamingConvention для табліц/калонак)
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower)]
[JsonSerializable(typeof(List<ParadigmVariant>))]
public partial class GrammarJsonSerializerContext : JsonSerializerContext
{
}
