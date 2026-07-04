# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A web editor for linguistic markup of a Belarusian text corpus. Editors open documents, and for each word assign grammatical info (lemma, tag, paradigm form id) looked up against a grammar database. Backend is ASP.NET Core (net10.0) minimal APIs; frontend is a Next.js/React SPA. The README is in Belarusian.

## Repository layout (current)

- `Editor/` — backend ASP.NET Core app. Everything except `Editor/src`.
- `Editor/src/` — frontend Next.js/React SPA (its own npm project; excluded from the .csproj compile).
- `Editor.Tests/` — xUnit tests for the backend (sibling of `Editor/`, referenced by `Editor.sln`).
- `GrammarDbConverter/` — CLI that converts the Belarusian GrammarDB XML files into a SQLite `grammar.db`. Links a few source files directly from `Editor/Linguistics/`.
- `Editor.sln` — includes `Editor`, `Editor.Tests`, `GrammarDbConverter`.
- `Editor/files/` — local `Editor.db` (user/document data) and `grammar.db` (grammar lookup); gitignored data.
- `Dockerfile` — multi-stage build targeting `linux-musl-x64`.

> A restructure is planned: move `Editor/src` out to a top-level `Editor.UI/`, split the backend into separate `Services`, `Domain`, and `DB` C# projects, and migrate from SQLite to Postgres. Treat the current structure as the starting point, not the intended design.

## Build & run

Frontend must be built before the backend serves it in non-dev mode: `next build` (prod config) exports a static site to `Editor/wwwroot`, which the backend serves.

```bash
# 1. Build grammar.db (one-time; or obtain the file directly)
cd GrammarDbConverter && dotnet run -- path-to-GrammarDB-data ../Editor/files/grammar.db

# 2. Frontend
cd Editor/src && npm install && npm run build   # exports to ../wwwroot

# 3. Backend (serves wwwroot + /api) — default http://localhost:5087
cd Editor && dotnet run
```

Frontend-focused dev: run the backend separately, then `cd Editor/src && npm run dev` and use http://localhost:3000. In dev, `next.config.ts` proxies `/api/*` to `http://localhost:5087`. In prod it does a static `output: 'export'` to `../wwwroot`.

## Tests / lint

- Backend: `dotnet test` (from repo root, or against `Editor.Tests/Editor.Tests.csproj`). Single test: `dotnet test --filter "FullyQualifiedName~TokenizerTests"`.
- Frontend: `cd Editor/src && npm run test` (Jest). `npm run lint` (next/eslint), `npm run format` (prettier).

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

Next.js 15 (React 19, TypeScript, Tailwind v4, Zustand). Uses both the `app/` directory (feature code/components/hooks/services) and `pages/` (routes: `index`, `sign-in`, `docs`, `users`, password reset). The document editor lives in `src/app/docs/` — `store.ts`/`uiStore.ts` (Zustand), `service.ts`/`wordEditingService.ts` (API calls), `structureEditor.ts`, and `components/` + `hooks/` for the interactive per-word markup UI. API access goes through `src/app/apiClient.ts` and `src/app/services/`.
