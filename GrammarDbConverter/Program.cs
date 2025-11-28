using System.Text;
using System.Xml.Linq;
using Microsoft.Data.Sqlite;
using Editor;

namespace GrammarDbConverter;


public record ParadigmInfo(
    int ParadigmId,
    string VariantId,
    string Lemma,
    string ParadigmTag,
    string? Meaning
);

public record FormInfo(
    string NormalizedForm,
    string Paradigms
);

public class GrammarDbConverter
{
    private readonly ILogger _logger;
    private readonly string _outputDbPath;

    public GrammarDbConverter(ILogger logger, string outputDbPath)
    {
        _logger = logger;
        _outputDbPath = outputDbPath;
    }

    public async Task ConvertAsync(string inputDirectory)
    {
        _logger.LogInformation("Пачынаю канвэртаваньне XML файлаў з дырэкторыі {directory}", inputDirectory);
        
        // Ствараем базу даных
        await CreateDatabaseAsync();
        
        // Чытаем усе XML файлы і збіраем даныя
        var xmlFiles = Directory.GetFiles(inputDirectory, "*.xml");
        _logger.LogInformation("Знойдзена {count} XML файлаў", xmlFiles.Length);
        
        var allParadigms = new List<ParadigmInfo>();
        var allForms = new Dictionary<string, HashSet<string>>();
        
        foreach (var xmlFile in xmlFiles)
        {
            var (paradigms, forms) = ProcessXmlFileAsync(xmlFile);
            allParadigms.AddRange(paradigms);
            
            // Збіраем формы
            foreach (var (normalizedForm, paradigmKey) in forms)
            {
                if (!allForms.ContainsKey(normalizedForm))
                    allForms[normalizedForm] = new HashSet<string>();
                
                allForms[normalizedForm].Add(paradigmKey);
            }
            
            _logger.LogInformation("Апрацаваны файл {file}: {paradigmCount} парадыгм, {formCount} форм", 
                Path.GetFileName(xmlFile), paradigms.Count, forms.Count);
        }
        
        // Устаўляем парадыгмы
        _logger.LogInformation("Устаўляю {count} парадыгм...", allParadigms.Count);
        await InsertParadigmsInBatchesAsync(allParadigms);
        
        var formInfos = allForms.Select(kvp => new FormInfo(
                NormalizedForm: kvp.Key,
                Paradigms: string.Join(",", kvp.Value)
            )).ToList();
        
        _logger.LogInformation("Устаўляю {count} форм...", formInfos.Count);
        await InsertFormsInBatchesAsync(formInfos);
        
        
        _logger.LogInformation("Канвэртаваньне завершана. Парадыгм: {paradigmCount}, Форм: {formCount}", 
            allParadigms.Count, formInfos.Count);
    }

    private async Task CreateDatabaseAsync()
    {
        // Выдаляем існуючую базу калі яна ёсць
        if (File.Exists(_outputDbPath))
        {
            File.Delete(_outputDbPath);
            _logger.LogInformation("Выдалена існуючая база даных {path}", _outputDbPath);
        }

        using var connection = new SqliteConnection($"Data Source={_outputDbPath}");
        await connection.OpenAsync();

        // Ствараем табліцу Paradigms
        var createParadigmsTableSql = @"
            CREATE TABLE Paradigms (
                ParadigmId INTEGER NOT NULL,
                VariantId TEXT NOT NULL,
                Lemma TEXT NOT NULL,
                ParadigmTag TEXT NOT NULL,
                Meaning TEXT,
                PRIMARY KEY (ParadigmId, VariantId)
            ) WITHOUT ROWID";

        using var createParadigmsCommand = new SqliteCommand(createParadigmsTableSql, connection);
        await createParadigmsCommand.ExecuteNonQueryAsync();

        // Ствараем табліцу Forms
        var createFormsTableSql = @"
            CREATE TABLE Forms (
                NormalizedForm TEXT NOT NULL,
                Paradigms TEXT NOT NULL,
                PRIMARY KEY (NormalizedForm)
            ) WITHOUT ROWID";

        using var createFormsCommand = new SqliteCommand(createFormsTableSql, connection);
        await createFormsCommand.ExecuteNonQueryAsync();

        _logger.LogInformation("Створана база даных з табліцамі Paradigms і Forms");
    }


