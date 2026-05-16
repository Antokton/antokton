# Antokton Development Setup

Date: 2026-05-13

This guide documents safe local setup for the current Antokton codebase. It does not change business logic.

## Prerequisites

- Windows PowerShell, or another shell with equivalent commands.
- Node.js with `node:sqlite` support. The current local environment has been tested with Node 25.x.
- npm.
- Git, if you plan to track changes.
- A browser for local testing.

Recommended Node version:

- Use Node 25.x for the current backend because `backend/server.js` imports `node:sqlite`.
- If moving toward production LTS later, first confirm the chosen Node LTS includes the required SQLite support or replace the database driver.

## Project Layout

- `antokton-export/`: active React/Vite frontend.
- `backend/`: local Node backend and Base44-compatible API scaffold.
- `backend/data/`: local SQLite data.
- `backend/uploads/`: local uploaded files.
- `antokton-export/antokton-reference/entities/`: exported entity schemas used by the backend.
- `antokton-export/antokton-reference/functions/`: exported Base44 function reference code.
- `AUDIT_REPORT.md`: current production audit.
- `PRODUCTION_ROADMAP.md`: ordered production roadmap.
- `AGENTS.md`: working rules for Codex and future agents.
- `.env.example`: environment variable reference.

## Environment Variables

The repository currently reads environment values from frontend `import.meta.env`, backend `process.env`, and exported Base44/Deno function reference code.

Use `.env.example` as the reference. Do not commit a real `.env`.

### Active frontend variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_ANTOKTON_APP_ID` | `antokton-export/src/api/antoktonClient.js`, `src/lib/app-params.js` | App id for local API compatibility paths. |
| `VITE_ANTOKTON_DEV_USER_EMAIL` | `antokton-export/src/api/antoktonClient.js` | Development-only fallback user identity. |
| `VITE_BASE44_APP_ID` | `antokton-export/src/lib/app-params.js` | Legacy fallback. Prefer `VITE_ANTOKTON_APP_ID`. |
| `VITE_BASE44_FUNCTIONS_VERSION` | `antokton-export/src/lib/app-params.js` | Legacy exported app parameter. |
| `VITE_BASE44_APP_BASE_URL` | `antokton-export/src/lib/app-params.js` | Legacy exported app parameter. |

### Active backend variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `backend/config.js` | Runtime environment. Defaults to `development`. |
| `PORT` | `backend/config.js`, `backend/server.js` | Local backend/API/static server port. Default `8787`. |
| `APP_ID` | `backend/config.js`, `backend/server.js`, scripts | Base44-compatible app id. |
| `ANTOKTON_DEV_USER_EMAIL` | `backend/config.js`, `backend/server.js` | Development-only default identity. |
| `DATA_DIR` | `backend/config.js`, `backend/server.js`, `backend/import-live-data.js` | Local data directory. |
| `UPLOAD_DIR` | `backend/config.js`, `backend/server.js`, `backend/import-live-data.js` | Local upload directory. |
| `DB_PATH` | `backend/config.js`, `backend/server.js`, `backend/localize-assets.js`, `backend/import-live-data.js` | SQLite file path. |
| `MAX_REMOTE_ASSET_BYTES` | `backend/config.js`, `backend/server.js`, `backend/import-live-data.js` | Remote asset localization limit. |
| `STRIPE_PUBLISHABLE_KEY` | `backend/config.js`, `backend/server.js` | Returned by local `getStripeConfig` placeholder. |
| `STRIPE_SECRET_KEY` | `backend/config.js` | Validated/documented for future Stripe server work; not exposed by health endpoints. |
| `STRIPE_WEBHOOK_SECRET` | `backend/config.js` | Validated/documented for future Stripe webhook work; not exposed by health endpoints. |
| `STRIPE_FALLBACK_URL` | `backend/config.js`, `backend/server.js` | Fallback checkout URL for local placeholder checkout functions. |
| `NODE_NO_WARNINGS` | start scripts/smoke test | Suppresses local Node warnings in helper scripts. |

`backend/config.js` validates these values at backend startup while keeping backward-compatible local defaults. It does not expose secret values.

## Local SQLite Database

SQLite remains the active local database. The initialization, table creation, PRAGMA settings, and prepared statements now live behind `backend/db.js`, while `backend/server.js` continues to use the same statement names and API behavior as before. This is only an abstraction layer; it does not replace SQLite or change the stored data.

