# Antokton Authentication Migration Plan

Date: 2026-05-13

This document is a planning artifact only. It does not implement authentication changes and must not be treated as a production security guarantee. The current application must keep working while authentication is migrated in small, testable phases.

## Scope

- Audit the current development authentication flow in the local backend and frontend.
- Identify the current auth endpoints and frontend dependency points.
- Define a safe migration path from dev-only auth to production auth.
- Preserve current endpoint compatibility until the frontend migration is ready.
- Do not remove the Base44-compatible local client in this step.

## Files Inspected

- `AGENTS.md`
- `AUDIT_REPORT.md`
- `PRODUCTION_ROADMAP.md`
- `DEVELOPMENT_SETUP.md`
- `PLATFORM_DEPENDENCY_REPORT.md`
- `backend/server.js`
- `backend/config.js`
- `backend/README.md`
- `backend/smoke-test.js`
- `backend/smoke-test.ps1`
- `backend/import-live-data.js`
- `backend/live-import-login-server.js`
- `antokton-export/src/api/antoktonClient.js`
- `antokton-export/src/lib/AuthContext.jsx`
- `antokton-export/src/lib/app-params.js`
- `antokton-export/src/Layout.jsx`
- Frontend files found by searching for `base44.auth`, `useAuth`, `Authorization`, `Bearer`, `User/me`, `auth/login`, and `auth/register`.

## Current Dev Auth Behavior

The local backend currently emulates the Base44 auth surface. It is useful for local development, but it is not real authentication.

### Backend Behavior

Implemented in `backend/server.js`:

- `currentUserEmail(req)` reads the `Authorization` header.
- If the header is `Authorization: Bearer dev:<email>`, it trusts `<email>` as the current user.
- If there is no valid dev token, it falls back to `DEV_USER_EMAIL`.
- `DEV_USER_EMAIL` is configured from `ANTOKTON_DEV_USER_EMAIL` through `backend/config.js`.
- `ensureUser(email, overrides)` looks for a `User` record by email.
- If the user does not exist, `ensureUser` creates one automatically.
- The default created user is currently admin-like:
  - `role: "admin"`
  - `member_category: "staff"`
  - `is_active: true`
- Generic entity create/update/delete operations use the email returned by `currentUserEmail(req)` as the acting user.

### Current Auth Endpoints

Implemented in `backend/server.js`:

- `POST /api/apps/:appId/auth/login`
  - Reads `email` and `password`, but password is not validated.
  - Ensures the user exists.
  - Returns `{ access_token: "dev:<email>", user }`.

- `POST /api/apps/:appId/auth/register`
  - Reads the submitted body.
  - Ensures the user exists.
  - Returns `{ access_token: "dev:<email>", user }`.

- `POST /api/apps/:appId/auth/verify-otp`
  - Returns `{ success: true }`.
  - No OTP validation is performed.

- `POST /api/apps/:appId/auth/resend-otp`
  - Returns `{ success: true }`.
  - No OTP is generated or sent.

- `POST /api/apps/:appId/auth/reset-password-request`
  - Returns `{ success: true }`.
  - No reset token or email is generated.

- `POST /api/apps/:appId/auth/reset-password`
  - Returns `{ success: true }`.
  - No password is changed.

- `POST /api/apps/:appId/auth/change-password`
  - Returns `{ success: true }`.
  - No current password validation is performed.

- `GET /api/apps/:appId/entities/User/me`
  - Uses `currentUserEmail(req)`.
  - Returns `ensureUser(userEmail)`.

- `PUT /api/apps/:appId/entities/User/me`
  - Uses `currentUserEmail(req)`.
  - Ensures the user exists.
  - Updates the current user record with the submitted body.

### Frontend Behavior

Implemented mainly in `antokton-export/src/api/antoktonClient.js`:

- `getToken()` reads from localStorage keys:
  - `antokton_access_token`
  - `base44_access_token`
  - `token`
