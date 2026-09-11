using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Editor;
using Editor.Domain;
using Editor.Domain.Grammar;
using Npgsql;
using NpgsqlTypes;
using GrammarJsonSerializerContext = Editor.DB.GrammarJsonSerializerContext;

namespace GrammarDbConverter;

public partial class GrammarDbConverter
{
    private readonly ILogger _logger;
    private readonly string _connectionString;

    public GrammarDbConverter(ILogger logger, string connectionString)
    {
        _logger = logger;
        _connectionString = connectionString;
    }

    public async Task ConvertAsync(string inputDirectory)
    {
        LogStartingConversion(inputDirectory);

        // Чытаем усе XML файлы і збіраем даныя
        var xmlFiles = Directory.GetFiles(inputDirectory, "*.xml");
        LogFoundXmlFiles(xmlFiles.Length);

        // Дэдуплікацыя ў памяці: pdgId можа паўтарацца ў розных файлах (першы выйграе);
        // binary COPY не ўмее прапускаць канфлікты PK, таму дублікаты формаў адсейвае HashSet
        var paradigms = new Dictionary<int, Paradigm>();
        var forms = new HashSet<(string NormalizedForm, int ParadigmId, string VariantId, string FormTag)>();

        foreach (var xmlFile in xmlFiles)
            ProcessXmlFile(xmlFile, paradigms, forms);

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await DeleteUpstreamAsync(connection);

        LogInsertingParadigms(paradigms.Count);
        await CopyParadigmsAsync(connection, paradigms.Values);

        LogInsertingForms(forms.Count);
        await CopyFormsAsync(connection, forms);

        await AnalyzeAsync(connection);

        LogConversionCompleted(paradigms.Count, forms.Count);
    }

    private async Task DeleteUpstreamAsync(NpgsqlConnection connection)
    {
        // Выдаляем толькі апстрымныя радкі (source = 0). Лакальныя парадыгмы/формы і оверлэй
        // hidden_paradigms застаюцца некранутымі, каб перажыць пераімпарт.
        await using var command = new NpgsqlCommand(
            "DELETE FROM forms WHERE source = 0; DELETE FROM paradigms WHERE source = 0", connection);
        await command.ExecuteNonQueryAsync();
        LogUpstreamRowsDeleted();
    }

