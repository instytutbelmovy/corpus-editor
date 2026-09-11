using System.Net;
using System.Text;
using Editor.Services.Linguistics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Editor.Tests.Linguistics;

public class StanzaServiceTests
{
    private static readonly IReadOnlyList<IReadOnlyList<string>> TwoSentences =
    [
        ["Што", "такое", "строй", "?"],
        ["Гэта", "адказ", "."],
    ];

    private const string GoodResponse = """
        {"sentences":[
          [{"upos":"PRON","lemma":"што"},{"upos":"ADJ","lemma":"такі"},
           {"upos":"NOUN","lemma":"строй"},{"upos":"PUNCT","lemma":"?"}],
          [{"upos":"PRON","lemma":"гэта"},{"upos":"NOUN","lemma":"адказ"},
           {"upos":"PUNCT","lemma":"."}]
        ]}
        """;

    private static StanzaService CreateService(StanzaSettings settings, HttpMessageHandler? handler = null)
        => new(new HttpClient(handler ?? new StubHttpMessageHandler(HttpStatusCode.OK, GoodResponse)),
            settings, NullLogger<StanzaService>.Instance);

    private static StanzaSettings Enabled() => new() { BaseUrl = "http://stanza.test" };

    [Fact]
    public async Task Tag_WhenBaseUrlIsEmpty_ReturnsNullWithoutCallingTheService()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, GoodResponse);
        var service = CreateService(new StanzaSettings(), handler);

        Assert.False(service.IsEnabled);
        Assert.Null(await service.Tag(TwoSentences));
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task Tag_WhenExplicitlyDisabled_ReturnsNullWithoutCallingTheService()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, GoodResponse);
        var service = CreateService(new StanzaSettings { BaseUrl = "http://stanza.test", Enabled = false }, handler);

        Assert.Null(await service.Tag(TwoSentences));
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task Tag_HappyPath_PreservesOrderAndParsesFields()
    {
        var result = await CreateService(Enabled()).Tag(TwoSentences);

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal(4, result[0].Count);
        Assert.Equal(3, result[1].Count);
        Assert.Equal(new StanzaToken("PRON", "што"), result[0][0]);
        Assert.Equal(new StanzaToken("NOUN", "строй"), result[0][2]);
        Assert.Equal(new StanzaToken("NOUN", "адказ"), result[1][1]);
    }

    [Fact]
    public async Task Tag_SendsPretokenizedSentencesInOrder()
    {
        var handler = new CapturingHttpMessageHandler(HttpStatusCode.OK, GoodResponse);

        await CreateService(Enabled(), handler).Tag(TwoSentences);

        Assert.NotNull(handler.CapturedRequestBody);
        Assert.Contains("""["Што","такое","строй","?"]""", handler.CapturedRequestBody);
        Assert.Contains("""["Гэта","адказ","."]""", handler.CapturedRequestBody);
        Assert.Equal("http://stanza.test/tag", handler.CapturedUri);
    }

    [Fact]
    public async Task Tag_TrimsTrailingSlashFromBaseUrl()
    {
        var handler = new CapturingHttpMessageHandler(HttpStatusCode.OK, GoodResponse);

        await CreateService(new StanzaSettings { BaseUrl = "http://stanza.test/" }, handler).Tag(TwoSentences);

        Assert.Equal("http://stanza.test/tag", handler.CapturedUri);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.BadRequest)]
    public async Task Tag_OnErrorStatus_ReturnsNull(HttpStatusCode status)
    {
        var service = CreateService(Enabled(), new StubHttpMessageHandler(status, ""));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_WhenServiceIsUnreachable_ReturnsNull()
    {
        var service = CreateService(Enabled(), new ThrowingHttpMessageHandler(new HttpRequestException("connection refused")));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_OnTimeout_ReturnsNull()
    {
        // HttpClient пры вычарпаным таймаўце кідае менавіта TaskCanceledException
        var service = CreateService(Enabled(), new ThrowingHttpMessageHandler(new TaskCanceledException("timed out")));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_OnMalformedJson_ReturnsNull()
    {
        var service = CreateService(Enabled(), new StubHttpMessageHandler(HttpStatusCode.OK, "not json at all"));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_WhenSentenceCountDiffers_ReturnsNull()
    {
        // Выраўноўваньне ідзе строга па індэксах, таму разыходнасьць робіць увесь кавалак непрыдатным
        const string oneSentence = """{"sentences":[[{"upos":"PRON","lemma":"што"}]]}""";
        var service = CreateService(Enabled(), new StubHttpMessageHandler(HttpStatusCode.OK, oneSentence));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_WhenWordCountDiffersWithinASentence_ReturnsNull()
    {
        const string shortSentence = """
            {"sentences":[
              [{"upos":"PRON","lemma":"што"}],
              [{"upos":"PRON","lemma":"гэта"},{"upos":"NOUN","lemma":"адказ"},{"upos":"PUNCT","lemma":"."}]
            ]}
            """;
        var service = CreateService(Enabled(), new StubHttpMessageHandler(HttpStatusCode.OK, shortSentence));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_WhenResponseHasNoSentences_ReturnsNull()
    {
        var service = CreateService(Enabled(), new StubHttpMessageHandler(HttpStatusCode.OK, "{}"));

        Assert.Null(await service.Tag(TwoSentences));
    }

    [Fact]
    public async Task Tag_WithNoSentences_ReturnsNullWithoutCallingTheService()
    {
        var handler = new StubHttpMessageHandler(HttpStatusCode.OK, GoodResponse);

        Assert.Null(await CreateService(Enabled(), handler).Tag([]));
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task Tag_WhenCallerCancels_PropagatesCancellation()
    {
        // Скасаваньне заданьня мусіць спыняць працу, а не ціха дэградаваць да "без падказак"
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        var service = CreateService(Enabled(), new ThrowingHttpMessageHandler(new TaskCanceledException()));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => service.Tag(TwoSentences, cts.Token));
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
        public string? CapturedUri { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedUri = request.RequestUri?.ToString();
            CapturedRequestBody = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            };
        }
    }

    private class ThrowingHttpMessageHandler(Exception exception) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => throw exception;
    }
}