- If no token exists, it creates a fallback token:
  - `dev:${VITE_ANTOKTON_DEV_USER_EMAIL || "admin@antokton.local"}`
- Every request made through `request()` sends:
  - `Authorization: Bearer <token>`
- `auth.me()` calls:
  - `/api/apps/:appId/entities/User/me`
- `auth.updateMe(data)` calls:
  - `PUT /api/apps/:appId/entities/User/me`
- `auth.loginViaEmailPassword(email, password)` calls:
  - `/api/apps/:appId/auth/login`
  - stores the returned `access_token`
- `auth.register(data)` calls:
  - `/api/apps/:appId/auth/register`
  - stores the returned `access_token`
- `auth.redirectToLogin()` currently sets a dev token and returns to the same URL.
- `auth.logout()` clears localStorage token keys.

Implemented in `antokton-export/src/lib/AuthContext.jsx`:

- Reads Base44-style app params from `appParams`.
- Sends an optional `Authorization: Bearer <appParams.token>` header when loading public settings.
- Calls `base44.auth.me()` to resolve the logged-in user.
- Calls `base44.auth.logout()` and `base44.auth.redirectToLogin()` for logout/login routing.

Implemented in `antokton-export/src/lib/app-params.js`:

- Stores Base44-style URL params in localStorage keys.
- Reads `access_token` from the URL.
- Clears `base44_access_token` and `token` when `clear_access_token=true`.

## Frontend Files Depending On Current Auth

Direct auth endpoint implementation is centralized in:

- `antokton-export/src/api/antoktonClient.js`

Auth context and app token handling:

- `antokton-export/src/lib/AuthContext.jsx`
- `antokton-export/src/lib/app-params.js`
- `antokton-export/src/App.jsx`
- `antokton-export/src/components/ProtectedRoute.jsx`
- `antokton-export/src/lib/NavigationTracker.jsx`
- `antokton-export/src/lib/PageNotFound.jsx`

Layout and navigation auth usage:

- `antokton-export/src/Layout.jsx`
- `antokton-export/src/components/mobile/MobileBottomNav.jsx`
- `antokton-export/src/components/NotificationBell.jsx`
- `antokton-export/src/components/notifications/ChatNotificationSystem.jsx`
- `antokton-export/src/components/ChatButton.jsx`
- `antokton-export/src/components/ChatWindow.jsx`

Pages and components using `base44.auth.me`, `isAuthenticated`, `redirectToLogin`, `updateMe`, or `logout`:

