# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A web editor for linguistic markup of a Belarusian text corpus. Editors open documents, and for each word assign grammatical info (lemma, tag, paradigm form id) looked up against a grammar database. Backend is ASP.NET Core (net10.0) minimal APIs; frontend is a Next.js/React SPA. The README is in Belarusian.

## Repository layout (current)

- `Editor/` — backend ASP.NET Core app.
- `Editor.UI/` — frontend Next.js/React SPA (top-level, its own npm project; not part of `Editor.sln`).
- `Editor.Tests/` — xUnit tests for the backend (sibling of `Editor/`, referenced by `Editor.sln`).
- `GrammarDbConverter/` — CLI that converts the Belarusian GrammarDB XML files into a SQLite `grammar.db`. Links a few source files directly from `Editor/Linguistics/`.
- `Editor.sln` — includes `Editor`, `Editor.Tests`, `GrammarDbConverter`.
- `Editor/files/` — local `Editor.db` (user/document data) and `grammar.db` (grammar lookup); gitignored data.
- `Dockerfile` — multi-stage build (Node → dotnet SDK → aspnet runtime) targeting `linux-musl-x64`.

> A restructure is planned: split the backend into separate `Services`, `Domain`, and `DB` C# projects, and migrate from SQLite to Postgres. (The frontend has already been moved out to a top-level `Editor.UI/`.) Treat the current structure as the starting point, not the intended design.

## Build & run

For local development the frontend and backend run as **separate** processes — the frontend dev server proxies `/api/*` to the backend; nothing is built into `wwwroot`. The `wwwroot` bundle is only produced for production, by the `Dockerfile` (which builds the FE static export and copies it into `Editor/wwwroot` before the backend build).

```bash
# 1. Build grammar.db (one-time; or obtain the file directly)
cd GrammarDbConverter && dotnet run -- path-to-GrammarDB-data ../Editor/files/grammar.db

# 2. Backend — default http://localhost:5087
cd Editor && dotnet run

# 3. Frontend dev server — http://localhost:3000, proxies /api/* to :5087
cd Editor.UI && npm install && npm run dev
```

Production single-image build: `docker build -t <tag> .` from the repo root (builds the FE static export into `Editor/wwwroot`, then the backend). Frontend specifics — dev/prod config, architecture, conventions — are in `Editor.UI/CLAUDE.md`.

## Tests / lint

- Backend: `dotnet test` (from repo root, or against `Editor.Tests/Editor.Tests.csproj`). Single test: `dotnet test --filter "FullyQualifiedName~TokenizerTests"`.
- Frontend: see `Editor.UI/CLAUDE.md` (Jest / eslint / prettier).

## Configuration & secrets

`Editor/appsettings.json` + `appsettings.Development.json`. Required secrets are validated at startup and throw if missing:
- `Aws:AccessKeyId` / `Aws:SecretAccessKey` — S3 bucket holding the corpus document files (verti format) and the synced `Editor.db`.
- `Email:ApiKey` — outbound mail.
- `ReCaptcha:SecretKey`, `Sentry:Dsn` (Sentry disabled in Development).

Auth note: the first successful sign-in attempt creates the user, and the first user gets the Admin role (see `Endpoints/Auth.cs`). Password policy is length-only (min 10). Roles are `Viewer < Editor < Admin`, enforced via authorization policies and `.Viewer()`/`.Editor()`/`.Admin()` endpoint extensions.

## Backend architecture

- `Program.cs` wires everything by hand (no controllers): slim WebApplication builder, manual DI registration, System.Text.Json source-generated serializer contexts (one per area — Infrastructure/Editor/Verti/Auth/Administration), ASP.NET Core Identity Core with cookie auth.
- **Endpoints** (`Editor/Endpoints/`): minimal-API route groups under `/api` — `Registry` (document list/upload/download), `Editing` (per-word markup PUTs, keyed by paragraph/sentence id + concurrency stamp), `Auth`, `Users`.
- **Linguistics** (`Editor/Linguistics/`): domain model (`CorpusDocument` → `Paragraph` → `Sentence` → `LinguisticItem`), `GrammarDb` (SQLite word lookup via Dapper/raw ADO, with an in-memory custom-word overlay), and `AwsFilesCache` — an in-memory cache of corpus documents backed by S3, with a maintenance service that unloads idle documents. Verti is the on-disk/S3 corpus file format (`VertiIO`).
- **Converters** (`Editor/Converters/`): import pipeline for uploaded documents — `IDocumentReader` implementations (`Docx`/`Odt`/`Epub`/`Txt`), then `Tokenizer` → `Sentencer` → `DocumentConverter` builds the `CorpusDocument`.
- **Infrastructure** (`Editor/Infrastructure/`): Identity user store (`EditorUserStore`, backed by `Editor.db`), exception→HTTP middleware (`BusinessException` hierarchy: BadRequest/NotFound/Conflict/Unauthorized), FluentValidation wiring, `EmailService`, `ReCaptchaService`, `SpaUrlRewrites`, and `DbSynchronizer` (fetch/push `Editor.db` to S3).

### Databases (both SQLite currently)

- `Editor.db` — user + document-metadata store. Optionally synced to/from S3 on startup and periodically pushed (`Settings:SyncEditorDbWithAws`). Schema managed by a hand-rolled migrator: `Migrations/Migrator.cs` uses SQLite `PRAGMA user_version` and applies `M0001_*`, `M0002_*`, … sequentially. Add a migration by writing a new `M####_*` class and adding a case to the switch.
- `grammar.db` — read-only grammar lookup, generated by `GrammarDbConverter` from external GrammarDB data.

Dapper.AOT is enabled (`[module: DapperAot]`) — Dapper queries are source-generated; keep SQL AOT-compatible.

## Frontend architecture

See `Editor.UI/CLAUDE.md`. In short: Next.js 15 (React 19, TypeScript, Tailwind v4, Zustand) static-exported SPA; `pages/` holds routes, `app/` holds feature code, and the document editor lives in `Editor.UI/app/docs/`.
