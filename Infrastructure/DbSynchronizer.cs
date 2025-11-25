using System.Net;
using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Data.Sqlite;

namespace Editor;

public interface IDbSynchronizer
{
    Task Fetch(string localDbPath);
    Task Push(string localDbPath);
}

/// <summary> Сынхранізацыя базы даных (EditorDb) паміж aws і лякальным файлам </summary>
public class DbSynchronizer : IDbSynchronizer
{
    private readonly AwsSettings _awsSettings;
    private readonly ILogger _logger;
    private readonly AmazonS3Client _s3Client;

    public DbSynchronizer(AwsSettings awsSettings, ILogger<DbSynchronizer> logger)
    {
        _awsSettings = awsSettings;
        _logger = logger;
        _s3Client = new AmazonS3Client(awsSettings.AccessKeyId, awsSettings.SecretAccessKey, RegionEndpoint.GetBySystemName(awsSettings.Region));
    }

    public async Task Fetch(string localDbPath)
    {
        var key = Path.GetFileName(localDbPath);
        var getRequest = new GetObjectRequest
        {
            BucketName = _awsSettings.BucketName,
            Key = key,

        };

        try
        {
            _logger.LogInformation("Fetching the database to {path}", localDbPath);
            var response = await _s3Client.GetObjectAsync(getRequest);
            await using var fileStream = new FileStream(localDbPath, FileMode.Create);
            await response.ResponseStream.CopyToAsync(fileStream);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Not fetching the database because aws s3 says {code}", ex.Message);
        }
    }

    public async Task Push(string localDbPath)
    {
        var tempFilePath = Path.GetTempFileName();

        _logger.LogInformation("Pushing the database from {path}", localDbPath);
        try
        {
            await using (var sourceConnection = new SqliteConnection($"Data Source={localDbPath}"))
            await using (var destinationConnection = new SqliteConnection($"Data Source={tempFilePath}"))
            {
                sourceConnection.Open();
                destinationConnection.Open();

                sourceConnection.BackupDatabase(destinationConnection);
                // pool clearing is needed because otherwise the file will be locked and cannot be read by aws
                SqliteConnection.ClearPool(destinationConnection);
            }

            var key = Path.GetFileName(localDbPath);
            var putRequest = new PutObjectRequest
            {
                BucketName = _awsSettings.BucketName,
                Key = key,
                FilePath = tempFilePath,
                ContentType = "application/octet-stream",
            };

            await _s3Client.PutObjectAsync(putRequest);
        }
        finally
        {
            if (File.Exists(tempFilePath))
                File.Delete(tempFilePath);
        }

    }
}

public class NullDbSynchronizer : IDbSynchronizer
{
    public Task Fetch(string localDbPath) => Task.CompletedTask;

    public Task Push(string localDbPath) => Task.CompletedTask;
}

public class EditorDbPushingService : IHostedService
{
    private const int RetryAttempts = 3;
    private readonly string _localDbPath;
    private readonly IDbSynchronizer _dbSynchronizer;
    private readonly ILogger _logger;
    private readonly FileSystemWatcher _watcher;
    private readonly SemaphoreSlim _watcherSemaphore = new(1, 1);

    public EditorDbPushingService(string localDbPath, IDbSynchronizer dbSynchronizer, ILogger logger)
    {
        _localDbPath = localDbPath;
        _dbSynchronizer = dbSynchronizer;
        _logger = logger;
        var fullPath = Path.GetFullPath(localDbPath);
        var directory = Path.GetDirectoryName(fullPath);
        var fileName = Path.GetFileName(fullPath);
        _watcher = new FileSystemWatcher(directory ?? ".", fileName);

        _watcher.Changed += OnChanged;
    }

    private void OnChanged(object sender, FileSystemEventArgs e)
    {
        Task.Factory.StartNew(async () => { await AttemptPush(1); });

        return;

        async Task AttemptPush(int attempt)
        {
            if (attempt != 1)
                _logger.LogInformation("Attempt #{attempt} to push the database file", attempt);

            await _watcherSemaphore.WaitAsync();
            try
            {
                await _dbSynchronizer.Push(_localDbPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to push the database file");
                if (attempt < RetryAttempts)
                {
                    Task.Factory.StartNew(async () =>
                    {
                        await Task.Delay(2000);
                        await AttemptPush(attempt + 1);
                    });
                }
            }
            finally
            {
                _watcherSemaphore.Release();
            }
        }
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Beginning watching {path}", _localDbPath);
        _watcher.EnableRaisingEvents = true;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _watcher.EnableRaisingEvents = false;
        _watcher.Dispose();
        _logger.LogInformation("Stopped watching {path}", _localDbPath);
        return Task.CompletedTask;
    }
}