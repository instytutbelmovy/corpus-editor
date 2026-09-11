namespace Editor.Api.Infrastructure;

/// <summary>
/// Adds baseline security response headers to every response. Registered early in the pipeline
/// (before the SPA static assets) so both API responses and SPA files carry the headers.
/// </summary>
public static class SecurityHeadersMiddleware
{
    // Cloudflare Turnstile needs challenges.cloudflare.com (script + frame); the FE Sentry DSN posts
    // to the sentry.io ingest host (connect-src). style-src allows 'unsafe-inline' because the
    // exported Next.js SPA ships inline styles - tighten to nonces/hashes if the export is later reworked.
    private const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'; " +
        "img-src 'self' data:; " +
        "style-src 'self' 'unsafe-inline'; " +
        "script-src 'self' https://challenges.cloudflare.com; " +
        "frame-src https://challenges.cloudflare.com; " +
        "connect-src 'self' https://*.ingest.de.sentry.io";

    // Denies every feature the app doesn't use. All browsing-context lists are empty ("()"),
    // i.e. disabled even for same-origin, since none of these are needed by the SPA or Turnstile.
    private const string PermissionsPolicy =
        "accelerometer=(), " +
        "camera=(), " +
        "geolocation=(), " +
        "gyroscope=(), " +
        "magnetometer=(), " +
        "microphone=(), " +
        "payment=(), " +
        "usb=()";

    public static Task Handle(HttpContext context, Func<Task> next)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Content-Security-Policy"] = ContentSecurityPolicy;
        headers["Permissions-Policy"] = PermissionsPolicy;
        return next();
    }
}