- `antokton-export/src/components/company/CompanyReviews.jsx`
- `antokton-export/src/components/feed/SavedSearches.jsx`
- `antokton-export/src/components/job/CommentItem.jsx`
- `antokton-export/src/components/job/CVAnalyzer.jsx`
- `antokton-export/src/components/profile/UserRatingSection.jsx`
- `antokton-export/src/components/ratings/DetailedRatingForm.jsx`
- `antokton-export/src/pages/About.jsx`
- `antokton-export/src/pages/Admin.jsx`
- `antokton-export/src/pages/AdminAnalytics.jsx`
- `antokton-export/src/pages/AdminSuggestions.jsx`
- `antokton-export/src/pages/Akademia.jsx`
- `antokton-export/src/pages/AkademiaAdmin.jsx`
- `antokton-export/src/pages/AkademiaCourseDetail.jsx`
- `antokton-export/src/pages/AkademiaMentor.jsx`
- `antokton-export/src/pages/ApplicationsDashboard.jsx`
- `antokton-export/src/pages/Bamiresi.jsx`
- `antokton-export/src/pages/Bileta.jsx`
- `antokton-export/src/pages/BulkImport.jsx`
- `antokton-export/src/pages/Companies.jsx`
- `antokton-export/src/pages/ContentModeration.jsx`
- `antokton-export/src/pages/CreatePost.jsx`
- `antokton-export/src/pages/Dashboard.jsx`
- `antokton-export/src/pages/EmployerDashboard.jsx`
- `antokton-export/src/pages/EventDetail.jsx`
- `antokton-export/src/pages/Events.jsx`
- `antokton-export/src/pages/EventsCalendar.jsx`
- `antokton-export/src/pages/Feed.jsx`
- `antokton-export/src/pages/Home.jsx`
- `antokton-export/src/pages/ImportPosts.jsx`
- `antokton-export/src/pages/InspectorPanel.jsx`
- `antokton-export/src/pages/JobMatches.jsx`
- `antokton-export/src/pages/Members.jsx`
- `antokton-export/src/pages/Messages.jsx`
- `antokton-export/src/pages/NotificationCenter.jsx`
- `antokton-export/src/pages/NotificationSettings.jsx`
- `antokton-export/src/pages/PaymentHistory.jsx`
- `antokton-export/src/pages/Pazar.jsx`
- `antokton-export/src/pages/PostDetail.jsx`
- `antokton-export/src/pages/PremiumDashboard.jsx`
- `antokton-export/src/pages/Profile.jsx`
- `antokton-export/src/pages/Recommendations.jsx`
- `antokton-export/src/pages/RecruiterTools.jsx`
- `antokton-export/src/pages/Referime.jsx`
- `antokton-export/src/pages/Setup.jsx`
- `antokton-export/src/pages/StaffChat.jsx`
- `antokton-export/src/pages/Statuset.jsx`
- `antokton-export/src/pages/Subscriptions.jsx`
- `antokton-export/src/pages/UserProfiles.jsx`
- `antokton-export/src/pages/UserSearch.jsx`

No active frontend direct usage was found for:

- `/auth/verify-otp`
- `/auth/reset-password-request`
- `/auth/reset-password`

These endpoints exist in the backend compatibility surface and should remain compatible until the replacement auth client is introduced.

## Backend Files Depending On Current Auth

Runtime backend auth behavior:

- `backend/server.js`
  - `currentUserEmail`
  - `ensureUser`
  - `/auth/login`
  - `/auth/register`
  - `/auth/verify-otp`
  - `/auth/resend-otp`
  - `/auth/reset-password-request`
  - `/auth/reset-password`
  - `/auth/change-password`
  - `/entities/User/me`
  - generic entity writes that derive `created_by` from `currentUserEmail`
  - functions and app logs that derive user context from `currentUserEmail`

Backend config:

- `backend/config.js`
  - Defines `ANTOKTON_DEV_USER_EMAIL`.
  - Exposes safe config status for whether dev auth is active.

Developer tooling and docs:

- `backend/README.md`
- `backend/smoke-test.js`
- `backend/smoke-test.ps1`
- `backend/import-live-data.js`
- `backend/live-import-login-server.js`

The import scripts use authorization for live Base44 data import workflows. They are not the production app auth layer, but they must be kept separate from production auth decisions.

## Why Current Auth Is Unsafe For Production

- Any caller can forge `Authorization: Bearer dev:anyone@example.com`.
- Missing or invalid tokens fall back to the configured dev user.
- Login and register do not verify passwords.
- OTP, password reset, and password change endpoints are no-op success responses.
- Users are auto-created on demand.
- Auto-created users currently default to admin-like privileges.
- Login/register pass request body fields into user creation overrides.
- `User/me` updates accept user-submitted profile data without a production authorization boundary.
- Role checks are mostly client-side or page-level; sensitive actions need server-side enforcement.
- Tokens are long-lived localStorage strings with no signature, expiry, refresh, revocation, or audience checks.
- CORS is permissive for local development.
- There is no rate limiting for login/register/reset flows.
- There are no audit logs for sensitive auth or role changes.
- There is no production account lifecycle: email verification, lockout, suspension, deletion, recovery, or admin review.

## Required Production Auth Features

Antokton production auth should include:

