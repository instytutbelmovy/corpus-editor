using System.Net;

namespace Editor;

public static class ExceptionMiddleware
{
    private static ILogger _logger = null!;

    public static void Initialize(ILogger logger)
    {
        _logger = logger;
    }

    public static async Task HandleException(HttpContext context, Func<Task> next)
    {
        try
        {
            await next();
        }
        catch (ConflictException e)
        {
            LogError(e);
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
        }
        catch (BadRequestException e)
        {
            LogError(e);
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        }
        catch (Exception e) when (e is FileNotFoundException or NotFoundException)
        {
            LogError(e);
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
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
}