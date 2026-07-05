using System.Net;
using System.Text.Json;

namespace Editor;

public static class ExceptionMiddleware
{
    private static ILogger _logger = null!;

    public static void InitializeLogging(ILogger logger) => _logger = logger;

    public static async Task HandleException(HttpContext context, Func<Task> next)
    {
        try
        {
            await next();
        }
        catch (ConflictException e)
        {
            var statusCode = (int)HttpStatusCode.Conflict;
            LogInfo(e, statusCode);
            if (!context.Response.HasStarted)
                context.Response.StatusCode = statusCode;
        }
        catch (UnauthorizedException e)
        {
            var statusCode = (int)HttpStatusCode.Unauthorized;
            LogInfo(e, statusCode);
            if (!context.Response.HasStarted)
                context.Response.StatusCode = statusCode;
        }
        catch (Exception e) when (e is FileNotFoundException or NotFoundException)
        {
            var statusCode = (int)HttpStatusCode.NotFound;
            LogInfo(e, statusCode);
            if (!context.Response.HasStarted)
                context.Response.StatusCode = statusCode;
        }
        catch (Exception e) when (e is BadRequestException or BusinessException or BadHttpRequestException)
        {
            var statusCode = (int)HttpStatusCode.BadRequest;
            LogInfo(e, statusCode);
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = statusCode;
                await JsonSerializer.SerializeAsync(context.Response.BodyWriter, new ErrorResponse(statusCode, e.Message), InfrastructureJsonSerializerContext.Default.ErrorResponse);
            }
        }
        catch (Exception e)
        {
            LogError(e);
            throw;
        }
    }

    private static void LogError(Exception e)
    {
        _logger.LogError(e, "Unhandled exception");
    }

    private static void LogInfo(Exception e, int? statusCode = null)
    {
        if (statusCode.HasValue)
            _logger.LogInformation("{StatusCode}: {message}", statusCode, e.Message);
        else
            _logger.LogInformation(e.Message);
    }
}

public record ErrorResponse(int Code, string Message);