- Real user identity with unique email.
- Verified email flow.
- Secure password or provider-based login.
- Password reset with expiring one-time tokens.
- Session or JWT validation on every protected backend request.
- Token expiry, refresh, and logout behavior.
- Server-side role-based access control.
- Server-side admin/moderator checks for all privileged actions.
- Account status checks: active, disabled, banned, deleted.
- Rate limiting for auth endpoints.
- Audit logs for login, failed login, password reset, role changes, admin actions, and certificate issuance.
- Migration path for existing local `User` records.
- Compatibility with current frontend calls during the transition.

## Recommended Auth Architecture

Use an auth adapter layer so the frontend and backend can migrate without a big rewrite.

Recommended shape:

- Keep the Base44-compatible frontend facade temporarily:
  - `base44.auth.me`
  - `base44.auth.updateMe`
  - `base44.auth.loginViaEmailPassword`
  - `base44.auth.register`
  - `base44.auth.redirectToLogin`
  - `base44.auth.logout`
- Add a backend auth abstraction:
  - `getCurrentUser(req)`
  - `requireUser(req)`
  - `requireRole(req, roles)`
  - `createSession(...)`
  - `verifyToken(...)`
- Keep compatibility endpoints while changing their internals.
- Move role decisions to the backend.
- Keep the app portable by isolating provider-specific code.

Primary recommendation for Antokton:

Use Supabase Auth as the first production path, with a thin Antokton auth adapter around it. This matches the existing roadmap toward PostgreSQL/Supabase-compatible architecture, provides email/password, email verification, password reset, JWT handling, and a managed operational baseline faster than custom auth. To reduce lock-in, keep all provider-specific calls inside small adapter modules and keep Antokton business data in a clear PostgreSQL schema.

## Option A: Supabase Auth

Best fit for Antokton's near-term production path.

Benefits:

- Production-ready email/password auth.
- Email verification and password reset are included.
- JWT-based sessions are standard.
- Works naturally with PostgreSQL.
- Fits the existing Supabase-compatible roadmap.
- Reduces security implementation risk compared with custom auth.
- Can be paired with object storage later.

Tradeoffs:

- Some provider coupling.
- Requires careful mapping between Supabase auth users and Antokton `User` profiles.
- Requires production environment configuration and redirect URL setup.
- Requires deciding whether backend verifies Supabase JWTs directly or uses Supabase server client.

Recommended usage:

- Supabase Auth owns credentials and sessions.
- Antokton backend verifies the Supabase access token.
- Antokton `User` entity/profile stores application fields such as role, member category, profile data, staff status, mentor/employer info, and badges.
- Admin/moderator roles are enforced by backend checks against trusted database fields, not browser state.

## Option B: Custom Node/PostgreSQL Auth

Good for maximum control and lower provider coupling, but higher security responsibility.

Benefits:

- Full ownership of credentials, sessions, and account lifecycle.
- Less direct auth vendor lock-in.
- Can be tailored exactly to Antokton's workflows.

Tradeoffs:

- More code and testing.
- Higher security risk if implemented too quickly.
- Requires email delivery, token storage, password hashing, session rotation, rate limiting, account lockout, and audit logging.
- Requires ongoing maintenance.

Minimum requirements if selected:

- Password hashing with Argon2id or bcrypt.
- Password reset tokens hashed at rest.
- Email verification tokens hashed at rest.
- Short-lived access tokens and refresh/session rotation.
- Secure cookies or carefully managed bearer tokens.
- Rate limiting and abuse protection.
- Strong migration tests.

## Option C: Clerk/Auth0 Or Similar External Provider

This can work technically, but it is not the primary recommendation.

Benefits:

- Fast implementation.
- Strong hosted auth features.
- Good admin dashboards and social login support.

Tradeoffs:

- Higher vendor lock-in.
- Possible recurring costs as the platform grows.
- More provider-specific frontend behavior.
- May not align as cleanly with the current Supabase-compatible roadmap.

Use this only if Antokton needs hosted enterprise auth features quickly and accepts the cost/lock-in tradeoff.

