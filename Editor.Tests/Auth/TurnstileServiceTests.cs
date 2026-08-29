using System.Net;
using System.Text;
using Editor.Services.Auth;
using Microsoft.Extensions.Logging.Abstractions;

namespace Editor.Tests.Auth;

public class TurnstileServiceTests
{
    private static TurnstileService CreateService(TurnstileSettings settings, HttpMessageHandler? handler = null)
    {
        var httpClient = new HttpClient(handler ?? new StubHttpMessageHandler(HttpStatusCode.OK, "{}"));
        return new TurnstileService(httpClient, settings, NullLogger<TurnstileService>.Instance);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsTrue_WhenNotEnforced_WithoutCallingHttpClient()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.InternalServerError, "");
        var service = CreateService(new TurnstileSettings { IsEnforced = false }, handler);

        var result = await service.VerifyTokenAsync("any-token");

        Assert.True(result);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsFalse_WhenTokenIsEmpty_WithoutCallingHttpClient()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, """{"success":true}""");
        var service = CreateService(new TurnstileSettings { SecretKey = "secret" }, handler);

        var result = await service.VerifyTokenAsync("");

        Assert.False(result);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsFalse_WhenSecretKeyIsEmpty_WithoutCallingHttpClient()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, """{"success":true}""");
        var service = CreateService(new TurnstileSettings { SecretKey = "" }, handler);

        var result = await service.VerifyTokenAsync("some-token");

        Assert.False(result);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsTrue_WhenSiteverifyReturnsSuccess()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, """{"success":true}""");
        var service = CreateService(new TurnstileSettings { SecretKey = "secret" }, handler);

        var result = await service.VerifyTokenAsync("valid-token");

        Assert.True(result);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsFalse_WhenSiteverifyReturnsFailure()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, """{"success":false,"error-codes":["invalid-input-response"]}""");
        var service = CreateService(new TurnstileSettings { SecretKey = "secret" }, handler);

        var result = await service.VerifyTokenAsync("invalid-token");

        Assert.False(result);
    }

    [Fact]
    public async Task VerifyTokenAsync_ReturnsFalse_WhenSiteverifyReturnsNonSuccessStatusCode()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.InternalServerError, "");
        var service = CreateService(new TurnstileSettings { SecretKey = "secret" }, handler);

        var result = await service.VerifyTokenAsync("some-token");

        Assert.False(result);
    }

    [Fact]
    public async Task VerifyTokenAsync_ParsesKebabCaseErrorCodes()
    {
        var capturingHandler = new CapturingHttpMessageHandler(HttpStatusCode.OK, """{"success":false,"error-codes":["timeout-or-duplicate"]}""");
        var service = CreateService(new TurnstileSettings { SecretKey = "secret" }, capturingHandler);

        await service.VerifyTokenAsync("spent-token", "203.0.113.5");

        Assert.Contains("secret=secret", capturingHandler.CapturedRequestBody);
        Assert.Contains("response=spent-token", capturingHandler.CapturedRequestBody);
        Assert.Contains("remoteip=203.0.113.5", capturingHandler.CapturedRequestBody);
    }

    private class StubHttpMessageHandler(HttpStatusCode statusCode, string responseBody) : HttpMessageHandler
    {
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            });
        }
    }

    private class CapturingHttpMessageHandler(HttpStatusCode statusCode, string responseBody) : HttpMessageHandler
    {
        public string? CapturedRequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedRequestBody = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            };
        }
    }
}
