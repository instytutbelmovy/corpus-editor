using Editor.Domain;
using Editor.Domain.Corpus;
using Editor.Services.Corpus;
using Editor.Services.Exceptions;
using Editor.Services.Grammar;
using Editor.Services.Linguistics;

namespace Editor.Services.Registry;

/// <summary>
/// Здымак аднаго слова, зроблены пад блякаваньнем. Трымае толькі значэньні, а не спасылкі на дрэва:
/// пакуль Stanza думае, рэдактар можа дакумэнт перабудаваць, і спасылкі сталі б несапраўднымі.
/// </summary>
public readonly record struct WordSnapshot(
    int ParagraphId,
    Guid ParagraphStamp,
    int SentenceId,
    Guid SentenceStamp,
    int ItemIndex,
    string Text,
    bool Unresolved);

public interface ITaggingService
{
    /// <summary> Сынхронныя праверкі перад даданьнем у чаргу. Вяртае назву дакумэнту для радка заданьня. </summary>
    ValueTask<string> PreflightTag(int n);

    ValueTask<ICollection<CorpusDocumentHeader>> GetTaggableDocuments();

    Task TagDocument(int n, Action<UploadProgress>? progress = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Перазьметка ўжо захаванага дакумэнту праз Stanza.
/// Кранае толькі нявырашаныя словы: усё, што ўжо вырашана - рэдактарам, ГрамБазай ці ранейшым праходам - застаецца як было.
/// </summary>
public partial class TaggingService(
    IGrammarDb grammarDb,
    IAwsFilesCache awsFilesCache,
    IStanzaTagger stanzaTagger,
    ILogger<TaggingService> logger) : ITaggingService
{
    public async ValueTask<string> PreflightTag(int n)
    {
        if (n < 0)
            throw new BadRequestException("Нумар дакумэнту мусіць быць дадатны");

        if (!stanzaTagger.IsEnabled)
            throw new BadRequestException("Stanza не наладжаная");

        // Кідае NotFoundException, калі дакумэнту няма
        var header = await awsFilesCache.GetDocumentHeader(n);
        return header.Title ?? n.ToString();
    }

    public ValueTask<ICollection<CorpusDocumentHeader>> GetTaggableDocuments()
    {
        if (!stanzaTagger.IsEnabled)
            throw new BadRequestException("Stanza не наладжаная");

        return awsFilesCache.GetAllDocumentHeaders();
    }

    public async Task TagDocument(int n, Action<UploadProgress>? progress = null, CancellationToken cancellationToken = default)
    {
        if (!stanzaTagger.IsEnabled)
            throw new BadRequestException("Stanza не наладжаная");

        // Этап 1: здымак пад блякаваньнем. Кароткі - толькі адзін абыход дрэва
        progress?.Invoke(new UploadProgress(UploadJobStage.Loading, 0, 0));

        List<WordSnapshot> snapshots;
        StanzaInput? input;

        var (readLock, document) = await awsFilesCache.GetFileForWrite(n, markPendingChangesUponCompletion: false);
        using (readLock)
        {
            snapshots = Snapshot(document.Paragraphs);
            input = stanzaTagger.Prepare(document.Paragraphs, snapshots.Count);
        }

        var unresolvedCount = snapshots.Count(s => s.Unresolved);
        if (unresolvedCount == 0 || input is null)
        {
            LogNothingToTag(n, snapshots.Count);
            return;
        }

        // Этап 2: доўгая праца без блякаваньня - рэдактары тым часам працуюць з дакумэнтам як звычайна
        progress?.Invoke(new UploadProgress(UploadJobStage.LookingUpGrammar, 0, snapshots.Count));

        var words = new List<string>(unresolvedCount);
        foreach (var snapshot in snapshots)
            if (snapshot.Unresolved)
                words.Add(snapshot.Text);

        var lookups = await grammarDb.LookupWords(words, cancellationToken);

        var hints = await stanzaTagger.Run(
            input,
            tagged => progress?.Invoke(new UploadProgress(UploadJobStage.Tagging, tagged, snapshots.Count)),
            cancellationToken);

        // Этап 3: прыкладаньне пад блякаваньнем. Таксама кароткае, разам з адзіным скідам у сховішча
        progress?.Invoke(new UploadProgress(UploadJobStage.Saving, snapshots.Count, snapshots.Count));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (writeLock, target) = await awsFilesCache.GetFileForWrite(n, markPendingChangesUponCompletion: false);
        using (writeLock)
        {
            var applied = ApplyHints(target, snapshots, hints, lookups, today);
            await awsFilesCache.FlushFile(n);
            LogTagged(n, applied, unresolvedCount);
        }
    }

    /// <summary> Абыход дрэва ў тым самым парадку, што і CollectWordSlots - таму нумары словаў супадаюць з падказкамі Stanza. </summary>
    public static List<WordSnapshot> Snapshot(List<Paragraph> paragraphs)
    {
        var snapshots = new List<WordSnapshot>();

        foreach (var paragraph in paragraphs)
            foreach (var sentence in paragraph.Sentences)
                for (var i = 0; i < sentence.SentenceItems.Count; i++)
                {
                    var item = sentence.SentenceItems[i];
                    if (item.Type != SentenceItemType.Word)
                        continue;

                    snapshots.Add(new WordSnapshot(
                        paragraph.Id,
                        paragraph.ConcurrencyStamp,
                        sentence.Id,
                        sentence.ConcurrencyStamp,
                        i,
                        item.Text,
                        item.Metadata is not { ResolvedOn: not null }));
                }

        return snapshots;
    }

    /// <summary>
    /// Прыкладае падказкі да дакумэнту. Чыстая функцыя - правяраецца бяз базы, S3 і HTTP.
    /// Слова прапускаецца, калі дакумэнт пасьпелі зьмяніць: не супадаюць пазнакі паралелізму, зьмяніўся тэкст, ці слова ўжо вырашылі.
    /// Вяртае колькасьць разьмечаных словаў.
    /// </summary>
    public static int ApplyHints(
        CorpusDocument document,
        IReadOnlyList<WordSnapshot> snapshots,
        StanzaToken?[]? hints,
        IReadOnlyDictionary<string, List<GrammarInfo>> lookups,
        DateOnly today)
    {
        var paragraphs = document.Paragraphs;
        var applied = 0;

        for (var i = 0; i < snapshots.Count; i++)
        {
            var snapshot = snapshots[i];
            if (!snapshot.Unresolved)
                continue;

            var paragraphIndex = snapshot.ParagraphId - 1;
            if (paragraphIndex < 0 || paragraphs.Count <= paragraphIndex)
                continue;

            var paragraph = paragraphs[paragraphIndex];
            if (paragraph.ConcurrencyStamp != snapshot.ParagraphStamp)
                continue;

            var sentenceIndex = snapshot.SentenceId - 1;
            if (sentenceIndex < 0 || paragraph.Sentences.Count <= sentenceIndex)
                continue;

            var sentence = paragraph.Sentences[sentenceIndex];
            if (sentence.ConcurrencyStamp != snapshot.SentenceStamp)
                continue;

            var items = sentence.SentenceItems;
            if (snapshot.ItemIndex < 0 || items.Count <= snapshot.ItemIndex)
                continue;

            var item = items[snapshot.ItemIndex];
            if (item.Type != SentenceItemType.Word || item.Text != snapshot.Text)
                continue;

            // Пазнакі паралелізму ловяць толькі структурныя праўкі: разьметка аднаго слова мяняе элемэнт на месцы, не чапаючы пазнакі сказу
            if (item.Metadata is { ResolvedOn: not null })
                continue;

            var candidates = lookups.TryGetValue(item.Text, out var c) ? c : [];
            var resolution = GrammarResolver.Resolve(candidates, hints?[i], today);

            items[snapshot.ItemIndex] = item with
            {
                ParadigmFormId = resolution.ParadigmFormId,
                Lemma = resolution.Lemma,
                LinguisticTag = resolution.LinguisticTag,
                Metadata = MergeMetadata(item.Metadata, resolution.Metadata),
            };

            applied++;
        }

        return applied;
    }

    /// <summary> Тып памылкі ставіць рэдактар - пераносім яго ў новыя мэтаданыя, якія GrammarResolver складае з нуля. </summary>
    private static LinguisticItemMetadata? MergeMetadata(LinguisticItemMetadata? existing, LinguisticItemMetadata? fresh)
    {
        var errorType = existing?.ErrorType ?? LinguisticErrorType.None;

        if (fresh is null)
            return errorType == LinguisticErrorType.None ? null : new LinguisticItemMetadata(null, null, errorType);

        return fresh with { ErrorType = errorType };
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Document {N}: nothing to tag ({TotalWords} words, all resolved)")]
    private partial void LogNothingToTag(int n, int totalWords);

    [LoggerMessage(Level = LogLevel.Information, Message = "Document {N}: tagged {Applied} of {Unresolved} unresolved words")]
    private partial void LogTagged(int n, int applied, int unresolved);
}
