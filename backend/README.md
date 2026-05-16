# Antokton Backend Scaffold

This is an independent backend for Antokton. It is compatible with the API
shape that the exported frontend used on Base44, but it runs locally and stores
data in SQLite.

- `/api/apps/{appId}/entities/{Entity}`
- `/api/apps/{appId}/entities/User/me`
- `/api/apps/{appId}/functions/{functionName}`
- `/api/apps/{appId}/integration-endpoints/Core/{operation}`
- `/api/apps/public/prod/public-settings/by-id/{appId}`

It uses Node built-ins only and stores data in SQLite via `node:sqlite`.
Use a recent Node version that includes `node:sqlite` (the bundled runtime here
is Node 25).

If `../antokton-export/antokton-reference/entities/*.jsonc` exists, the backend loads those
entity schemas at startup and saves them into `entity_schemas`.

## Run

```powershell
node backend/server.js
```

Open:

```text
http://localhost:8787
```

On Windows you can also use:

```powershell
powershell -ExecutionPolicy Bypass -File backend/run-server.ps1
```

The server also serves the downloaded frontend assets:

- `antokton.html`
- `antokton-index.js`
- `antokton-index.css`

## Useful Environment Variables

```powershell
$env:PORT="8787"
$env:APP_ID="6991d40eddf82cc25ec834a7"
$env:ANTOKTON_DEV_USER_EMAIL="admin@antokton.local"
$env:DB_PATH="C:\path\to\antokton.sqlite"
node backend/server.js
```

## What Works Now

- Generic CRUD for all frontend entities
- Runtime loading of exported Base44 entity schemas
- Filtering with the Base44 `q` parameter
- Sorting, limit, skip and field projection
- `User/me`, login and register development flow
- File uploads through `Core.UploadFile`
- Email logging through `Core.SendEmail`
- Safe placeholder AI responses through `Core.InvokeLLM`
- Local implementations/placeholders for the exported custom functions
- Production static serving from `../antokton-export/dist` when built

## Smoke Test

```powershell
powershell -ExecutionPolicy Bypass -File backend/smoke-test.ps1
```

Expected output:

```text
health=200
schemas=200
settings=200
user=200
create=200
list=200
```

## Next Production Steps

1. Replace dev auth with real auth (JWT sessions, password hashing, OAuth if needed).
2. Configure SMTP or an email provider for `Core.SendEmail`.
3. Implement custom functions: imports, job matching, CV generation, recommendations.
4. Move high-value entities like `Job`, `User`, `Status`, `Event`, `ChatMessage`
   into normalized tables once the workflows are stable.
5. Add backups and deployment config for the production host.
