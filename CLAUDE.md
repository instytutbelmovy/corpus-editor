# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A web editor for linguistic markup of a Belarusian text corpus. Editors open documents, and for each word assign grammatical info (lemma, tag, paradigm form id) looked up against a grammar database. Backend is ASP.NET Core (net10.0) minimal APIs; frontend is a Next.js/React SPA. The README is in Belarusian.

## Repository layout (current)

- `Editor.Api/` — backend ASP.NET Core host: thin minimal-API endpoints (delegate to services), HTTP middleware, Identity/cookie wiring, validation/policy endpoint extensions, HTTP JSON serializer contexts, `Program.cs` composition root.
- `Editor.Services/` — business layer (references only `Editor.Domain`, no ASP.NET Core): services (`EditingService`, `RegistryService`, `ParadigmService`, `UserService`, `AuthService`, `GrammarDb`, `AwsFilesCache`, `EmailService`, `ReCaptchaService`), view models + FluentValidation validators (feature folders: `Editing/`, `Registry/`, `Grammar/`, `Users/`, `Auth/`), document converters (`Converters/`), S3 corpus storage + `VertiIO` (`Corpus/`), and the `BusinessException` hierarchy (`Exceptions/`).
- `Editor.Domain/` — entity classes (`EditorUser`, `Paradigm`/`ParadigmVariant`/`ParadigmForm`, `Form`), the corpus document model (`Corpus/`: `CorpusDocument` → `Paragraph` → `Sentence` → `LinguisticItem`), shared linguistics primitives (`ParadigmFormId`, `LinguisticTag`, `Normalizer`, `GrammarInfo`) and repository interfaces (`IUserRepository`, `IGrammarRepository`, `IGrammarEditRepository`). Flat `Editor` namespace (used across all projects; converters use `Editor.Converters`).
- `Editor.DB/` — EF Core layer: `EditorDbContext` + `GrammarDbContext`, repository implementations, design-time factories, and EF migrations (`Migrations/Editor`, `Migrations/Grammar`).
- `Editor.UI/` — frontend Next.js/React SPA (top-level, its own npm project; not part of `Editor.sln`).
- `Editor.Tests/` — xUnit tests for the backend (references `Editor.Services`).
- `GrammarDbConverter/` — CLI that parses the Belarusian GrammarDB XML files and bulk-loads the Postgres `grammar` database (references `Editor.DB`).
- `Editor.sln` — includes `Editor`, `Editor.Services`, `Editor.Domain`, `Editor.DB`, `Editor.Tests`, `GrammarDbConverter`.
- `Dockerfile` — multi-stage build (Node → dotnet SDK → aspnet runtime) targeting `linux-musl-x64`.

Project references: `Editor` → `Editor.DB` → `Editor.Domain`; `Editor` → `Editor.Services` → `Editor.Domain`; `GrammarDbConverter` → `Editor.DB`. `Editor.Services` must not reference `Editor.DB` or the ASP.NET Core framework (its only Identity dependency is the `Microsoft.Extensions.Identity.*` packages, for `UserManager`/`IUserStore`).

## Build & run

For local development the frontend and backend run as **separate** processes — the frontend dev server proxies `/api/*` to the backend; nothing is built into `wwwroot`. The `wwwroot` bundle is only produced for production, by the `Dockerfile` (which builds the FE static export and copies it into `Editor.Api/wwwroot` before the backend build).

Both databases live on a PostgreSQL server (two databases: `editor` and `grammar`); connection strings come from `ConnectionStrings:EditorDb` / `ConnectionStrings:GrammarDb`.

```bash
# 1. Backend — default http://localhost:5087. Applies EF migrations for BOTH databases at
#    startup (editor-db and grammar-db schema alike). On a fresh grammar database this run will
#    migrate the (still-empty) schema and then fail fast with "Grammar database is empty" —
#    that's expected; the schema is now in place for the converter.
cd Editor.Api && dotnet run

# 2. Populate the grammar database (one-time per XML update; truncates + bulk-loads only,
#    schema is already owned by the Editor app's migrations)
cd GrammarDbConverter && dotnet run -- path-to-GrammarDB-data "Host=localhost;Database=grammar;Username=postgres;Password=..."

# 3. Backend again — now the grammar database has data, starts normally
cd Editor.Api && dotnet run

# 4. Frontend dev server — http://localhost:3000, proxies /api/* to :5087
cd Editor.UI && npm install && npm run dev
```

Production single-image build: `docker build -t <tag> .` from the repo root (builds the FE static export into `Editor.Api/wwwroot`, then the backend). Frontend specifics — dev/prod config, architecture, conventions — are in `Editor.UI/CLAUDE.md`.

## Tests / lint

- Backend: `dotnet test` (from repo root, or against `Editor.Tests/Editor.Tests.csproj`). Single test: `dotnet test --filter "FullyQualifiedName~TokenizerTests"`.
- Frontend: see `Editor.UI/CLAUDE.md` (Jest / eslint / prettier).

## Configuration & secrets

