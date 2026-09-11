using Microsoft.Extensions.Hosting;

namespace Editor.Services.Corpus;

public partial class AwsFilesCacheMaintenanceService(IAwsFilesCache awsFilesCache, ILogger<AwsFilesCacheMaintenanceService> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (true)
        {
            await Task.Delay(_checkInterval, stoppingToken);
            LogPurgingCache();
            try
            {
                await awsFilesCache.UploadPendingAndPurgeCache();
            }
            catch (Exception ex)
            {
                // An unhandled exception here would stop the whole host (BackgroundServiceExceptionBehavior.StopHost)
                LogFlushPurgeError(ex);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        LogPreShutdownUpload();
        await awsFilesCache.UploadPendingAndPurgeCache();
    }

    [LoggerMessage(Level = LogLevel.Trace, Message = "Purging aws files cache")]
    private partial void LogPurgingCache();

    [LoggerMessage(Level = LogLevel.Error, Message = "Error flushing/purging the files cache")]
    private partial void LogFlushPurgeError(Exception exception);

    [LoggerMessage(Level = LogLevel.Information, Message = "Pre-shutdown uploading cached files")]
    private partial void LogPreShutdownUpload();
}