    private (List<ParadigmInfo> paradigms, List<(string normalizedForm, string paradigmKey)> forms) ProcessXmlFileAsync(string xmlFilePath)
    {
        var paradigms = new List<ParadigmInfo>();
        var forms = new List<(string normalizedForm, string paradigmKey)>();
        
        _logger.LogInformation("Апрацоўваю файл {file}", xmlFilePath);
        
        var doc = XDocument.Load(xmlFilePath);
        var root = doc.Root;

        if (root == null)
        {
            _logger.LogWarning("Файл {file} не змяшчае каранёвага элемэнта", xmlFilePath);
            return (paradigms, forms);
        }

        // Загружаем парадыгмы
        foreach (var paradigm in root.Elements("Paradigm"))
        {
            var paradigmTag = paradigm.Attribute("tag")?.Value ?? "";
            var paradigmIdStr = paradigm.Attribute("pdgId")?.Value;
            var paradigmMeaning = paradigm.Attribute("meaning")?.Value;

            if (string.IsNullOrEmpty(paradigmIdStr) || !int.TryParse(paradigmIdStr, out var paradigmId))
            {
                _logger.LogWarning("Няправільны ParadigmId у файле {file}", xmlFilePath);
                continue;
            }

            foreach (var variant in paradigm.Elements("Variant"))
            {
                var variantId = variant.Attribute("id")?.Value ?? "";
                var lemma = variant.Attribute("lemma")?.Value ?? "";
                var variantTag = variant.Attribute("tag")?.Value;

                var effectiveTag = variantTag ?? paradigmTag;

                // Дадаем парадыгму
                var paradigmInfo = new ParadigmInfo(
                    ParadigmId: paradigmId,
                    VariantId: variantId,
                    Lemma: lemma,
                    ParadigmTag: effectiveTag,
                    Meaning: paradigmMeaning
                );
                paradigms.Add(paradigmInfo);

                foreach (var form in variant.Elements("Form"))
                {
                    var formTag = form.Attribute("tag")?.Value ?? "";
                    var formValue = form.Value;

                    if (!string.IsNullOrEmpty(formValue))
                    {
                        // Нармалізуем форму для індэксаваньня
                        var normalizedForm = Normalizer.GrammarDbAggressiveNormalize(formValue);

                        forms.Add((normalizedForm, $"{paradigmId}{variantId}|{formTag}"));
                    }
                }
            }
        }

        return (paradigms, forms);
    }

    private async Task InsertParadigmsInBatchesAsync(List<ParadigmInfo> paradigms)
    {
        if (paradigms.Count == 0) return;

        const int batchSize = 400;
        var totalBatches = (paradigms.Count + batchSize - 1) / batchSize;
        
        _logger.LogInformation("Устаўляю {count} парадыгм па {batchSize} у батчы (усяго батчаў: {totalBatches})", 
            paradigms.Count, batchSize, totalBatches);

        using var connection = new SqliteConnection($"Data Source={_outputDbPath}");
        await connection.OpenAsync();

        for (int i = 0; i < paradigms.Count; i += batchSize)
        {
            var batch = paradigms.Skip(i).Take(batchSize).ToList();
            await InsertParadigmsBatchAsync(connection, batch);
            
            var currentBatch = (i / batchSize) + 1;
            _logger.LogInformation("Устаўлены батч парадыгм {currentBatch}/{totalBatches} ({count} запісаў)", 
                currentBatch, totalBatches, batch.Count);
        }
    }