## Local Upload Storage

Local uploads remain active under `backend/uploads`, with remote cached assets under `backend/uploads/remote`. The upload directory setup, `/uploads/...` path handling, MIME detection, uploaded file writes, and remote asset cache helpers now live behind `backend/storage.js`. This preserves the current local URL format and does not add S3/R2/Supabase Storage yet.

## Local Development Auth

The backend currently uses a development-only auth compatibility layer in `backend/auth.js`. Local requests may send `Authorization: Bearer dev:<email>`, and the backend will treat that email as the current user. If no dev token is provided, the backend falls back to `ANTOKTON_DEV_USER_EMAIL` so the exported frontend keeps working locally.

This behavior is intentional for local development only. It is not production authentication and must be replaced before public deployment. `/health/config` reports safe auth status fields such as `authMode` and `devAuthActive`; it never exposes bearer tokens or configured emails.

### Migration/import helper variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `LIVE_ORIGIN` | `backend/import-live-data.js`, `backend/live-import-login-server.js` | Source site for live import. |
| `BASE44_API_URL` | `backend/import-live-data.js` | Base44 API source for token/import helper. |
| `LIVE_AUTHORIZATION` | `backend/import-live-data.js`, login helper | Temporary bearer token for import. Never commit real values. |
| `LIVE_COOKIE` | `backend/import-live-data.js` | Temporary cookie for import. Never commit real values. |
| `LIVE_IMPORT_LIMIT` | `backend/import-live-data.js` | Import batch limit. |
| `LIVE_IMPORT_PORT` | `backend/live-import-login-server.js` | Login helper port. Default `8790`. |

### Exported Base44 function reference variables

These are in `antokton-export/antokton-reference/functions` and are not active in the local Node backend yet:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY`
- `BASE44_APP_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`

## Install Commands

Install frontend dependencies:

```powershell
cd antokton-export
npm install
```

The backend currently uses Node built-ins only and has no separate `package.json`.

## Backend Run Commands

From the project root:

```powershell
node backend/server.js
```

Windows helper:

```powershell
powershell -ExecutionPolicy Bypass -File backend/run-server.ps1
```

Or use the included command files:

```powershell
backend\start-backend.cmd
backend\start-backend-log.cmd
```

The backend serves:

- API routes under `http://127.0.0.1:8787/api`
- uploads under `http://127.0.0.1:8787/uploads`
- built frontend from `antokton-export/dist` when it exists

## Frontend Run Commands

In a second terminal:

```powershell
cd antokton-export
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://127.0.0.1:8787`.

Typical frontend URL:

```text
http://127.0.0.1:5173
```

## Local Full App URL

After building the frontend, the backend can serve the app directly:

```text
http://127.0.0.1:8787/Home
```

If the browser shows the Antokton offline page, the backend is probably not running or the service worker is serving cached offline content. Restart the backend and refresh with `Ctrl+F5`.

## Build Commands

Build the frontend:

```powershell
cd antokton-export
npm run build
```

Then serve the built app from the backend:

```powershell
cd ..
node backend/server.js
```

## Local Test Instructions

Backend smoke test:

```powershell
powershell -ExecutionPolicy Bypass -File backend/smoke-test.ps1
```

Backend health checks:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8787/health -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:8787/health/config -UseBasicParsing
```

`/health/config` returns only safe status, such as environment, port, SQLite path status, upload directory status, Stripe key configured flags, and whether development auth is active. It never returns Stripe secrets, tokens, passwords, or `.env` values.

Manual checks:

1. Start the backend.
2. Open `http://127.0.0.1:8787/health`.
3. Open `http://127.0.0.1:8787/health/config`.
4. Open `http://127.0.0.1:8787/Home`.
5. Open `http://127.0.0.1:8787/AkademiaAdmin`.
6. Confirm no offline page appears while the backend is running.
7. If using Vite dev mode, open `http://127.0.0.1:5173/Home`.

Frontend build check:

```powershell
cd antokton-export
npm run build
```

## Safe Development Rules

- Read `AGENTS.md`, `AUDIT_REPORT.md`, and `PRODUCTION_ROADMAP.md` before code changes.
- Keep changes small and reversible.
- Do not delete Base44 export/reference files yet.
- Do not remove SQLite/local backend until a tested replacement exists.
- Do not commit real secrets or `.env` files.
- Use `.env.example` to document required variables.