    private void ProcessXmlFile(
        string xmlFilePath,
        Dictionary<int, Paradigm> paradigms,
        HashSet<(string NormalizedForm, int ParadigmId, string VariantId, string FormTag)> forms)
    {
        LogProcessingFile(xmlFilePath);

        var doc = XDocument.Load(xmlFilePath);
        var root = doc.Root;

        if (root == null)
        {
            LogFileHasNoRootElement(xmlFilePath);
            return;
        }

        var paradigmCount = 0;
        var skippedCount = 0;
        var formCount = 0;

        // Загружаем парадыгмы
        foreach (var paradigmElement in root.Elements("Paradigm"))
        {
            var paradigmTag = paradigmElement.Attribute("tag")?.Value ?? "";
            var paradigmIdStr = paradigmElement.Attribute("pdgId")?.Value;
            var paradigmMeaning = paradigmElement.Attribute("meaning")?.Value;

            if (string.IsNullOrEmpty(paradigmIdStr) || !int.TryParse(paradigmIdStr, out var paradigmId))
            {
                LogInvalidParadigmId(xmlFilePath);
                continue;
            }

            // Абарона ад калізіі: апстрымныя pdgId мусяць быць ніжэй за зарэзэрваваны лакальны дыяпазон.
            // Спыняемся да любых зьменаў у базе, каб не сапсаваць лакальныя дадзеныя.
            if (paradigmId >= GrammarIds.LocalParadigmIdBase)
                throw new InvalidOperationException(
                    $"Апстрым pdgId {paradigmId} трапляе ў зарэзэрваваны лакальны дыяпазон (>= {GrammarIds.LocalParadigmIdBase}); імпарт спынены.");

            var rawLemma = paradigmElement.Attribute("lemma")?.Value ?? "";
            var paradigm = new Paradigm
            {
                ParadigmId = paradigmId,
                Lemma = Normalizer.NormalizeTypographicStress(rawLemma),
                // Ключ прэфікснага пошуку - з зыходнай лемы, як і нармалізаваныя формы
                LemmaNormalized = Normalizer.GrammarDbSearchNormalize(rawLemma),
                Tag = paradigmTag,
                Meaning = paradigmMeaning,
            };

            if (!paradigms.TryAdd(paradigmId, paradigm))
            {
                skippedCount++;
                LogSkippedDuplicateParadigm(paradigmId);
                continue;
            }

            paradigmCount++;

            foreach (var variantElement in paradigmElement.Elements("Variant"))
            {
                var variantId = variantElement.Attribute("id")?.Value ?? "";
                var lemma = variantElement.Attribute("lemma")?.Value ?? "";
                var variantTag = variantElement.Attribute("tag")?.Value;

                // Эфэктыўны тэг вылічаецца пры запісе; чытач заўсёды бярэ variant.Tag без fallback
                var effectiveTag = variantTag ?? paradigmTag;

                var variant = new ParadigmVariant
                {
                    Id = variantId,
                    Lemma = Normalizer.NormalizeTypographicStress(lemma),
                    Tag = effectiveTag,
                };
                paradigm.Variants.Add(variant);

                foreach (var formElement in variantElement.Elements("Form"))
                {
                    var formTag = formElement.Attribute("tag")?.Value ?? "";
                    var formValue = formElement.Value;

                    if (string.IsNullOrEmpty(formValue))
                        continue;

                    variant.Forms.Add(new ParadigmForm
                    {
                        Tag = formTag,
                        Value = Normalizer.NormalizeTypographicStress(formValue),
                    });

                    // Нармалізуем форму для індэксаваньня
                    forms.Add((Normalizer.GrammarDbAggressiveNormalize(formValue), paradigmId, variantId, formTag));
                    formCount++;
                }
            }
        }

        LogFileProcessed(Path.GetFileName(xmlFilePath), paradigmCount, skippedCount, formCount);
    }

    private async Task CopyParadigmsAsync(NpgsqlConnection connection, IEnumerable<Paradigm> paradigms)
    {
        await using var writer = await connection.BeginBinaryImportAsync(
            "COPY paradigms (paradigm_id, lemma, lemma_normalized, tag, meaning, variants, source) FROM STDIN (FORMAT BINARY)");

        foreach (var paradigm in paradigms)
        {
            await writer.StartRowAsync();
            await writer.WriteAsync(paradigm.ParadigmId, NpgsqlDbType.Integer);
            await writer.WriteAsync(paradigm.Lemma, NpgsqlDbType.Text);
            await writer.WriteAsync(paradigm.LemmaNormalized, NpgsqlDbType.Text);
            await writer.WriteAsync(paradigm.Tag, NpgsqlDbType.Text);
            if (paradigm.Meaning == null)
                await writer.WriteNullAsync();
            else
                await writer.WriteAsync(paradigm.Meaning, NpgsqlDbType.Text);
            // Той жа крыніцагенэраваны кантэкст, які GrammarDbContext выкарыстоўвае для дэсерыялізацыі
            await writer.WriteAsync(JsonSerializer.Serialize(paradigm.Variants, GrammarJsonSerializerContext.Default.ListParadigmVariant), NpgsqlDbType.Jsonb);
            await writer.WriteAsync((int)ParadigmSource.Upstream, NpgsqlDbType.Integer);
        }

        await writer.CompleteAsync();
    }

