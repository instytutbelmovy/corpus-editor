namespace Editor;

public class AwsFilesCacheMaintenanceService(AwsFilesCache awsFilesCache, ILogger<AwsFilesCacheMaintenanceService> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (true)
        {
            await Task.Delay(_checkInterval, stoppingToken);
            logger.LogTrace("Purging aws files cache");
            try
            {
                await awsFilesCache.UploadPendingAndPurgeCache();
            }
            catch (Exception ex)
            {
                // An unhandled exception here would stop the whole host (BackgroundServiceExceptionBehavior.StopHost)
                logger.LogError(ex, "Error flushing/purging the files cache");
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        logger.LogInformation("Pre-shutdown uploading cached files");
        await awsFilesCache.UploadPendingAndPurgeCache();
    }
}