`Editor.Api/appsettings.json` + `appsettings.Development.json`. Required secrets are validated at startup and throw if missing:
- `ConnectionStrings:EditorDb` / `ConnectionStrings:GrammarDb` — PostgreSQL databases (prod: `ConnectionStrings__EditorDb`/`__GrammarDb` env vars).
- `Aws:AccessKeyId` / `Aws:SecretAccessKey` — S3 bucket holding the corpus document files (verti format).
- `Email:ApiKey` — outbound mail.
- `ReCaptcha:SecretKey`, `Sentry:Dsn` (Sentry disabled in Development).

Auth note: the first successful sign-in attempt creates the user, and the first user gets the Admin role (see `Endpoints/Auth.cs`). Password policy is length-only (min 10). Roles are `Viewer < Editor < Admin`, enforced via authorization policies and `.Viewer()`/`.Editor()`/`.Admin()` endpoint extensions.

## Backend architecture

- `Program.cs` wires everything by hand (no controllers): slim WebApplication builder, manual DI registration, System.Text.Json source-generated serializer contexts (one per area — Infrastructure/Editor/Verti/Auth/Administration/GrammarApi), ASP.NET Core Identity Core with cookie auth.
- **Endpoints** (`Editor.Api/Endpoints/`): minimal-API route groups under `/api` — `Registry` (document list/upload/download), `Editing` (per-word markup PUTs, keyed by paragraph/sentence id + concurrency stamp), `Grammar` (paradigm CRUD), `Auth`, `Users`. Handlers are thin: they keep model binding, multipart parsing, `Results.*` wrapping, claims extraction and `SignInManager` cookie mechanics, and delegate everything else to the scoped services in `Editor.Services`.
- **Services** (`Editor.Services/`): `GrammarDb` (word-lookup/markup-inference over `IGrammarRepository`), `AwsFilesCache` — a singleton in-memory cache of corpus documents backed by S3, with a maintenance `BackgroundService` that flushes pending edits and unloads idle documents (Verti is the on-disk/S3 corpus file format, `VertiIO` in `Corpus/`), the per-feature endpoint services (`EditingService` incl. the pure `EditDocumentCore` engine, `RegistryService`, `ParadigmService`, `UserService`, `AuthService`), and the import pipeline (`Converters/`): `IDocumentReader` implementations (`Docx`/`Odt`/`Epub`/`Txt`), then `Tokenizer` → `Sentencer` → `DocumentConverter` builds the `CorpusDocument`.
- **Infrastructure** (`Editor.Api/Infrastructure/`): exception→HTTP middleware (maps the `BusinessException` hierarchy: BadRequest/NotFound/Conflict/Unauthorized), FluentValidation wiring (`Validate<T>()` endpoint filter + startup `CheckValidators`; validators are discovered by scanning the `Editor.Services` assembly), security headers, `SpaUrlRewrites`, claims principal factory. The Identity user store (`EditorUserStore`, delegating to `IUserRepository`) lives in `Editor.Services/Users/`.
- **DI lifetimes**: DbContexts via `AddDbContext` (scoped); repositories take their DbContext as a constructor parameter and are scoped, as are `GrammarDb`, `EditorUserStore` and the endpoint services. `AwsFilesCache`/`ICorpusStorage` are singletons by design; a singleton that ever needs a repository must resolve it inside an `IServiceScopeFactory` scope (none do today).

### Databases (PostgreSQL, EF Core)

Two databases on one server, two DbContexts in `Editor.DB`, snake_case naming via `EFCore.NamingConventions` (`UseSnakeCaseNamingConvention()` must be applied identically in Program.cs, the design-time factories, and the converter). DbContexts are registered scoped (`AddDbContext`; the grammar one with no-tracking queries by default); repositories are scoped and receive their DbContext via constructor, so all repositories in one request share that request's context.

- `editor` (`EditorDbContext`) — users only (`users` table). Migrations in `Editor.DB/Migrations/Editor`, applied automatically at app startup (`Database.Migrate()`). Add a migration: `dotnet ef migrations add <Name> --project Editor.DB --startup-project Editor.DB --context EditorDbContext --output-dir Migrations/Editor` (design-time factories use `EDITOR_DB_CS`/`GRAMMAR_DB_CS` env vars, falling back to localhost/postgres).
- `grammar` (`GrammarDbContext`) — read-only lookup data: `paradigms` (one row per paradigm, variants+forms as jsonb) and `forms` (reverse index: normalized form → paradigm/variant/form-tag; composite PK doubles as the lookup index). Migrations live in `Editor.DB/Migrations/Grammar` and are applied automatically at **Editor app** startup, same as `editor` — `GrammarDbConverter` no longer owns the schema; it only truncates/reloads data, so run the Editor app at least once (or apply the migration manually) before running the converter against a fresh database. The variants jsonb is (de)serialized through `GrammarJsonSerializerContext` (`Editor.DB`, source-generated, snake_case property names to match the rest of the schema) via an EF Core value converter on `GrammarDbContext` — this avoids Npgsql's dynamic-JSON POCO mapping (which would otherwise require `EnableDynamicJson()`). `GrammarDbConverter` writes with the same context; keep both sides using it.

## Frontend architecture

See `Editor.UI/CLAUDE.md`. In short: Next.js 15 (React 19, TypeScript, Tailwind v4, Zustand) static-exported SPA; `pages/` holds routes, `app/` holds feature code, and the document editor lives in `Editor.UI/app/docs/`.
