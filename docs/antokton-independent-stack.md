# Antokton Independent Stack

Source added by user:

```text
C:\Users\Windows 11\Downloads\antokton.zip
```

Extracted to:

```text
antokton-export
```

## What Was Changed

### Backend

The backend in `backend/server.js` now runs as the local Antokton API:

- SQLite database via `node:sqlite`
- Generic document CRUD for every Antokton entity
- Schema loading from `antokton-export/antokton-reference/entities/*.jsonc`
- Local auth-compatible endpoints
- Local function endpoints
- Local upload/email/AI integration-compatible endpoints
- Static serving of `antokton-export/dist` after frontend build

### Frontend

The exported frontend was patched to stop using Base44 runtime packages:

- Removed `@base44/sdk` import from `src/api/antoktonClient.js`
- Removed `@base44/sdk/dist/utils/axios-client` import from `src/lib/AuthContext.jsx`
- Removed `@base44/vite-plugin` from `vite.config.js`
- Removed Base44 packages from top-level `package.json` dependencies
- Added Vite proxy for `/api` and `/uploads` to the local backend

## Schema Source

The zip contains 14 exported entity schemas:

CharityProject, CommentLike, EducationPartner, ImportedPost, Job, JobComment,
MediaChannel, MediaPost, NavConfig, Report, Status, StatusComment, User,
UserActivity.

The public built frontend also references additional entities. The backend
supports them dynamically through `entity_records`, even when no JSONC schema is
present yet.

## Run Locally

Terminal 1:

```powershell
node backend/server.js
```

Terminal 2:

```powershell
cd antokton-export
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

## Production Build

```powershell
cd antokton-export
npm run build
cd ..
node backend/server.js
```

Then open:

```text
http://localhost:8787
```

The backend serves `antokton-export/dist` automatically.

## Remaining Production Integrations

These are structurally wired but need real credentials/providers before launch:

- SMTP/email provider for `Core.SendEmail`
- AI provider for `Core.InvokeLLM` and AI functions
- Stripe secret/publishable keys for subscriptions
- Facebook publishing credentials
- Hard auth/JWT password flow instead of development `dev:` token
- Backup strategy for `backend/data/antokton.sqlite` and `backend/uploads`
