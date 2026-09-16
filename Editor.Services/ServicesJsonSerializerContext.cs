using System.Text.Json.Serialization;
using Editor.Domain.Corpus;
using Editor.Services.Auth;
using Editor.Services.Editing;
using Editor.Services.Grammar;
using Editor.Services.Registry;
using Editor.Services.Users;

namespace Editor.Services;

/// <summary> Сэрыялізацыя DTO слою сэрвісаў для HTTP-адказаў API (Editing, Registry, Auth, Users, Grammar).
/// Асобны ад Editor.DB.GrammarJsonSerializerContext (той - snake_case для jsonb варыянтаў у базе). </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
// Editing / Registry
[JsonSerializable(typeof(ICollection<CorpusDocumentHeader>))]
[JsonSerializable(typeof(CorpusDocumentView))]
[JsonSerializable(typeof(UpdateMetadataRequest))]
[JsonSerializable(typeof(LemmaTag))]
[JsonSerializable(typeof(UploadJobAccepted))]
[JsonSerializable(typeof(TagAllAccepted))]
[JsonSerializable(typeof(UploadJobStatus))]
[JsonSerializable(typeof(ICollection<UploadJobStatus>))]
// Auth
[JsonSerializable(typeof(SignInRequest))]
[JsonSerializable(typeof(WhoAmIResponse))]
[JsonSerializable(typeof(ForgotPasswordRequest))]
[JsonSerializable(typeof(ResetPasswordRequest))]
// Users
[JsonSerializable(typeof(IEnumerable<EditorUserDto>))]
[JsonSerializable(typeof(EditorUserDto))]
[JsonSerializable(typeof(EditorUserCreateDto))]
[JsonSerializable(typeof(InviteUserRequest))]
// Grammar
[JsonSerializable(typeof(ParadigmCreateVm))]
[JsonSerializable(typeof(ParadigmResponse))]
[JsonSerializable(typeof(List<ParadigmResponse>))]
public partial class ServicesJsonSerializerContext : JsonSerializerContext
{
}
