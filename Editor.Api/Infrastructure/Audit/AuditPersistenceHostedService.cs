using Amazon;
using Amazon.DynamoDBv2;
using Editor.Services.Corpus;

namespace Editor.Api.Infrastructure;

/// <summary> Drains AuditQueue and writes each record to DynamoDB, one PutItem at a time, best-effort. </summary>
public partial class AuditPersistenceHostedService(AuditQueue queue, AwsSettings awsSettings, ILogger<AuditPersistenceHostedService> logger) : BackgroundService
{
    private readonly IAmazonDynamoDB _dynamoDbClient =
        new AmazonDynamoDBClient(awsSettings.AccessKeyId, awsSettings.SecretAccessKey, RegionEndpoint.GetBySystemName(awsSettings.Region));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var item in queue.ReadAll(stoppingToken))
            {
                try
                {
                    await _dynamoDbClient.PutItemAsync(awsSettings.AuditTable, item, stoppingToken);
                }
                catch (Exception ex)
                {
                    // Best-effort: a failed audit write must never take down the host or the request that triggered it.
                    LogAuditWriteFailed(ex);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to write audit record to DynamoDB")]
    private partial void LogAuditWriteFailed(Exception exception);
}
