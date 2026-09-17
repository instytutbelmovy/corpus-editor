namespace Editor.Api.Infrastructure;

/// <summary> Marker metadata telling AuditMiddleware to skip request/response body capture for an endpoint. </summary>
public sealed class SensitiveBodyMetadata
{
    public static readonly SensitiveBodyMetadata Instance = new();
}

public static class SensitiveEndpointExtensions
{
    /// <summary> Call on endpoints whose request or response body carries credentials or tokens (passwords, reset tokens, etc.). </summary>
    public static TBuilder Sensitive<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder
        => builder.WithMetadata(SensitiveBodyMetadata.Instance);
}
