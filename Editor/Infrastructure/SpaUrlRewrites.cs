using Microsoft.AspNetCore.Rewrite;

namespace Editor;

internal static class SpaUrlRewrites
{
    private static bool _initialized;
    private static readonly object Lock = new object();
    private static readonly PathString Api = "/api";
    private static readonly PathString Root = "/";
    private static readonly PathString Index = "/index.html";
    private static List<SegmentMatcher> _matchers = null!;

    public static void DoRewrite(RewriteContext context, IServiceProvider serviceProvider)
    {
        // The purpose and magic here is to make it so that dotnet BE would be returning react html files for matching request paths
        // e.g.
        //   /       => /index.html
        //   /docs/2 => /docs/[id]/index.html
        //
        // for this to work we build a cache from the static file paths that dotnet has stored metadata for (MapStaticAssets).

        context.Result = RuleResult.SkipRemainingRules;
        if (context.HttpContext.Request.Path.StartsWithSegments(Api))
            return;
        if (context.HttpContext.Request.Path == Root)
        {
            context.HttpContext.Request.Path = Index;
            return;
        }
        EnsureInitialized(serviceProvider);
        for (var i = 0; i < _matchers.Count; i++)
        {
            var pattern = _matchers[i];
            if (pattern.TryMatch(context.HttpContext.Request.Path.Value.AsSpan(1), out var rewrite))
            {
                context.HttpContext.Request.Path = rewrite;
                return;
            }
        }
    }

    private static void EnsureInitialized(IServiceProvider serviceProvider)
    {
        if (_initialized) return;
        lock (Lock)
        {
            if (_initialized) return;

            var endpoints = serviceProvider
                .GetServices<EndpointDataSource>()
                .SelectMany(x => x.Endpoints)
                .OfType<RouteEndpoint>()
                .Select(x => x.RoutePattern.RawText)
                .Where(x => x != null && x.EndsWith("/index.html"));
            var matchers = new List<SegmentMatcher>();
            var root = new SegmentMatcher(null, null) { Children = matchers };
            foreach (var endpoint in endpoints)
            {
                var segments = endpoint!.Split('/');
                SegmentMatcher current = root;
                for (int i = 0; i < segments.Length - 1; i++)
                {
                    var segment = segments[i];
                    if (segment.StartsWith("[") && segment.EndsWith("]"))
                        segment = null;
                    var rewrite = i == segments.Length - 2 ? endpoint : null;
                    var foundChild = current.Children?.FirstOrDefault(x => x.Pattern == segment);
                    if (foundChild == null)
                    {
                        foundChild = new SegmentMatcher(segment, rewrite);
                        (current.Children ??= []).Add(foundChild);
                    }
                    else if (rewrite != null)
                        foundChild.Rewrite = "/" + rewrite;
                    current = foundChild;
                }
            }

            _matchers = matchers;
            _initialized = true;
        }
    }

    private class SegmentMatcher(string? pattern, string? rewrite)
    {
        private readonly bool _isDigits = pattern == null;

        public string? Pattern { get; } = pattern;
        public List<SegmentMatcher>? Children { get; set; }
        public string? Rewrite { get; set; } = rewrite;

        public bool TryMatch(ReadOnlySpan<char> path, out PathString rewrite)
        {
            bool matchesThis;
            int endOfMatch = -1;
            if (_isDigits)
            {
                do
                {
                    ++endOfMatch;
                }
                while (endOfMatch < path.Length && char.IsDigit(path[endOfMatch]));
                --endOfMatch;
                matchesThis = endOfMatch != -1 && (endOfMatch == path.Length - 1 || path[endOfMatch + 1] == '/');
            }
            else
            {
                // if we are here than it's not digit === Pattern is not null
                matchesThis = path.StartsWith(Pattern.AsSpan(), StringComparison.OrdinalIgnoreCase) && (path.Length == Pattern!.Length || path[Pattern.Length] == '/');
                endOfMatch = Pattern!.Length - 1;
            }

            if (matchesThis)
            {
                if (endOfMatch + 1 == path.Length || endOfMatch + 2 == path.Length && path[endOfMatch + 1] == '/')
                {
                    if (Rewrite != null)
                    {
                        rewrite = Rewrite;
                        return true;
                    }
                    else
                    {
                        rewrite = default;
                        return false;
                    }
                }

                if (Children != null)
                {
                    var subPath = path.Slice(endOfMatch + 2);
                    for (int i = 0; i < Children.Count; i++)
                        if (Children[i].TryMatch(subPath, out rewrite))
                            return true;
                }
            }

            rewrite = default;
            return false;
        }
    }
}