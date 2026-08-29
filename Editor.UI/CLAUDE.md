# CLAUDE.md — Editor.UI (frontend)

Guidance for Claude Code when working in the `Editor.UI/` frontend. See the repo-root `CLAUDE.md` for the backend and the big picture.

## What this is

The frontend SPA for the Belarusian corpus markup editor: editors open documents and, for each word, assign grammatical info (lemma, tag, paradigm form id) looked up against the backend grammar database. Next.js 15 (React 19, TypeScript, Tailwind v4, Zustand). **UI text is in Belarusian** (including code comments) — match that when adding user-facing strings.

## Build & run

This is a standalone npm project (not part of `Editor.sln`). Backend runs as a **separate** process in dev.

```bash
npm install
npm run dev      # http://localhost:3000, proxies /api/* → http://localhost:5087 (backend must be running)
npm run build    # production static export → ./out
npm run lint     # next/eslint
npm run format   # prettier --write .
npm run test     # jest (test:watch, test:coverage also available)
```

- **Dev vs prod split** lives in `next.config.ts`: dev uses `rewrites` to proxy `/api/*` to the backend; prod does `output: 'export'` (static, to `./out`) with `trailingSlash: true`. The Dockerfile copies `./out` into `Editor.Api/wwwroot`. Because of the static export, **there is no Node server in prod** — no `getServerSideProps`, no API routes, no server components doing runtime work. Keep everything client-side.
- Path alias: `@/*` maps to the `Editor.UI/` root (e.g. `@/app/apiClient`, `@/utils/urlValidation`).

## Architecture

### Routing: `pages/` + `app/` (both used)

- `pages/` holds the **routes** (Pages Router): `index`, `sign-in`, `forgot-password`, `reset-password`, `docs/new`, `docs/[id]`, `docs/[id]/metadata`, `users/*`. `pages/_app.tsx` is the root shell.
- `app/` is **not** the App Router here — it's a plain source folder for feature code (components, hooks, services, stores, types). Don't add App-Router files (`layout.tsx`, `page.tsx`, route handlers) expecting them to route.

### `pages/_app.tsx` — the shell

Wires everything at startup: initializes the `serviceLocator`, pushes services into the Zustand stores, runs the auth check, sets up the `AuthContext` (`useAuth()` hook), renders `<Header />` for authenticated non-public pages, and initializes Sentry from backend-provided config. Auth model: cookie-based (`credentials: 'include'`), optimistic from `localStorage` (`AuthStorage`) then verified against the server. `publicPages = ['/sign-in', '/forgot-password', '/reset-password']`.

### API access

All HTTP goes through **`app/apiClient.ts`** (`ApiClient`): `get/post/put/delete/postFormData`, prefixes `/api`, sends `credentials: 'include'`, and centralizes 401 handling (clears `AuthStorage`, redirects to sign-in). Returns `ApiResponse<T> = { data?, error?, status }` — **it does not throw**.

**Service classes** wrap `ApiClient` per domain and _do_ throw on `response.error`: `app/docs/service.ts` (`DocumentService`), `app/auth/service.ts` (`AuthService`), `app/users/service.ts` (`UserService`). Add new backend calls as methods on the relevant service, not ad-hoc `fetch`.

Services are constructed once via the **`serviceLocator`** singleton (`app/services/serviceLocator.ts`), initialized in `_app.tsx` with the `onUnauthorized` callback. Access with `serviceLocator.documentService` etc. — throws if used before init.

### State: Zustand stores

- **`app/docs/store.ts`** (`useDocumentStore`) — document data, the documents list, pagination (pages of 20 paragraphs via infinite scroll), and **structural editing** with undo/redo. Editing model: `originalDocumentData` is the saved baseline; edits go through `StructureEditor` (`app/docs/structureEditor.ts`, pure functions returning new state) applied via `_applyEdit` into a `history`/`historyIndex` stack. On save, `calculateOperations(original, current)` diffs paragraphs by `concurrencyStamp` into Create/Update/Delete `ParagraphOperation`s sent to `/edit`. Preserve the immutability + concurrency-stamp contract when touching this.
- **`app/docs/uiStore.ts`** (`useUIStore`) — transient editor UI: `selectedWord`, `displayMode` (`persist`ed to `localStorage` key `editor-ui-store`), per-field saving flags, `pendingSaves`, structure-editing mode toggle.
- **`app/auth/store.ts`** (`useAuthStore`) — auth state.

### The document editor (`app/docs/`)

The core feature. `CorpusDocument → Paragraph → Sentence → LinguisticItem` mirrors the backend model (`types.ts`). Per-word markup edits are saved individually through `DocumentService` PUTs keyed by `paragraphId.stamp/sentenceId.stamp/wordIndex/{paradigm-form-id,text,lemma-tag,comment,error-type}`; structural edits (add/split/join/delete/glue) are batched through `saveDocument`. `components/` = interactive UI (`DocumentContent`, `Paragraph`, `Sentence`, `LinguisticItem`, `EditingPanel`, `Toolbar`, …); `hooks/` = interaction logic (`useWordEditing`, `useWordSelection`, `useKeyboardNavigation`, `useInfiniteScroll`, `useAddItem`, …). `wordEditingService.ts` and `linguisticCategories.ts` hold word-markup domain logic.

## Conventions

- **Belarusian**, taraškievica syntax, for all UI strings and most comments — follow suit.
- New API calls → a method on a `*Service` class (which throws on error), not raw `fetch`; the service uses `ApiClient` under the hood.
- Keep it client-only (static export in prod). No SSR/server data fetching.
- TypeScript `strict` is on. Prefer the `@/` alias over deep relative paths.
- Run `npm run lint` and `npm run format` before finishing FE changes.

## Tests

Jest + ts-jest, `testEnvironment: node`. Test files live in `tests/` folders matching `**/tests/**/*.test.ts` (see `jest.config.js`). Note the jest config has **no `@/` moduleNameMapper** — add one if a test needs to import via the alias.
