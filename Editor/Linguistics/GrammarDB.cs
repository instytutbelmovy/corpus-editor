using System.Collections.Concurrent;
using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace Editor;

public record GrammarInfo(
    ParadigmFormId? ParadigmFormId,
    LinguisticTag LinguisticTag,
    string Lemma,
    string? Meaning
);

public partial class GrammarDb(string dbPath)
{
    private readonly string? _connectionString = $"Data Source={dbPath}";

    private readonly ConcurrentDictionary<string, ConcurrentDictionary<GrammarInfo, byte>> _customWords = new();

    public List<GrammarInfo> LookupWord(string word, bool pickCustomWords = true)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);
        var results = new List<GrammarInfo>();

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        // 1. Шукаем форму ў табліцы Forms
        const string formsQuery = "SELECT Paradigms FROM Forms WHERE NormalizedForm = @NormalizedForm";
        using var formsCommand = new SqliteCommand(formsQuery, connection);
        formsCommand.Parameters.AddWithValue("@NormalizedForm", normalizedWord);

        using var formsReader = formsCommand.ExecuteReader();
        if (formsReader.Read())
        {
            var paradigmsString = formsReader.GetString(0);

            foreach (var match in ParadigmKeyParsingRegex().EnumerateMatches(paradigmsString))
            {
                var paradigmIdStart = match.Index;
                int variantIdStart = paradigmIdStart, formTagStart, formTagEnd;
                while (char.IsDigit(paradigmsString[variantIdStart]))
                    variantIdStart++;

                formTagStart = variantIdStart;
                while (paradigmsString[formTagStart] != '|')
                    formTagStart++;
                formTagStart++;
                formTagEnd = formTagStart;
                while (formTagEnd < paradigmsString.Length && paradigmsString[formTagEnd] != ',')
                    formTagEnd++;

                var paradigmId = Int32.Parse(paradigmsString.AsSpan(paradigmIdStart..variantIdStart), NumberStyles.None);
                var variantId = paradigmsString[variantIdStart..(formTagStart - 1)];
                var formTag = paradigmsString[formTagStart..formTagEnd];

                const string paradigmQuery = "SELECT Lemma, ParadigmTag, Meaning FROM Paradigms WHERE ParadigmId = @ParadigmId AND VariantId = @VariantId";
                using var paradigmCommand = new SqliteCommand(paradigmQuery, connection);
                paradigmCommand.Parameters.AddWithValue("@ParadigmId", paradigmId);
                paradigmCommand.Parameters.AddWithValue("@VariantId", variantId);

                using var paradigmReader = paradigmCommand.ExecuteReader();
                if (!paradigmReader.Read())
                    throw new InvalidOperationException($"Paradigm {paradigmId}{variantId} not found");
                var lemma = paradigmReader.GetString(0);
                var paradigmTag = paradigmReader.GetString(1);
                var meaning = paradigmReader.IsDBNull(2) ? null : paradigmReader.GetString(2);

                var grammarInfo = new GrammarInfo(
                    ParadigmFormId: new ParadigmFormId(paradigmId, variantId, formTag),
                    LinguisticTag: new LinguisticTag(paradigmTag, formTag),
                    Lemma: lemma,
                    Meaning: meaning
                );

                results.Add(grammarInfo);
            }
        }

        if (_customWords.TryGetValue(normalizedWord, out var customWordResults))
            results.AddRange(customWordResults.Select(x => x.Key));

        return results;
    }

    public (string, LinguisticTag) GetLemmaAndLinguisticTag(ParadigmFormId paradigmFormId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        const string query = "SELECT Lemma, ParadigmTag FROM Paradigms WHERE ParadigmId = @ParadigmId AND VariantId = @VariantId";
        using var command = new SqliteCommand(query, connection);
        command.Parameters.AddWithValue("@ParadigmId", paradigmFormId.ParadigmId);
        command.Parameters.AddWithValue("@VariantId", paradigmFormId.VariantId);

        using var reader = command.ExecuteReader();
        if (reader.Read())
        {
            var lemma = reader.GetString(0);
            var paradigmTag = reader.GetString(1);
            var linguisticTag = new LinguisticTag(paradigmTag, paradigmFormId.FormTag);

            return (lemma, linguisticTag);
        }

        throw new NotFoundException("Paradigm Form Id not found");
    }

    public (ParadigmFormId?, string?, LinguisticTag?) InferGrammarInfo(string word)
    {
        var grammarInfoList = LookupWord(word);

        if (!grammarInfoList.Any())
            return (null, null, null);

        if (grammarInfoList.Count == 1)
        {
            var grammarInfo = grammarInfoList[0];
            return (
                grammarInfo.ParadigmFormId,
                grammarInfo.Lemma,
                grammarInfo.LinguisticTag
            );
        }

        var intersectionParadigmFormId = grammarInfoList
            .Aggregate<GrammarInfo, ParadigmFormId?>(null, (current, grammarInfo) => current?.IntersectWith(grammarInfo.ParadigmFormId));

        var intersectionLinguisticTag = grammarInfoList
            .Aggregate<GrammarInfo, LinguisticTag?>(null, (current, grammarInfo) => current?.IntersectWith(grammarInfo.LinguisticTag));

        var lemmas = grammarInfoList.Select(info => Normalizer.GrammarDbLightNormalize(info.Lemma)).ToHashSet();
        var intersectionLemma = lemmas.Count == 1 ? lemmas.First() : null;

        if (intersectionLemma == null)
        {
            // добра, а калі і націскі і вялікія літары праігнараваць?
            lemmas = grammarInfoList.Select(info => Normalizer.GrammarDbAggressiveNormalize(info.Lemma)).ToHashSet();
            intersectionLemma = lemmas.Count() == 1 ? lemmas.First() : null;
        }

        // Калі знайшліся зусім розныя варыянты - вяртаем пустыя значэнні
        return (intersectionParadigmFormId, intersectionLemma, intersectionLinguisticTag);
    }

    public void AddCustomWord(string word, GrammarInfo grammarInfo)
    {
        var normalizedWord = Normalizer.GrammarDbAggressiveNormalize(word);
        var set = _customWords.GetOrAdd(normalizedWord, _ => []);
        set.TryAdd(grammarInfo, 0);
    }

    [GeneratedRegex(@"\d+[a-z]?\|\w?")]
    private static partial Regex ParadigmKeyParsingRegex();
}