    private async Task CopyFormsAsync(
        NpgsqlConnection connection,
        IEnumerable<(string NormalizedForm, int ParadigmId, string VariantId, string FormTag)> forms)
    {
        await using var writer = await connection.BeginBinaryImportAsync(
            "COPY forms (normalized_form, paradigm_id, variant_id, form_tag, source) FROM STDIN (FORMAT BINARY)");

        foreach (var (normalizedForm, paradigmId, variantId, formTag) in forms)
        {
            await writer.StartRowAsync();
            await writer.WriteAsync(normalizedForm, NpgsqlDbType.Text);
            await writer.WriteAsync(paradigmId, NpgsqlDbType.Integer);
            await writer.WriteAsync(variantId, NpgsqlDbType.Text);
            await writer.WriteAsync(formTag, NpgsqlDbType.Text);
            await writer.WriteAsync((int)ParadigmSource.Upstream, NpgsqlDbType.Integer);
        }

        await writer.CompleteAsync();
    }

    private async Task AnalyzeAsync(NpgsqlConnection connection)
    {
        await using var command = new NpgsqlCommand("ANALYZE paradigms; ANALYZE forms", connection);
        await command.ExecuteNonQueryAsync();
        LogStatisticsUpdated();
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Пачынаю канвэртаваньне XML файлаў з дырэкторыі {Directory}")]
    private partial void LogStartingConversion(string directory);

    [LoggerMessage(Level = LogLevel.Information, Message = "Знойдзена {Count} XML файлаў")]
    private partial void LogFoundXmlFiles(int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Устаўляю {Count} парадыгм...")]
    private partial void LogInsertingParadigms(int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Устаўляю {Count} форм...")]
    private partial void LogInsertingForms(int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Канвэртаваньне завершана. Парадыгм: {ParadigmCount}, Форм: {FormCount}")]
    private partial void LogConversionCompleted(int paradigmCount, int formCount);

    [LoggerMessage(Level = LogLevel.Information, Message = "Апстрымныя радкі выдаленыя")]
    private partial void LogUpstreamRowsDeleted();

    [LoggerMessage(Level = LogLevel.Information, Message = "Апрацоўваю файл {File}")]
    private partial void LogProcessingFile(string file);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Файл {File} не змяшчае каранёвага элемэнта")]
    private partial void LogFileHasNoRootElement(string file);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Няправільны ParadigmId у файле {File}")]
    private partial void LogInvalidParadigmId(string file);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Прапушчаны дублікат парадыгмы: ParadigmId={ParadigmId}")]
    private partial void LogSkippedDuplicateParadigm(int paradigmId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Апрацаваны файл {File}: {ParadigmCount} парадыгм ({Skipped} дублікатаў прапушчана), {FormCount} форм")]
    private partial void LogFileProcessed(string file, int paradigmCount, int skipped, int formCount);

    [LoggerMessage(Level = LogLevel.Information, Message = "Статыстыка табліц абноўленая (ANALYZE)")]
    private partial void LogStatisticsUpdated();
}

class Program
{
    static async Task Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;

        if (args.Length != 2)
        {
            Console.WriteLine("Выкарыстаньне: GrammarDbConverter <input_directory> <connection_string>");
            Console.WriteLine("Прыклад: GrammarDbConverter C:\\grammar_xml \"Host=localhost;Database=grammar;Username=postgres;Password=postgres\"");
            return;
        }

        var inputDirectory = args[0];
        var connectionString = args[1];

        if (!Directory.Exists(inputDirectory))
        {
            Console.WriteLine($"Памылка: Дырэкторыя {inputDirectory} не існуе");
            return;
        }

        // Ствараем просты логер
        using var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddSimpleConsole(options =>
            {
                options.SingleLine = true;
                options.TimestampFormat = "HH:mm:ss ";
            });
            builder.SetMinimumLevel(LogLevel.Information);
        });

        var logger = loggerFactory.CreateLogger<GrammarDbConverter>();
        var converter = new GrammarDbConverter(logger, connectionString);

        try
        {
            await converter.ConvertAsync(inputDirectory);
            Console.WriteLine("Канвэртаваньне завершана! Грамбаза запоўненая.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Памылка падчас канвэртаваньня");
            Console.WriteLine($"Памылка: {ex.Message}");
        }
    }
}
