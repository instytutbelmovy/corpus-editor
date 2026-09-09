using Editor.Services.Exceptions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Editor.Services.Registry;

/// <summary> Апрацоўвае чаргу загрузак па адным дакумэнце за раз. </summary>
public partial class UploadJobWorker(
    IUploadJobQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<UploadJobWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CompletedJobTtl = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var job in queue.ReadAll(stoppingToken))
            {
                await RunJob(job, stoppingToken);
                queue.EvictCompleted(CompletedJobTtl);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Звычайнае спыненьне хоста
        }
    }

    private async Task RunJob(UploadJobItem job, CancellationToken stoppingToken)
    {
        LogProcessingJob(job.Id, job.Request.N);

        queue.Update(job.Id, s => s with { State = UploadJobState.Running, Stage = UploadJobStage.Parsing });

        try
        {
            using var scope = scopeFactory.CreateScope();
            var registryService = scope.ServiceProvider.GetRequiredService<IRegistryService>();

            await registryService.UploadFile(
                job.Request,
                progress => queue.Update(job.Id, s => s with
                {
                    Stage = progress.Stage,
                    ProcessedTokens = progress.ProcessedTokens,
                    TotalTokens = progress.TotalTokens,
                }),
                stoppingToken);

            queue.Update(job.Id, s => s with
            {
                State = UploadJobState.Succeeded,
                Stage = UploadJobStage.Done,
                CompletedAt = DateTimeOffset.UtcNow,
            });

            LogJobFinished(job.Id, job.Request.N);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            queue.Update(job.Id, s => s with
            {
                State = UploadJobState.Failed,
                Error = "Сэрвэр спыняецца, загрузка перарваная",
                CompletedAt = DateTimeOffset.UtcNow,
            });
            throw;
        }
        catch (Exception ex)
        {
            // Незлоўленае выключэньне тут спыніла б увесь хост (BackgroundServiceExceptionBehavior.StopHost)
            LogJobFailed(ex, job.Id, job.Request.N);

            queue.Update(job.Id, s => s with
            {
                State = UploadJobState.Failed,
                Error = ex is BusinessException or BadRequestException
                    ? ex.Message
                    : "Не ўдалося апрацаваць дакумэнт",
                CompletedAt = DateTimeOffset.UtcNow,
            });
        }
        finally
        {
            await job.Request.Content.DisposeAsync();
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Processing upload job {JobId} for document {N}")]
    private partial void LogProcessingJob(Guid jobId, int n);

    [LoggerMessage(Level = LogLevel.Information, Message = "Upload job {JobId} for document {N} finished")]
    private partial void LogJobFinished(Guid jobId, int n);

    [LoggerMessage(Level = LogLevel.Error, Message = "Upload job {JobId} for document {N} failed")]
    private partial void LogJobFailed(Exception exception, Guid jobId, int n);
}
