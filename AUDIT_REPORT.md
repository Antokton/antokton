# Antokton Production Audit Report

Date: 2026-05-13

## Scope

This audit covers the active local Antokton project without rewriting or deleting files. Inspected areas:

- Repository structure
- `antokton-export/package.json`
- `antokton-export/vite.config.js`
- `antokton-export/src/api`
- `antokton-export/src/lib`
- `antokton-export/src/pages`
- `antokton-export/antokton-reference/entities`
- `antokton-export/antokton-reference/functions`
- `backend/server.js`
- `backend/schema.sql`
- `backend/README.md`

## Repository Structure

The project is currently split into these main areas:

- `antokton-export/`: active React/Vite frontend exported from Base44 and patched to use the local backend.
- `backend/`: custom Node.js backend that emulates the Base44 API shape and serves the built frontend.
- `backend/data/`: local SQLite database storage.
- `backend/uploads/`: local uploaded and localized assets.
- `docs/`: previous architecture notes.
- `antokton-design-import-archive-20260508-153758/`: older/reference Base44 eject snapshot.
- `.npm-cache/`: npm/npx cache used during local setup.
- `antokton.html`, `antokton-index.js`, `antokton-index.css`: downloaded live-site artifacts/reference files.

## Frontend Dependency Check

The active frontend does not currently depend on the Base44 SDK or Base44 Vite plugin in the normal Vite build path.

Findings:

- `antokton-export/package.json` has no `@base44/sdk`.
- `antokton-export/package.json` has no `@base44/vite-plugin`.
- `antokton-export/vite.config.js` only uses `@vitejs/plugin-react`.
- `antokton-export/vite.config.js` proxies `/api` and `/uploads` to `http://127.0.0.1:8787` for development.
- A search across `antokton-export/package.json`, `package-lock.json`, `vite.config.js`, and `src` found no active `@base44` dependency.

Important nuance: the app still uses a local compatibility client named `base44` in `src/api/antoktonClient.js`. That is not the real Base44 SDK; it is a local wrapper that calls the custom backend's Base44-shaped routes.

## Remaining Base44 Usages

### Compatibility API names that can stay temporarily

These are still present because they keep the exported frontend working:

- `base44.entities.*`
- `base44.auth.*`
- `base44.integrations.Core.*`
- `base44.functions.invoke(...)`
- Base44-shaped URLs such as `/api/apps/{appId}/entities/{Entity}`
- Base44-style `app_id`, `access_token`, `functions_version`, and local storage keys in `src/lib/app-params.js`

These are not automatically external Base44 calls now. They go to the local backend. They can stay during migration, but should eventually be renamed/replaced with Antokton-native APIs.

### Base44 export files still present

`antokton-export/antokton-reference/entities` contains 60 JSONC entity schemas. These are currently useful as schema metadata for the local backend.

`antokton-export/antokton-reference/functions` contains 42 exported function folders. Most are still Base44/Deno-style source files. 40 function entries still import `npm:@base44/sdk`. These are not part of the active Vite frontend bundle, but they are important migration references.

Examples of Base44-exported function concerns:

- `createCheckout`, `createPremiumCheckout`, `createFeaturedCheckout`, `createSubscriptionCheckout`
- `stripeWebhook`, `premiumWebhook`, `featuredWebhook`, `subscriptionWebhook`
- `generateCV`, `generateCoverLetter`, `generateProfileSuggestions`, `rankApplications`
- `importJobPost`, `importMarketplacePost`
- `notifyApprovalEmail`, `notifyJobApplication`, `notifyJobComment`, `notifyNewJobMatches`
- `syncGoogleCalendar`
- `publishToFacebook`

These should be ported to the Node backend or a new production worker layer before production launch.

### Backend scripts that still reference Base44/live data

These are import/support tools, not runtime frontend dependencies:

- `backend/import-live-data.js` can import data from `https://antokton.com` or `https://app.base44.com`.
- `backend/live-import-login-server.js` exists to help with live import login.
- Environment variables such as `LIVE_ORIGIN`, `BASE44_API_URL`, and `LIVE_AUTHORIZATION` are still used by import tooling.

These can remain as migration tools, but they should not be part of normal production runtime.

## What Works Now

### Frontend

- React/Vite app builds and runs locally.
- Routes/pages are largely intact from the Base44 export.
- The active frontend talks to the local backend through `src/api/antoktonClient.js`.
- PWA basics exist: `manifest.json`, `sw.js`, offline page, app icons, and service worker registration.
- Local assets are present under `antokton-export/public/local-assets`.
- Recently added modules/pages such as Akademia Antokton are present in the active frontend.

### Backend

- Node.js server runs without Express and uses Node built-ins.
- SQLite storage works through `node:sqlite`.
- Generic CRUD exists for Base44-style entity endpoints.
- Entity schemas are loaded from `antokton-export/antokton-reference/entities`.
- `User/me`, login, and register development flows exist.
- Local file uploads work through `Core.UploadFile`.
- Uploaded files are served from `/uploads`.
- `Core.SendEmail` logs email payloads locally.
- `Core.InvokeLLM` returns safe placeholder responses.
- Several custom functions have local placeholder or simplified implementations.
- Built frontend can be served from `antokton-export/dist`.

## Fake Or Development-Only Parts

These parts are useful locally but are not real production behavior:

