using Editor.Services.Exceptions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Editor.Services.Registry;

/// <summary> Апрацоўвае чаргу заданьняў па адным дакумэнце за раз. </summary>
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

        // Этап не выстаўляем: кожная служба паведамляе свой першы этап адразу, як пачынае
        queue.Update(job.Id, s => s with { State = UploadJobState.Running });

        try
        {
            using var scope = scopeFactory.CreateScope();

            void OnProgress(UploadProgress progress) => queue.Update(job.Id, s => s with
            {
                Stage = progress.Stage,
                ProcessedTokens = progress.ProcessedTokens,
                TotalTokens = progress.TotalTokens,
            });

            switch (job.Request)
            {
                case DocumentUploadRequest upload:
                    await scope.ServiceProvider.GetRequiredService<IRegistryService>()
                        .UploadFile(upload, OnProgress, stoppingToken);
                    break;

                case DocumentTagRequest tag:
                    await scope.ServiceProvider.GetRequiredService<ITaggingService>()
                        .TagDocument(tag.N, OnProgress, stoppingToken);
                    break;

                default:
                    throw new InvalidOperationException($"Unknown job request type {job.Request.GetType().Name}");
            }

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
                Error = "Сэрвэр спыняецца, апрацоўка перарваная",
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
            await job.Request.DisposeAsync();
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Processing job {JobId} for document {N}")]
    private partial void LogProcessingJob(Guid jobId, int n);

    [LoggerMessage(Level = LogLevel.Information, Message = "Job {JobId} for document {N} finished")]
    private partial void LogJobFinished(Guid jobId, int n);

    [LoggerMessage(Level = LogLevel.Error, Message = "Job {JobId} for document {N} failed")]
    private partial void LogJobFailed(Exception exception, Guid jobId, int n);
}
