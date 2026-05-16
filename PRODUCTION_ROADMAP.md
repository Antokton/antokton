# Antokton Production Roadmap

Date: 2026-05-13

Goal: make Antokton independent from Base44, production-ready for web first, and later packageable as a mobile app, without rewriting from scratch.

## Phase 0 - Freeze And Baseline

Purpose: create a stable checkpoint before deeper production changes.

Steps:

1. Keep `antokton-export` as the active frontend.
2. Keep `backend` as the active local API.
3. Do not delete `antokton-reference/entities` or `antokton-reference/functions`; treat them as migration references.
4. Add a documented `.env.example` later for frontend/backend variables.
5. Run and record baseline checks:
   - `npm run build` in `antokton-export`
   - backend smoke test
   - core pages: Home, Feed, Profile, Events, EventDetail, Statuset, Pazar, Akademia
6. Decide the initial production host and database provider before making environment-specific changes.

Exit criteria:

- Current local app still works.
- Build and smoke test are documented.
- No Base44 package dependency is required for the active frontend.

## Phase 1 - Base44 Removal

Purpose: remove runtime Base44 concepts without breaking the frontend.

Steps:

1. Keep `src/api/antoktonClient.js` as a compatibility adapter for now.
2. Rename internally in a later commit:
   - `antoktonClient.js` to `antoktonClient.js`
   - exported `base44` object to `antoktonApi`
3. Update imports gradually through pages/components.
4. Replace Base44 URL parameter names in `src/lib/app-params.js`:
   - `base44_access_token`
   - `VITE_BASE44_APP_ID`
   - `VITE_BASE44_FUNCTIONS_VERSION`
   - `VITE_BASE44_APP_BASE_URL`
5. Keep backend compatibility routes until every frontend call is migrated.
6. Move useful logic from `antokton-reference/functions/*/entry.ts` into Node backend modules or worker jobs.
7. Mark `antokton-design-import-archive-20260508-153758` as archive/reference.

Exit criteria:

- No active source imports `@base44/sdk`.
- No active build uses `@base44/vite-plugin`.
- Frontend source uses Antokton naming for new code.
- Base44-shaped endpoints remain only as compatibility aliases.

## Phase 2 - Real Auth

Purpose: replace dev identity with real accounts, sessions, and permissions.

Steps:

1. Choose auth approach:
   - Custom email/password with JWT or secure cookies, or
   - Supabase Auth, or
   - Auth.js/NextAuth-style provider if the stack changes later.
2. Add users table/model with:
   - email
   - password hash or provider identity
   - role
   - member category
   - verification state
   - disabled/banned state
3. Remove default `dev:` token fallback in production mode.
4. Implement:
   - login
   - register
   - logout
   - email verification
   - password reset
   - token/session refresh
5. Add middleware/helpers for:
   - authenticated user
   - admin/moderator
   - owner/poster permissions
   - employer permissions
   - mentor permissions
6. Replace frontend `redirectToLogin()` dev-token behavior with a real login screen.
7. Add rate limits for login/register/reset endpoints.

Exit criteria:

- A user cannot impersonate another user by editing a bearer token.
- Admin-only actions are enforced server-side.
- Public/private routes behave correctly.
- Existing frontend pages still load with real auth.

## Phase 3 - PostgreSQL/Supabase Migration

Purpose: move from local SQLite JSON storage to a durable production database.

Steps:

1. Choose provider:
   - Supabase Postgres, or
   - Managed PostgreSQL on the chosen host/cloud.
2. Create migration tooling:
   - SQL migrations, or
   - Prisma/Drizzle/Knex migrations.
3. Keep `entity_records` as a compatibility table at first.
4. Add normalized tables in priority order:
   - users
   - jobs/posts
   - job_applications
   - events
   - event registrations/comments
   - statuses
   - status comments/reactions
   - companies
   - messages
   - notifications
   - subscriptions/payments
   - akademia courses/applications/attendance/evaluations/certificates
5. Add indexes for common filters:
   - entity type/status/date
   - user email
   - country/city/category
   - featured day/week
   - certificate number
6. Write a one-way migration from SQLite `entity_records` into Postgres.
7. Add backups and restore testing.
8. Add database-level constraints where the model is stable.

Exit criteria:

- Production uses Postgres.
- Data can be migrated from current SQLite.
- Critical workflows no longer rely only on schemaless JSON.
- Backups and restore are tested.

