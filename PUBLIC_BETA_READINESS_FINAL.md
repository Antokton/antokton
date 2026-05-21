# Public Beta Web Readiness Final

Date: 2026-05-21

Status: NOT READY for broad public beta yet.

Assessment: public beta readiness can continue in parallel with PostgreSQL post-cutover monitoring, but broad public launch should wait until the P0 blockers below are closed.

## Current Production Baseline

- Production runtime: PostgreSQL
- Production `/health`: `ok=true`, `dbMode=postgres`, `schemas=60`
- Production smoke: `17/17` passed
- Production CORS: restricted to `https://antokton.com`
- Development auth: disabled
- Session cookies: secure
- Frontend build: passed locally
- Backend dependency audit: `0 vulnerabilities`
- PWA assets: `manifest.json`, `sw.js`, and `offline.html` return HTTP 200

## Checks Executed

```powershell
Invoke-RestMethod https://antokton.com/health
Invoke-RestMethod https://antokton.com/health/config
node backend\scripts\smoke-test.js --base https://antokton.com
npm --prefix backend audit --omit=dev
npm --prefix antokton-export audit --omit=dev
npm --prefix antokton-export run build
Invoke-WebRequest https://antokton.com/manifest.json
Invoke-WebRequest https://antokton.com/sw.js
Invoke-WebRequest https://antokton.com/offline.html
```

## P0 Blockers

### 1. Finish 24h PostgreSQL post-cutover monitoring

Reason: production switched to PostgreSQL on 2026-05-21. Public beta should not begin before the first 24 hours of real production traffic monitoring are complete.

Required before broad beta:

- `/health` remains OK.
- `dbMode` remains `postgres`.
- Smoke remains `17/17`.
- PostgreSQL diagnostics remain free of blocked queries, long-running queries, and idle-in-transaction sessions.
- Render logs show no recurring 5xx, auth, upload, or connection-pool failures.
- SQLite backup and rollback artifacts remain untouched.

### 2. Confirm production PostgreSQL service ownership and naming

Reason: safe health metadata shows the PostgreSQL database name as `antokton_staging`. This may be only a historical name, but it must be explicitly confirmed before public beta.

Required before broad beta:

- Confirm the Render PostgreSQL service is the intended production database.
- Confirm backups/retention are enabled on that database.
- Rename or document the database/service if the staging name is intentional.
- Do not run broad beta against an accidentally shared staging database.

### 3. Fix frontend dependency vulnerabilities

Result:

- `npm --prefix antokton-export audit --omit=dev` reported 20 vulnerabilities:
  - 1 critical
  - 10 high
  - 9 moderate

Notable affected packages include:

- `jspdf`
- `react-router` / `@remix-run/router`
- `vite`
- `rollup`
- `dompurify`
- `lodash`
- `react-quill` / `quill`

Required before broad beta:

- Run a controlled dependency update branch.
- Avoid blind `npm audit fix --force` without review because it may introduce breaking changes.
- Rebuild, smoke, and manually verify affected editor/PDF/router flows.

### 4. Fix legal/support Albanian encoding and complete legal review

Observed affected files:

- `antokton-export/src/pages/Privacy.jsx`
- `antokton-export/src/pages/Terms.jsx`
- `antokton-export/src/pages/Contact.jsx`
- `antokton-export/src/pages/ContentModeration.jsx`

Examples still visible in source:

- Mis-encoded Albanian accented characters in page titles and body copy.
- Broken symbols in moderation labels.

Required before broad beta:

- Correct Albanian characters.
- Add explicit account/data deletion contact process.
- Confirm cookie/analytics wording matches actual behavior.
- Legal/privacy owner approves final text.

### 5. Make support and moderation operations real, not only present in UI

Existing pieces:

- `Report`
- `CommentReport`
- `ContentModeration`
- `AdminAction`
- Admin user tools
- Contact form creating `ContactMessage`

Required before broad beta:

- Assign report review owners.
- Define response SLA.
- Confirm admin/moderator production access.
- Confirm contact/support queue is checked daily.
- Define block/ban/appeal policy.

## P1 Blockers

### 6. Configure monitoring and alerting

Required:

- Uptime monitor for `/health` every minute.
- Alert if `dbMode` is not `postgres`.
- Alert on two consecutive failures.
- Alert on 5xx spikes, upload failures, auth failures, and PostgreSQL diagnostic failures.

### 7. Configure PostgreSQL backup automation and restore drill

Required:

- Provider-native backups enabled.
- At least one logical dump captured after cutover.
- Restore into a throwaway database tested.
- Integrity/smoke/diagnostics run against restored database.

### 8. Mobile/PWA real-device QA

Required:

- iOS Safari login/upload/install test.
- Android Chrome login/upload/install test.
- PWA update behavior after deploy.
- Logout/login after service worker update.

## Current Public Beta Decision

Decision: HOLD broad public beta.

Allowed now:

- Invite-only controlled beta with daily monitoring.
- Legal text correction branch.
- Dependency update branch.
- Moderation/support runbook.
- Backup/restore drill.
- Mobile/PWA QA.

Not allowed yet:

- Broad public launch.
- Mass invitations.
- Deleting SQLite backup or migration rollback artifacts.
- New feature expansion.
- Schema redesign.

## Recommended Next Milestone

Public Beta Readiness Sprint 1:

1. Complete PostgreSQL 24h monitoring window.
2. Confirm production PostgreSQL service identity/backup policy.
3. Fix frontend dependency vulnerabilities in a controlled branch.
4. Fix legal/support text encoding and approval.
5. Document and assign support/moderation operations.
6. Run real-device mobile/PWA QA.
