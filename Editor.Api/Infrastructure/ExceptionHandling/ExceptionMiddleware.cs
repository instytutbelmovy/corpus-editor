using System.Net;
using System.Text.Json;
using Editor.Services.Exceptions;

namespace Editor.Api.Infrastructure;

public static partial class ExceptionMiddleware
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
        catch (LockedException e)
        {
            var statusCode = (int)HttpStatusCode.Locked;
            LogInfo(e, statusCode);
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = statusCode;
                await JsonSerializer.SerializeAsync(context.Response.BodyWriter, new ErrorResponse(statusCode, e.Message), InfrastructureJsonSerializerContext.Default.ErrorResponse);
            }
        }
        catch (ServiceUnavailableException e)
        {
            var statusCode = (int)HttpStatusCode.ServiceUnavailable;
            LogWarning(e, statusCode);
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
        LogUnhandledException(_logger, e);
    }

    private static void LogWarning(Exception e, int? statusCode = null)
    {
        if (statusCode.HasValue)
            LogWarningWithStatus(_logger, statusCode.Value, e.Message);
        else
            LogWarningPlain(_logger, e.Message);
    }

    private static void LogInfo(Exception e, int? statusCode = null)
    {
        if (statusCode.HasValue)
            LogInfoWithStatus(_logger, statusCode.Value, e.Message);
        else
            LogInfoPlain(_logger, e.Message);
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception")]
    private static partial void LogUnhandledException(ILogger logger, Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "{StatusCode}: {Message}")]
    private static partial void LogWarningWithStatus(ILogger logger, int statusCode, string message);

    [LoggerMessage(Level = LogLevel.Warning, Message = "{Message}")]
    private static partial void LogWarningPlain(ILogger logger, string message);

    [LoggerMessage(Level = LogLevel.Information, Message = "{StatusCode}: {Message}")]
    private static partial void LogInfoWithStatus(ILogger logger, int statusCode, string message);

    [LoggerMessage(Level = LogLevel.Information, Message = "{Message}")]
    private static partial void LogInfoPlain(ILogger logger, string message);
}

public record ErrorResponse(int Code, string Message);