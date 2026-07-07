namespace Editor.Tests.Linguistics;

public class GrammarDbTests
{
    // "кот" і "ката" ужо ў нармалізаваным выглядзе (малыя літары, без націску), таму
    // GrammarDbAggressiveNormalize пакідае іх без зьменаў — ключы супадаюць з зыходнымі словамі.
    private static readonly FormMatch KotNoun = new(1, "a", "NMSNN", "кот", "NMS", "жывёла");
    private static readonly FormMatch KataGen = new(1, "a", "NMSGN", "кот", "NMS", "жывёла");
    private static readonly FormMatch KataOther = new(2, "a", "NFSNN", "ката", "NFS", null);

    private static FakeGrammarRepository Repo() => new(new Dictionary<string, IReadOnlyList<FormMatch>>
    {
        ["кот"] = [KotNoun],
        ["ката"] = [KataGen, KataOther],
    });

    [Fact]
    public async Task LookupWords_MatchesLookupWord_PerWord_AndBatchesInOneCall()
    {
        var repo = Repo();
        var db = new GrammarDb(repo);

        var batch = await db.LookupWordsAsync(["кот", "ката", "невядома"]);

        // Пакетны вынік супадае з паасобным для кожнага слова
        Assert.Equal(await new GrammarDb(Repo()).LookupWordAsync("кот"), batch["кот"]);
        Assert.Equal(await new GrammarDb(Repo()).LookupWordAsync("ката"), batch["ката"]);
        Assert.Empty(batch["невядома"]);

        // Тры словы — адзін зварот да базы, а не тры
        Assert.Equal(1, repo.BatchCallCount);
        Assert.Equal(0, repo.SingleCallCount);
    }

    [Fact]
    public async Task LookupWords_DedupsRepeatedWords()
    {
        var repo = Repo();
        var db = new GrammarDb(repo);

        var batch = await db.LookupWordsAsync(["кот", "кот", "кот"]);

        Assert.Single(batch);
        Assert.Equal([GrammarInfoFor(KotNoun)], batch["кот"]);
        Assert.Equal(1, repo.BatchCallCount);
        // Толькі адна унікальная форма трапляе ў базу
        Assert.Equal(1, Assert.Single(repo.BatchSizes));
    }

    [Fact]
    public async Task LookupWords_MergesCustomWords()
    {
        var repo = Repo();
        var db = new GrammarDb(repo);
        var custom = new GrammarInfo(null, new LinguisticTag("NMS", "NMSNN"), "кот", null);
        db.AddCustomWord("кот", custom);

        var batch = await db.LookupWordsAsync(["кот"]);

        Assert.Equal([GrammarInfoFor(KotNoun), custom], batch["кот"]);
    }

    [Fact]
    public async Task LookupWords_SkipsCustomWords_WhenNotRequested()
    {
        var repo = Repo();
        var db = new GrammarDb(repo);
        db.AddCustomWord("кот", new GrammarInfo(null, new LinguisticTag("NMS", "NMSNN"), "кот", null));

        var batch = await db.LookupWordsAsync(["кот"], pickCustomWords: false);

        Assert.Equal([GrammarInfoFor(KotNoun)], batch["кот"]);
    }

    [Fact]
    public async Task InferGrammarInfo_List_MatchesStringOverload()
    {
        var db = new GrammarDb(Repo());

        // Адназначнае слова — вяртаецца адзіны кандыдат
        Assert.Equal(await db.InferGrammarInfoAsync("кот"), db.InferGrammarInfo(await db.LookupWordAsync("кот")));
        // Неадназначнае — вяртаецца перасячэньне
        Assert.Equal(await db.InferGrammarInfoAsync("ката"), db.InferGrammarInfo(await db.LookupWordAsync("ката")));
    }

    [Fact]
    public void InferGrammarInfo_List_Empty_ReturnsNulls()
    {
        var db = new GrammarDb(Repo());

        var (paradigmFormId, lemma, tag) = db.InferGrammarInfo([]);

        Assert.Null(paradigmFormId);
        Assert.Null(lemma);
        Assert.Null(tag);
    }

    private static GrammarInfo GrammarInfoFor(FormMatch m) => new(
        new ParadigmFormId(m.ParadigmId, m.VariantId, m.FormTag),
        new LinguisticTag(m.EffectiveTag, m.FormTag),
        m.Lemma,
        m.Meaning);

    private sealed class FakeGrammarRepository(Dictionary<string, IReadOnlyList<FormMatch>> data) : IGrammarRepository
    {
        public int SingleCallCount;
        public int BatchCallCount;
        public readonly List<int> BatchSizes = [];

        public Task<IReadOnlyList<FormMatch>> LookupByNormalizedFormAsync(string normalizedForm, CancellationToken cancellationToken = default)
        {
            SingleCallCount++;
            return Task.FromResult(data.TryGetValue(normalizedForm, out var m) ? m : []);
        }

        public Task<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>> LookupByNormalizedFormsAsync(IReadOnlyCollection<string> normalizedForms, CancellationToken cancellationToken = default)
        {
            var distinct = normalizedForms.Distinct().ToArray();
            BatchCallCount++;
            BatchSizes.Add(distinct.Length);

            var result = new Dictionary<string, IReadOnlyList<FormMatch>>();
            foreach (var f in distinct)
                if (data.TryGetValue(f, out var m))
                    result[f] = m;
            return Task.FromResult<IReadOnlyDictionary<string, IReadOnlyList<FormMatch>>>(result);
        }

        public Task<(string Lemma, string EffectiveTag)?> GetVariantAsync(int paradigmId, string? variantId, CancellationToken cancellationToken = default) =>
            Task.FromResult<(string Lemma, string EffectiveTag)?>(null);

        public Task<bool> HasDataAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
    }
}
