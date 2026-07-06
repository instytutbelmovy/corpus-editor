using System.IO.Pipelines;
using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;

namespace Editor;

public class AwsSettings
{
    public string AccessKeyId { get; set; } = null!;
    public string SecretAccessKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string BucketName { get; set; } = null!;
}

public interface ICorpusStorage
{
    /// <summary> Throws FileNotFoundException if the key is absent. </summary>
    Task<Stream> OpenRead(string key);
    Task Write(string key, CorpusDocument document);
    Task<List<string>> ListKeys(string suffix);
    Task<bool> Exists(string key);
}

public class S3CorpusStorage : ICorpusStorage
{
    private readonly AwsSettings _awsSettings;
    private readonly IAmazonS3 _s3Client;

    public S3CorpusStorage(AwsSettings awsSettings, ILogger<S3CorpusStorage>? logger)
    {
        _awsSettings = awsSettings;
        _s3Client = new AmazonS3Client(awsSettings.AccessKeyId, awsSettings.SecretAccessKey, RegionEndpoint.GetBySystemName(awsSettings.Region));
        logger?.LogInformation("Using S3 bucket: {BucketName}", awsSettings.BucketName);
    }

    public async Task<Stream> OpenRead(string key)
    {
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _awsSettings.BucketName,
                Key = key,
            };

            var response = await _s3Client.GetObjectAsync(getRequest);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException($"File {key} not found in S3");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error reading file from S3: {ex.Message}", ex);
        }
    }

    public async Task Write(string key, CorpusDocument document)
    {
        try
        {
            var pipe = new Pipe();
            var uploadTask = Task.Run(async () =>
            {
                try
                {
                    await using var stream = pipe.Writer.AsStream(leaveOpen: true);
                    await VertiIO.WriteDocument(stream, document);
                    await pipe.Writer.CompleteAsync();
                }
                catch (Exception ex)
                {
                    await pipe.Writer.CompleteAsync(ex);
                }
            });

            var transferUtility = new TransferUtility(_s3Client);
            await transferUtility.UploadAsync(pipe.Reader.AsStream(), _awsSettings.BucketName, key);

            await uploadTask;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error writing document to S3: {ex.Message}", ex);
        }
    }

    public async Task<List<string>> ListKeys(string suffix)
    {
        var keys = new List<string>();

        var listRequest = new ListObjectsV2Request
        {
            BucketName = _awsSettings.BucketName,
            Prefix = "",
            MaxKeys = 1000,
        };

        ListObjectsV2Response listResponse;
        do
        {
            listResponse = await _s3Client.ListObjectsV2Async(listRequest);
            keys.AddRange(listResponse.S3Objects.Select(obj => obj.Key).Where(key => key.EndsWith(suffix)));
            listRequest.ContinuationToken = listResponse.NextContinuationToken;
        } while (listResponse.IsTruncated == true);

        return keys;
    }

    public async Task<bool> Exists(string key)
    {
        try
        {
            await _s3Client.GetObjectMetadataAsync(_awsSettings.BucketName, key);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