## Phase 4 - Cloud Storage

Purpose: replace local `backend/uploads` with durable file storage.

Steps:

1. Choose storage:
   - Supabase Storage
   - S3
   - Cloudflare R2
   - DigitalOcean Spaces
2. Define buckets:
   - public assets
   - user uploads
   - private documents/CVs
   - generated certificates/PDFs
3. Implement server-side upload handling:
   - file size limits
   - MIME validation
   - allowed extensions
   - filename normalization
   - optional virus scanning
4. Replace `/uploads` local serving with storage URLs or signed URL endpoints.
5. Migrate current local uploads to cloud storage.
6. Keep local upload mode only for development.

Exit criteria:

- New uploads go to cloud storage in production.
- Private files are not publicly readable by accident.
- Existing local files have migration mapping.

## Phase 5 - Production Integrations

Purpose: make placeholders real.

Steps:

1. Email:
   - Implement SMTP/Resend/Postmark/SendGrid provider.
   - Replace `email_logs`-only behavior with real sending plus logs.
2. AI:
   - Implement server-side AI provider for `InvokeLLM`-style operations.
   - Add prompt/version logging.
   - Add cost/rate controls.
3. Stripe:
   - Implement real checkout sessions.
   - Verify webhook signatures.
   - Store payment/subscription state in normalized tables.
4. Notifications:
   - Define in-app notification rules.
   - Add optional email digests.
5. Imports:
   - Harden `importJobPost` and `importMarketplacePost`.
   - Handle scraping failures and moderation.
6. External publishing:
   - Implement Facebook/other publishing only after permissions and audit logs are ready.

Exit criteria:

- Email, AI, Stripe, and webhook flows work against real providers.
- Secrets live in environment/secret manager, not source.
- Failed integration calls are logged and visible.

## Phase 6 - Backend Hardening And Deployment

Purpose: deploy web production safely.

Steps:

1. Choose deployment shape:
   - Single Node service serving API and built frontend, or
   - Static frontend on CDN plus Node API service.
2. Add production config:
   - `NODE_ENV=production`
   - strict allowed origins
   - secure cookie/JWT settings
   - database URL
   - storage credentials
   - provider keys
3. Add security middleware or equivalents:
   - CORS allowlist
   - request body limits
   - rate limiting
   - security headers
4. Add logs and monitoring:
   - request IDs
   - structured logs
   - error tracking
   - uptime checks
   - metrics
5. Add CI/CD:
   - install
   - lint
   - build
   - tests/smoke tests
   - deploy
6. Configure domain and HTTPS.
7. Configure backups:
   - database
   - storage
   - environment/secrets inventory

Exit criteria:

- Web app is deployed on HTTPS.
- Production environment does not use dev auth.
- Logs, backups, and rollback path exist.

## Phase 7 - PWA And Mobile App Preparation

Purpose: prepare for phone use first as PWA, then native wrapper if needed.

Steps:

1. Review existing PWA files:
   - `public/manifest.json`
   - `public/sw.js`
   - `public/offline.html`
   - `src/lib/registerServiceWorker.js`
2. Make service worker production-safe:
   - avoid caching private API responses incorrectly
   - version cache on every release
   - handle logout/cache clearing
3. Improve mobile UX:
   - test core flows on phone viewport
   - check navigation, forms, uploads, chat, maps, certificates, payments
4. Add install prompts only where appropriate.
5. Decide native packaging:
   - Capacitor if keeping React/Vite web app
   - React Native only if true native UI is required later
6. For Capacitor:
   - set app id/name
   - configure icons/splash
   - configure file upload/camera permissions
   - configure push notifications if needed
7. Validate App Store / Play Store requirements:
   - privacy policy
   - account deletion
   - data safety
   - content moderation/reporting

Exit criteria:

- PWA works reliably on mobile browsers.
- Core flows pass mobile testing.
- App packaging choice is documented.
- Store compliance gaps are listed before native submission.

## Suggested Order Of Work

1. Create `.env.example` and production config notes.
2. Implement real auth.
3. Add authorization checks to backend entity writes.
4. Choose and wire PostgreSQL/Supabase.
5. Migrate uploads to cloud storage.
6. Port Base44 exported functions to backend modules.
7. Implement Stripe/email/AI providers.
8. Deploy web production.
9. Harden PWA and mobile UX.
10. Package with Capacitor only after the web production path is stable.
