using System.Net;
using Editor;

public static class ExceptionMiddleware
{
    private static IWebHostEnvironment _environment = null!;
    private static ILogger _logger;

    public static void Initialize(IWebHostEnvironment environment, ILogger logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public static async Task HandleException(HttpContext context, Func<Task> next)
    {
        try
        {
            await next();
        }
        catch (ConflictException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
        }
        catch (BadRequestException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        }
        catch (Exception e) when (e is FileNotFoundException or NotFoundException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
        }
    }

    private static void LogError(Exception e)
    {
        if (_environment.IsDevelopment())
            _logger.LogError(e, "Unhandled exception");
    }
}