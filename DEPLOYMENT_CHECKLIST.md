# Antokton Deployment Checklist

Date: 2026-05-16

Scope: prepare the current Antokton project for a first online beta without refactoring business logic, without replacing SQLite, and without implementing PostgreSQL or object storage yet.

## Current Local Verification

Run against the active local project at:

`C:\Users\Windows 11\Desktop\AnTokTon\Projekti lokal`

Verified on 2026-05-16:

- Backend syntax checks passed:
  - `node --check backend/config.js`
  - `node --check backend/auth.js`
  - `node --check backend/db.js`
  - `node --check backend/storage.js`
  - `node --check backend/server.js`
- Frontend production build passed from `antokton-export`:
  - `npm.cmd run build`
- Local backend health passed:
  - `GET http://127.0.0.1:8787/health`
  - `GET http://127.0.0.1:8787/health/config`
- Current `/health/config` status:
  - environment: `development`
  - database: `sqlite`
  - storageMode: `local`
  - dev auth active: `true`
  - Stripe keys configured: `false`

Important local note: there is also an older copied workspace under `Documents\Codex`. Do not deploy from that older copy unless dependencies are reinstalled there. Its `node_modules` currently points at the Desktop project and can make Vite build with invalid paths.

## Recommended First Beta Topology

Use a single Node web service first:

- Backend: Railway or Render
- Frontend: served by the same Node backend from `antokton-export/dist`
- Database: current SQLite on a persistent disk or volume, beta-only
- Uploads: current local uploads on the same persistent disk or volume, beta-only

Why this is recommended first:

- Current frontend calls `/api/...` and `/uploads/...` as same-origin relative URLs.
- The Node backend already serves the built frontend and API together.
- It avoids CORS/proxy issues for the first beta.
- It avoids a frontend code change before the first deployment.

## Restricted Beta Single-Service Deployment Steps

Use these exact settings for the first restricted beta on Railway or Render.

Deployment source:

- Root directory: project root, the folder that contains `backend`, `antokton-export`, `.env.example`, and `DEPLOYMENT_CHECKLIST.md`.
- Do not set the service root to `antokton-export`; the backend must start from the project root.

Build command:

```bash
npm --prefix antokton-export ci && npm --prefix antokton-export run build
```

Start command:

```bash
node backend/server.js
```

Health check path:

```text
/health
```

Persistent disk/volume:

- Mount a persistent disk before opening the beta.
- Use one mounted path for SQLite and uploads, for example `/data`.
- Set `DATA_DIR`, `DB_PATH`, and `UPLOAD_DIR` to paths on that persistent disk.

Required beta environment variables:

```text
NODE_ENV=production
APP_ID=6991d40eddf82cc25ec834a7
DATA_DIR=/data
DB_PATH=/data/antokton.sqlite
UPLOAD_DIR=/data/uploads
MAX_REMOTE_ASSET_BYTES=78643200
STRIPE_FALLBACK_URL=/Subscriptions
```

Host-provided environment:

- Railway/Render normally provide `PORT`; do not hardcode it unless the host requires it.

After deploy, verify these URLs on the deployed domain:

```text
/health
/health/config
/Home
/api/local/entity-schemas
/uploads/<known-existing-file>
```

Expected behavior:

- `/health` returns HTTP 200 JSON.
- `/health/config` returns safe config status without secret values.
- `/Home` returns the React app HTML from `antokton-export/dist`.
- `/api/local/entity-schemas` returns JSON.
- `/uploads/<known-existing-file>` returns the uploaded file.

## Railway / Render Backend Checklist

Before deploying:

- Confirm the deployment folder is the active project root.
- Confirm the host supports the Node version needed by `node:sqlite` and `DatabaseSync`.
- Add a persistent disk or volume before using SQLite/uploads online.
- Set the service start command:
  - `node backend/server.js`
- Set the build command:
  - `npm --prefix antokton-export ci`
  - `npm --prefix antokton-export run build`
- Confirm `antokton-export/dist/index.html` exists after build.
- Confirm `/health` returns 200 after deployment.
- Confirm `/health/config` returns safe status and does not expose secrets.
- Add a custom domain only after health checks pass.