## Migration Phases

### Phase 1: Keep Dev Auth Locally, Add Production Auth Abstraction

Status:

- [x] Backend auth abstraction added in `backend/auth.js` on 2026-05-13.
- [x] `backend/server.js` now reads request user email and safe auth status through the auth module.
- [x] Dev auth behavior remains compatible with the existing local frontend and Base44-shaped endpoints.
- [ ] Production auth provider is not implemented yet.

Goal:

Keep the current frontend and endpoints working while introducing a backend auth boundary.

Likely files to change:

- `backend/server.js`
- `backend/config.js`
- `backend/auth/index.js`
- `backend/auth/devAuth.js`
- `backend/auth/types.js` or `backend/auth/providers.js`
- `.env.example`
- `DEVELOPMENT_SETUP.md`
- `AUTH_MIGRATION_PLAN.md`

Expected changes:

- Move `currentUserEmail` logic behind `getCurrentUser(req)`.
- Keep `dev:<email>` tokens active only for local development.
- Add config flags such as `AUTH_PROVIDER`, `ALLOW_DEV_AUTH`, and auth provider URLs.
- Keep `/auth/login`, `/auth/register`, `/User/me`, and existing entity endpoints compatible.
- Add tests or smoke checks for local dev auth.

Do not remove:

- Existing dev auth behavior for local development.
- Existing Base44-compatible frontend facade.

### Phase 2: Add Real User Table Or Auth Provider Mapping

Goal:

Introduce the production identity source and connect it to Antokton profiles.

Likely files to change:

- `backend/schema.sql`
- `backend/migrations/*`
- `backend/server.js`
- `backend/auth/index.js`
- `backend/auth/supabaseAuth.js` or `backend/auth/customAuth.js`
- `backend/config.js`
- `.env.example`
- `DEVELOPMENT_SETUP.md`
- `PRODUCTION_ROADMAP.md`

Expected changes for Supabase path:

- Add mapping between Supabase auth user id and Antokton `User` profile.
- Store role and profile data in Antokton tables, not in client-controlled claims unless verified server-side.
- Verify access tokens on the backend.
- Preserve existing `User` entity fields during migration.

Expected changes for custom path:

- Add auth tables for accounts, password hashes, sessions, verification tokens, reset tokens, and login attempts.
- Hash passwords with Argon2id or bcrypt.
- Add expiry and revocation for sessions/tokens.

### Phase 3: Migrate Frontend Auth Client

Goal:

Replace dev-token behavior while preserving the public `base44.auth` method names until pages can be cleaned up gradually.

Likely files to change:

- `antokton-export/src/api/antoktonClient.js`
- `antokton-export/src/lib/AuthContext.jsx`
- `antokton-export/src/lib/app-params.js`
- `antokton-export/src/App.jsx`
- `antokton-export/src/Layout.jsx`
- `antokton-export/src/components/ProtectedRoute.jsx`
- Login/register/reset UI files if added or discovered.

Expected changes:

- Stop defaulting to `dev:<email>` outside local development.
- Store real session tokens according to the selected auth provider.
- Implement real login, register, logout, password reset, and email verification flows.
- Keep `auth.me()` and `auth.updateMe()` behavior stable for existing pages.
- Gradually remove Base44 URL token assumptions from normal production login.

### Phase 4: Protect Admin And Moderator Routes

Goal:

Move sensitive authorization from browser checks to backend enforcement.

Likely files to change:

- `backend/server.js`
- `backend/auth/index.js`
- `backend/auth/permissions.js`
- `backend/schema.sql`
- `antokton-export/src/pages/Admin.jsx`
- `antokton-export/src/pages/AdminAnalytics.jsx`
- `antokton-export/src/pages/AdminSuggestions.jsx`
- `antokton-export/src/pages/AkademiaAdmin.jsx`
- `antokton-export/src/pages/ContentModeration.jsx`
- `antokton-export/src/pages/ImportPosts.jsx`
- `antokton-export/src/pages/BulkImport.jsx`
- `antokton-export/src/pages/Members.jsx`
- `antokton-export/src/pages/Companies.jsx`
- `antokton-export/src/pages/Setup.jsx`