- Auth tokens are development tokens like `dev:admin@antokton.local`.
- Login/register do not use password hashing or real credential verification.
- `base44.auth.redirectToLogin()` silently creates/sets a dev token instead of redirecting to a real login page.
- `Core.SendEmail` only writes to `email_logs`; it does not send email.
- `Core.InvokeLLM` returns empty/schema-shaped placeholder data; it does not call an AI provider.
- Stripe checkout functions create local pending records or fallback URLs; they do not complete real payments.
- Facebook publishing returns "not configured".
- Some recommendation/search/matching functions use simple text overlap or placeholder logic.
- PDF generation uses a minimal placeholder PDF.
- Base44 exported functions in `antokton-export/antokton-reference/functions` are reference code, not production Node runtime code.
- SQLite and local uploads are fine for local use, but not enough for multi-server production.
- Import tools still depend on live Base44/antokton origins when used.

## Unsafe For Production

These items should be addressed before public launch:

- Dev auth accepts/derives identity from bearer tokens and falls back to `ANTOKTON_DEV_USER_EMAIL`.
- No real password hashing, JWT/session validation, OAuth, email verification, reset flow, or refresh-token handling.
- No clear role/permission enforcement layer across all entity operations.
- `asServiceRole` exists in the frontend compatibility client and maps to the same entity API.
- CORS is `Access-Control-Allow-Origin: *`.
- Tokens are stored in localStorage, which raises XSS impact.
- Entity data is schemaless JSON in one table; this is flexible but weak for constraints, indexing, reporting, and permissions.
- SQLite is a single-file local database; production needs backups, migrations, connection strategy, and preferably PostgreSQL/Supabase.
- Local uploads in `backend/uploads` need cloud storage, signed/public URL policy, file size limits, virus scanning, and backup.
- File upload handling needs stricter validation for MIME type, size, and allowed extensions.
- No obvious rate limiting, brute-force protection, or abuse throttling.
- No production-grade logging, metrics, alerting, request IDs, or audit trail policy.
- No CSRF strategy if cookie auth is introduced later.
- No secrets management plan documented for Stripe, email, AI, OAuth, storage, and database credentials.
- Service worker caches API GET requests; this needs careful production rules for private/user-specific data.
- AI, email, Stripe, Google Calendar, Facebook, and webhook behavior are not production-complete.

## What Must Be Replaced

Before production, replace or implement:

- Development auth with real authentication and authorization.
- SQLite/local disk persistence with PostgreSQL or Supabase Postgres.
- Local uploads with S3/Supabase Storage/R2 and a clear access policy.
- `Core.SendEmail` placeholder with a real email provider.
- `Core.InvokeLLM` placeholder with an AI provider and server-side API keys.
- Stripe checkout and webhook placeholders with real Stripe sessions and verified webhooks.
- Base44/Deno exported functions with production Node routes/workers.
- `app-params.js` Base44 naming with Antokton-native naming once migration is stable.
- Frontend `base44` compatibility client with an Antokton API client, after endpoints are stable.
- Broad CORS and dev-token behavior with production security config.

## What Can Stay

These parts can remain while production hardening proceeds:

- React/Vite/Tailwind/shadcn-style frontend.
- Existing pages and component structure.
- `src/api/antoktonClient.js` as a temporary compatibility adapter.
- Base44-shaped API routes as a compatibility layer during migration.
- `antokton-export/antokton-reference/entities` as schema/reference metadata.
- `entity_records` as a temporary flexible compatibility table.
- Local backend development commands and smoke tests.
- PWA manifest/service worker foundation, after cache rules are reviewed.
- Downloaded/reference live-site files, as long as they are clearly treated as reference artifacts.

## Key File Findings

### `backend/server.js`

- Loads entity schemas from `antokton-export/antokton-reference/entities`.
- Creates and uses SQLite tables directly at startup.
- Implements Base44-compatible entity CRUD routes.
- Implements dev auth through `dev:` bearer tokens.
- Implements local upload serving.
- Implements placeholders for email, AI, Stripe checkout, Facebook, recommendations, moderation, and PDF generation.
- Serves `antokton-export/dist` when built.

### `backend/schema.sql`

- Uses generic `entity_records` JSON storage.
- Includes `uploaded_files`, `email_logs`, `function_logs`, and `entity_schemas`.
- Does not define normalized tables for users, jobs, events, messages, payments, or permissions yet.

### `antokton-export/src/api/antoktonClient.js`

- Replaces the real Base44 SDK with local fetch calls.
- Preserves `base44.entities`, `base44.auth`, `base44.integrations.Core`, `base44.functions`, and `base44.users` shapes.
- Uses dev-token fallback by default.
- Stores tokens under `antokton_access_token`, `base44_access_token`, and `token`.

### `antokton-export/src/lib`

- `AuthContext.jsx` still follows Base44-style app public settings and auth flow.
- `app-params.js` still uses Base44 parameter/storage naming.
- `registerServiceWorker.js` enables PWA behavior.
- Other files are normal local utilities and can stay.

### `antokton-export/src/pages`

- 56 page files exist.
- Most pages use `base44` compatibility APIs directly.
- This is acceptable during migration, but a later phase should introduce domain APIs or hooks to reduce direct entity calls from pages.

### `antokton-export/antokton-reference/entities`

- 60 entity schemas exist.
- These are valuable for migration planning and for generating database models.
- They should not be deleted yet.

## Production Readiness Summary

The project is independent enough to run locally without Base44 for many workflows, but it is not production-ready yet. The frontend no longer needs Base44 packages for the active build. The backend is a strong compatibility scaffold, but it intentionally contains dev-only shortcuts and placeholders. The next major work is to keep the current app working while replacing auth, database, storage, email, AI, Stripe, and exported function behavior with production-grade implementations.