    private async Task InsertParadigmsBatchAsync(SqliteConnection connection, List<ParadigmInfo> batch)
    {
        try
        {
            using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync();

            var insertSql = @"
                INSERT INTO Paradigms (ParadigmId, VariantId, Lemma, ParadigmTag, Meaning)
                VALUES (@ParadigmId, @VariantId, @Lemma, @ParadigmTag, @Meaning)";

            using var command = new SqliteCommand(insertSql, connection);
            command.Transaction = transaction;

            // Дадаем парамэтры
            command.Parameters.Add("@ParadigmId", SqliteType.Integer);
            command.Parameters.Add("@VariantId", SqliteType.Text);
            command.Parameters.Add("@Lemma", SqliteType.Text);
            command.Parameters.Add("@ParadigmTag", SqliteType.Text);
            command.Parameters.Add("@Meaning", SqliteType.Text);

            foreach (var paradigm in batch)
            {
                command.Parameters["@ParadigmId"].Value = paradigm.ParadigmId;
                command.Parameters["@VariantId"].Value = paradigm.VariantId;
                command.Parameters["@Lemma"].Value = paradigm.Lemma;
                command.Parameters["@ParadigmTag"].Value = paradigm.ParadigmTag;
                command.Parameters["@Meaning"].Value = paradigm.Meaning ?? (object)DBNull.Value;

                await command.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 19) // UNIQUE constraint failed
        {
            _logger.LogWarning("UNIQUE constraint failed у батчы парадыгм. Перабіраю запісы па адным і ігнарую дублікаты...");
            await InsertParadigmsBatchWithDuplicateHandlingAsync(connection, batch);
        }
    }

    private async Task InsertParadigmsBatchWithDuplicateHandlingAsync(SqliteConnection connection, List<ParadigmInfo> batch)
    {
        var insertSql = @"
            INSERT INTO Paradigms (ParadigmId, VariantId, Lemma, ParadigmTag, Meaning)
            VALUES (@ParadigmId, @VariantId, @Lemma, @ParadigmTag, @Meaning)";

        using var command = new SqliteCommand(insertSql, connection);

        // Дадаем парамэтры
        command.Parameters.Add("@ParadigmId", SqliteType.Integer);
        command.Parameters.Add("@VariantId", SqliteType.Text);
        command.Parameters.Add("@Lemma", SqliteType.Text);
        command.Parameters.Add("@ParadigmTag", SqliteType.Text);
        command.Parameters.Add("@Meaning", SqliteType.Text);

        var insertedCount = 0;
        var skippedCount = 0;

        foreach (var paradigm in batch)
        {
            try
            {
                command.Parameters["@ParadigmId"].Value = paradigm.ParadigmId;
                command.Parameters["@VariantId"].Value = paradigm.VariantId;
                command.Parameters["@Lemma"].Value = paradigm.Lemma;
                command.Parameters["@ParadigmTag"].Value = paradigm.ParadigmTag;
                command.Parameters["@Meaning"].Value = paradigm.Meaning ?? (object)DBNull.Value;

                await command.ExecuteNonQueryAsync();
                insertedCount++;
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
            {
                skippedCount++;
                _logger.LogDebug("Прапушчаны дублікат парадыгмы: ParadigmId={paradigmId}, VariantId='{variantId}'", 
                    paradigm.ParadigmId, paradigm.VariantId);
            }
        }

        _logger.LogInformation("Батч парадыгм завершаны: устаўлена {inserted}, прапушчана {skipped} дублікатаў", insertedCount, skippedCount);
    }

    private async Task InsertFormsInBatchesAsync(List<FormInfo> forms)
    {
        if (forms.Count == 0) return;

        const int batchSize = 400;
        var totalBatches = (forms.Count + batchSize - 1) / batchSize;
        
        _logger.LogInformation("Устаўляю {count} форм па {batchSize} у батчы (усяго батчаў: {totalBatches})", 
            forms.Count, batchSize, totalBatches);

        using var connection = new SqliteConnection($"Data Source={_outputDbPath}");
        await connection.OpenAsync();

        for (int i = 0; i < forms.Count; i += batchSize)
        {
            var batch = forms.Skip(i).Take(batchSize).ToList();
            await InsertFormsBatchAsync(connection, batch);
            
            var currentBatch = (i / batchSize) + 1;
            _logger.LogInformation("Устаўлены батч форм {currentBatch}/{totalBatches} ({count} запісаў)", 
                currentBatch, totalBatches, batch.Count);
        }
    }

    private async Task InsertFormsBatchAsync(SqliteConnection connection, List<FormInfo> batch)
    {
        try
        {
            using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync();

            var insertSql = @"
                INSERT INTO Forms (NormalizedForm, Paradigms)
                VALUES (@NormalizedForm, @Paradigms)";

            using var command = new SqliteCommand(insertSql, connection);
            command.Transaction = transaction;

            // Дадаем парамэтры
            command.Parameters.Add("@NormalizedForm", SqliteType.Text);
            command.Parameters.Add("@Paradigms", SqliteType.Text);

            foreach (var form in batch)
            {
                command.Parameters["@NormalizedForm"].Value = form.NormalizedForm;
                command.Parameters["@Paradigms"].Value = form.Paradigms;

                await command.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 19) // UNIQUE constraint failed
        {
            _logger.LogWarning("UNIQUE constraint failed у батчы форм. Перабіраю запісы па адным і ігнарую дублікаты...");
            await InsertFormsBatchWithDuplicateHandlingAsync(connection, batch);
        }
    }

    private async Task InsertFormsBatchWithDuplicateHandlingAsync(SqliteConnection connection, List<FormInfo> batch)
    {
        var insertSql = @"
            INSERT INTO Forms (NormalizedForm, Paradigms)
            VALUES (@NormalizedForm, @Paradigms)";

        using var command = new SqliteCommand(insertSql, connection);

        // Дадаем парамэтры
        command.Parameters.Add("@NormalizedForm", SqliteType.Text);
        command.Parameters.Add("@Paradigms", SqliteType.Text);

        var insertedCount = 0;
        var skippedCount = 0;

        foreach (var form in batch)
        {
            try
            {
                command.Parameters["@NormalizedForm"].Value = form.NormalizedForm;
                command.Parameters["@Paradigms"].Value = form.Paradigms;

                await command.ExecuteNonQueryAsync();
                insertedCount++;
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
            {
                skippedCount++;
                _logger.LogDebug("Прапушчаны дублікат формы: NormalizedForm='{form}', FormTag='{formTag}'", 
                    form.NormalizedForm);
            }
        }

        _logger.LogInformation("Батч форм завершаны: устаўлена {inserted}, прапушчана {skipped} дублікатаў", insertedCount, skippedCount);
    }
}

class Program
{
    static async Task Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;

        if (args.Length != 2)
        {
            Console.WriteLine("Выкарыстаньне: GrammarDbConverter <input_directory> <output_db_path>");
            Console.WriteLine("Прыклад: GrammarDbConverter C:\\grammar_xml C:\\grammar.db");
            return;
        }

        var inputDirectory = args[0];
        var outputDbPath = args[1];

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
        var converter = new GrammarDbConverter(logger, outputDbPath);

        try
        {
            await converter.ConvertAsync(inputDirectory);
            Console.WriteLine($"Канвэртаваньне завершана! База даных створана: {outputDbPath}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Памылка падчас канвэртаваньня");
            Console.WriteLine($"Памылка: {ex.Message}");
        }
    }
}
