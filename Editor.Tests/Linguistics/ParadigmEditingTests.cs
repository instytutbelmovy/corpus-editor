using Editor.Domain;
using Editor.Domain.Grammar;
using Editor.Services.Exceptions;
using Editor.Services.Grammar;

namespace Editor.Tests.Linguistics;

public class ParadigmEditingTests
{
    private static ParadigmCreateVm Input(string formTag = "NS") => new(
        "сло́ва", "N.....", null,
        [new VariantInput("a", "сло́ва", "", [new FormInput(formTag, "сло́ва")])]);

    [Fact]
    public async Task Copy_RecordsOriginAndPassesHideToAtomicRepositoryOperation()
    {
        var repo = new Repository();
        var result = await new ParadigmService(repo).CopyParadigm(42, Input(), "editor");

        Assert.Equal(42, result.CopiedFromParadigmId);
        Assert.Equal(ParadigmSource.Local, result.Source);
        Assert.False(result.Hidden);
        Assert.Equal((42, "editor"), repo.Copy);
        Assert.Equal(42, repo.Saved!.CopiedFromParadigmId);
        Assert.Equal("N.....", result.Variants[0].Tag);
        Assert.Equal(GrammarIds.LocalParadigmIdBase, result.ParadigmId);
    }

    [Fact]
    public async Task Update_PreservesCopyOriginAndHiddenState()
    {
        var repo = new Repository();
        repo.Existing.Paradigm.Source = ParadigmSource.Local;
        repo.Existing.Paradigm.CopiedFromParadigmId = 42;
        var result = await new ParadigmService(repo).UpdateParadigm(GrammarIds.LocalParadigmIdBase, Input(), null);
        Assert.Equal(42, result.CopiedFromParadigmId);
        Assert.True(result.Hidden);
        Assert.Null(repo.Copy);
    }

    [Fact]
    public async Task UpstreamCannotBeEdited_AndLocalCannotBeCopied()
    {
        var repo = new Repository();
        var service = new ParadigmService(repo);
        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateParadigm(42, Input(), null));
        repo.Existing.Paradigm.Source = ParadigmSource.Local;
        await Assert.ThrowsAsync<BadRequestException>(() => service.CopyParadigm(42, Input(), null));
        Assert.Null(repo.Saved);
    }

    [Fact]
    public async Task MissingCopySourceDoesNotCreateAnything()
    {
        var repo = new Repository { Missing = true };
        await Assert.ThrowsAsync<NotFoundException>(() => new ParadigmService(repo).CopyParadigm(42, Input(), null));
        Assert.Null(repo.Saved);
    }

    [Fact]
    public void Validation_AllowsUninflectedForms_RequiresVariantsAndFormsAndUniqueIds()
    {
        var validator = new ParadigmCreateVmValidator();
        Assert.True(validator.Validate(Input("") with { Tag = "E" }).IsValid);
        Assert.False(validator.Validate(Input() with { Variants = [] }).IsValid);
        Assert.False(validator.Validate(Input() with { Variants = null! }).IsValid);
        var variant = Input().Variants[0];
        Assert.False(validator.Validate(Input() with { Variants = [variant, variant] }).IsValid);
        Assert.False(validator.Validate(Input() with { Variants = [variant with { Forms = [] }] }).IsValid);
    }

    private sealed class Repository : IGrammarEditRepository
    {
        public ParadigmDetail Existing { get; } = new(new Paradigm { ParadigmId = 42, Lemma = "слова", Tag = "N" }, true);
        public bool Missing { get; init; }
        public Paradigm? Saved { get; private set; }
        public (int, string?)? Copy { get; private set; }
        public Task<ParadigmDetail?> GetParadigm(int id, CancellationToken cancellationToken = default) => Task.FromResult(Missing ? null : Existing);
        public Task<int> CreateLocalParadigm(Paradigm paradigm, string? userId, CancellationToken cancellationToken = default)
        {
            Saved = paradigm;
            return Task.FromResult(GrammarIds.LocalParadigmIdBase);
        }
        public Task<int> CreateLocalCopy(Paradigm paradigm, int originalId, string? userId, CancellationToken cancellationToken = default)
        {
            Copy = (originalId, userId);
            return CreateLocalParadigm(paradigm, userId, cancellationToken);
        }
        public Task UpdateLocalParadigm(Paradigm paradigm, string? userId, CancellationToken cancellationToken = default) { Saved = paradigm; return Task.CompletedTask; }
        public Task DeleteLocalParadigm(int id, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task HideParadigm(int id, string? userId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task UnhideParadigm(int id, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<IReadOnlyList<ParadigmDetail>> SearchParadigms(string query, int limit, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
