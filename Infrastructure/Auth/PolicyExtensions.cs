namespace Editor;

public static class PolicyExtensions
{
    public const string ViewerPolicy = "RequireViewer";
    public const string EditorPolicy = "RequireEditor";
    public const string AdminPolicy = "RequireAdmin";

    public static TBuilder Viewer<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder
        => builder.RequireAuthorization(ViewerPolicy);

    public static TBuilder Editor<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder
        => builder.RequireAuthorization(EditorPolicy);

    public static TBuilder Admin<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder
        => builder.RequireAuthorization(AdminPolicy);
}