namespace Editor.Domain.Corpus;

public record SentenceItem(
    string Text,
    SentenceItemType Type,
    bool GlueNext = false
);