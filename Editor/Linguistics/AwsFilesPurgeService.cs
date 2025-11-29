namespace Editor;

public class AwsFilesPurgeService(AwsFilesCache awsFilesCache, ILogger<AwsFilesPurgeService> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (true)
        {
            await Task.Delay(_checkInterval, stoppingToken);
            logger.LogTrace("Purging aws files cache");
            awsFilesCache.PurgeFilesOlderThan(_checkInterval);
        }
    }
}