Expected changes:

- Add `requireRole(req, ["admin"])` and `requireRole(req, ["admin", "moderator"])` checks server-side.
- Protect admin entity writes, moderation actions, imports, invitations, certificates, and Akademia admin actions.
- Make frontend role checks a UX convenience only, not the security boundary.
- Add audit logs for privileged actions.

### Phase 5: Remove Dev Auth From Production

Goal:

Ensure dev auth cannot accidentally run in production.

Likely files to change:

- `backend/config.js`
- `backend/server.js`
- `backend/auth/devAuth.js`
- `backend/auth/index.js`
- `.env.example`
- `DEVELOPMENT_SETUP.md`
- Deployment config files when added.

Expected changes:

- Fail startup when `NODE_ENV=production` and dev auth is enabled.
- Reject `dev:<email>` tokens in production.
- Remove fallback-to-default-user behavior in production.
- Keep dev auth available only when explicitly enabled for local development.
- Add health/config status that reports provider mode without exposing secrets.

## Security Requirements

### Password Hashing

If custom auth is selected, passwords must never be stored directly. Use Argon2id or bcrypt with a strong work factor. Store only password hashes.

### JWT Or Session Handling

- Verify token signature, issuer, audience, and expiry.
- Use short-lived access tokens.
- Support refresh/session rotation if bearer tokens are used.
- Support logout and token/session revocation.
- Do not trust unsigned localStorage strings.

### Email Verification

- Require email verification before sensitive actions.
- Use expiring verification tokens.
- Store verification tokens hashed at rest if custom auth is used.

### Password Reset

- Use expiring one-time reset tokens.
- Store reset tokens hashed at rest if custom auth is used.
- Do not reveal whether an email exists in reset responses.
- Invalidate old sessions after password reset where appropriate.

### Rate Limiting

Rate limit:

- Login attempts.
- Register attempts.
- OTP or email verification attempts.
- Password reset requests.
- Password reset submissions.

### CSRF And CORS

- If cookie sessions are used, add CSRF protection.
- If bearer tokens are used, keep CORS restricted to trusted origins in production.
- Do not use `Access-Control-Allow-Origin: *` for credentialed production flows.

### Role-Based Access Control

- Roles must be stored and enforced server-side.
- Admin and moderator permissions must never depend only on frontend checks.
- Role changes must require admin authorization and audit logging.
- Profile updates must not allow users to promote themselves.

### Audit Logs

Audit at least:

- Login success and failure.
- Register events.
- Email verification.
- Password reset request and completion.
- Role changes.
- Admin/moderator actions.
- Certificate issuance/revocation.
- Akademia approval/rejection/completion actions.

## Do Not Do

- Do not store plaintext passwords.
- Do not expose tokens in logs, URLs, public config, or health endpoints.
- Do not rely on `dev:<email>` tokens in production.
- Do not make admin role client-controlled.
- Do not let `User/me` updates change trusted fields such as role, permissions, account status, or staff category without server-side authorization.
- Do not remove the current local dev auth until the replacement path is tested.
- Do not rewrite the project from scratch.

## Recommended Next Step

Implement Phase 1 only:

- Add a small backend auth abstraction around the existing dev auth.
- Keep every current endpoint response compatible.
- Add `AUTH_PROVIDER=dev` and `ALLOW_DEV_AUTH=true` style environment variables.
- Make production startup reject dev auth unless explicitly allowed for a non-production environment.
- Add smoke tests for:
  - `/health/config`
  - `/api/apps/:appId/entities/User/me`
  - `/api/apps/:appId/auth/login`
  - an authenticated entity create using `Authorization: Bearer dev:<email>`
