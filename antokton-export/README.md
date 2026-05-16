# Antokton Frontend

This is the Antokton frontend exported from Base44 and patched to run against
the local Antokton backend in `../backend`. It no longer imports the Base44 SDK
or Base44 Vite plugin.

## Development

Start the backend first:

```powershell
node ..\backend\server.js
```

Then start the frontend:

```powershell
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://127.0.0.1:8787`, so the app uses
the local backend while developing.

## Environment

Optional `.env.local`:

```text
VITE_ANTOKTON_APP_ID=6991d40eddf82cc25ec834a7
VITE_ANTOKTON_DEV_USER_EMAIL=admin@antokton.local
```

## Production

Build the frontend:

```powershell
npm run build
```

The backend will serve `antokton-export/dist` automatically when it exists.
