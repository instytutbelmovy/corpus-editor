using System.Text;
using Amazon.DynamoDBv2.Model;
using Microsoft.IO;

namespace Editor.Api.Infrastructure;

/// <summary>
/// Wraps every /api/* request and writes an HTTP-shaped audit record (method, path, body, user, response) to DynamoDB via AuditQueue,
/// decoupled from the request so a slow/unreachable DynamoDB never affects response latency.
/// </summary>
public sealed class AuditMiddleware(RequestDelegate next, AuditQueue queue)
{
    private const int MaxCapturedBodyBytes = 16 * 1024;
    private static readonly RecyclableMemoryStreamManager StreamManager = new();

    public Task InvokeAsync(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments("/api")
            ? NextWithAudit(context)
            : next(context);
    }

    public async Task NextWithAudit(HttpContext context)
    {
        var sensitive = context.GetEndpoint()?.Metadata.GetMetadata<SensitiveBodyMetadata>() != null;
        var requestBody = await CaptureRequestBody(context, sensitive);

        var originalResponseBody = context.Response.Body;
        await using var bufferedResponseBody = StreamManager.GetStream();
        context.Response.Body = bufferedResponseBody;

        string? exceptionMessage = null;
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            // Rethrown as-is; ExceptionMiddleware (registered outside this one) turns it into the real response.
            // So ResponseCode below may still read the pre-exception default (200) while ExceptionMessage is populated - that combination is itself the signal something went wrong.
            exceptionMessage = ex.Message;
            throw;
        }
        finally
        {
            var responseBody = await CaptureResponseBody(context, bufferedResponseBody, sensitive);

            context.Response.Body = originalResponseBody;
            bufferedResponseBody.Position = 0;
            await bufferedResponseBody.CopyToAsync(originalResponseBody);

            Enqueue(context, requestBody, responseBody, exceptionMessage);
        }
    }

    private static async Task<string> CaptureRequestBody(HttpContext context, bool sensitive)
    {
        var length = context.Request.ContentLength;
        if (length is null or 0)
            return "";

        var contentType = context.Request.ContentType;
        if (!IsCapturable(contentType))
            return $"[[omitted, content-type: {contentType ?? "none"}]]";

        if (length is not { } len || len > MaxCapturedBodyBytes)
            return $"[[omitted, size: {length?.ToString() ?? "unknown"}]]";

        if (sensitive)
            return "[[omitted, sensitive]]";

        context.Request.EnableBuffering();
        context.Request.Body.Position = 0;
        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0;
        return body;
    }

    private static async Task<string> CaptureResponseBody(HttpContext context, MemoryStream buffered, bool sensitive)
    {
        var length = buffered.Length;
        if (length == 0)
            return "";

        var contentType = context.Response.ContentType;
        if (!IsCapturable(contentType))
            return $"[[omitted, content-type: {contentType ?? "none"}]]";

        if (length > MaxCapturedBodyBytes)
            return $"[[omitted, size: {length}]]";

        if (sensitive)
            return "[[omitted, sensitive]]";

        buffered.Position = 0;
        using var reader = new StreamReader(buffered, Encoding.UTF8, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }

    private static bool IsCapturable(string? contentType) =>
        contentType != null &&
        (contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) ||
         contentType.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase));

    private void Enqueue(HttpContext context, string requestBody, string responseBody, string? exceptionMessage)
    {
        var now = DateTime.UtcNow;
        var query = string.Join(",", context.Request.Query.Select(kv => $"{kv.Key}={kv.Value}"));

        queue.TryEnqueue(new Dictionary<string, AttributeValue>
        {
            ["Month"] = new AttributeValue(now.ToString("yyyy-MM")),
            ["DateTime"] = new AttributeValue(now.ToString("O")),
            ["Method"] = new AttributeValue(context.Request.Method),
            ["Path"] = new AttributeValue(context.Request.Path.Value ?? ""),
            ["Query"] = new AttributeValue(query),
            ["RequestContentType"] = new AttributeValue(context.Request.ContentType ?? ""),
            ["RequestContentLength"] = new AttributeValue(context.Request.ContentLength?.ToString() ?? ""),
            ["RequestBody"] = new AttributeValue(requestBody),
            ["UserId"] = new AttributeValue(context.User.GetUserId() ?? ""),
            ["ResponseCode"] = new AttributeValue(context.Response.StatusCode.ToString()),
            ["ResponseBody"] = new AttributeValue(responseBody),
            ["ExceptionMessage"] = new AttributeValue(exceptionMessage ?? ""),
        });
    }
}
