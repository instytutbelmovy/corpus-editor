using System.Net;
using Editor;

public static class ExceptionMiddleware
{
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
}