Required environment variables for beta:

- `NODE_ENV=production`
- `PORT` should be provided by the host, or set by the service if required.
- `APP_ID=6991d40eddf82cc25ec834a7`
- `DATA_DIR=/data` or the host's persistent disk path
- `DB_PATH=/data/antokton.sqlite`
- `UPLOAD_DIR=/data/uploads`
- `MAX_REMOTE_ASSET_BYTES=78643200`
- `STRIPE_FALLBACK_URL=/Subscriptions`

Beta-only warning:

- Do not treat `ANTOKTON_DEV_USER_EMAIL` or `dev:` bearer tokens as production auth.
- If the beta is public, real auth is a blocker.
- If the beta is private/internal, dev auth can only be used temporarily with restricted access.

## Vercel Frontend Checklist

Use Vercel only if the frontend is deployed separately from the backend.

Frontend settings:

- Project root: `antokton-export`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment:
  - `VITE_ANTOKTON_APP_ID=6991d40eddf82cc25ec834a7`

Required for current code:

- Configure rewrites/proxy rules so these paths go to the backend service:
  - `/api/:path*`
  - `/uploads/:path*`
- Without rewrites, the Vercel frontend will render but API calls and images/uploads will fail.
- If rewrites are not used, the frontend needs a future API base URL change. Do not do that in this no-refactor step.

Recommended first beta decision:

- Prefer single Railway/Render service first.
- Add Vercel later only when API base URL, CORS, auth cookies/tokens, and deployment domains are decided.

## Cloudflare R2 Checklist

R2 is not implemented yet in `backend/storage.js`.

Prepare these, but do not switch storage yet:

- Create separate buckets for:
  - public media/assets
  - private user documents
  - generated certificates/PDFs
- Prepare environment variable names already listed in `.env.example`:
  - `STORAGE_DRIVER=r2`
  - `STORAGE_PUBLIC_BASE_URL`
  - `S3_ENDPOINT`
  - `S3_REGION=auto`
  - `S3_BUCKET`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_FORCE_PATH_STYLE=true`
- Decide public/private object policy.
- Decide signed URL behavior for private documents.
- Add file size, MIME type, extension, and virus-scan policy before public uploads.

Blocker:

- Current backend only supports `storageMode: local`. R2 requires a future implementation in `backend/storage.js` and should be tested before removing local uploads.

## Pre-Deploy Commands

From the active project root:

```powershell
node --check backend/config.js
node --check backend/auth.js
node --check backend/db.js
node --check backend/storage.js
node --check backend/server.js
npm --prefix antokton-export ci
npm --prefix antokton-export run build
```

Then start locally:

```powershell
node backend/server.js
```

Smoke checks:

```text
GET /health
GET /health/config
GET /Home
GET /Feed
GET /Statuset
GET /Events
GET /Pazar
GET /Akademia
GET /uploads/<known-file>
```

## First Online Beta Blockers

1. Real auth is not implemented. Current dev auth and `dev:` tokens are unsafe for public production.
2. SQLite and local uploads require a persistent disk/volume, backup plan, and single-instance deployment discipline.
3. Cloudflare R2 is only planned. `backend/storage.js` still uses local storage only.
4. Vercel split deployment needs rewrites for `/api` and `/uploads`, or the frontend will break.
5. Stripe, email, AI, Facebook publishing, and several exported Base44 functions are still placeholders or reference implementations.
6. CORS and permission enforcement are not production-grade yet.
7. The deployment host must support the Node version required by `node:sqlite` / `DatabaseSync`.

## Beta Go / No-Go

Go for a restricted beta only if:

- The beta is private or access is controlled outside the app.
- Railway/Render has a persistent volume for SQLite and uploads.
- Daily backup/export is set up for the SQLite DB and upload folder.
- The host passes `/health` and `/health/config` after deploy.
- Public payment/email/AI features are hidden, disabled, or clearly marked as unavailable.

No-go for a public beta until:

- Real production auth is implemented.
- Storage is moved to R2/S3-compatible object storage or equivalent.
- Database migration path to PostgreSQL/Supabase-compatible schema is tested.
- Admin/moderator permissions are enforced server-side.
