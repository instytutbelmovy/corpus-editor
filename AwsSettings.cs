namespace Editor;

public class AwsSettings
{
    public string AccessKeyId { get; set; } = null!;
    public string SecretAccessKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string BucketName { get; set; } = null!;
}