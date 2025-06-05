namespace Editor;

public record SentenceItem(
    string Text,
    SentenceItemType Type,
    bool GlueNext = false
);