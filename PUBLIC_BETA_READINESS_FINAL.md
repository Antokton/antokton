# Public Beta Web Readiness Final

Date: 2026-05-21

Status: NOT READY for broad public beta yet.

Assessment: public beta readiness can continue in parallel with PostgreSQL post-cutover monitoring, but broad public launch should wait until the P0 blockers below are closed.

Update 2026-05-21: frontend dependency audit, legal/support encoding cleanup, and Cookie Policy routing are complete in `main` at `7cb3ebd`. Remaining work is operational: monitoring/alerting, restore drill, service identity confirmation, support/moderation ownership, and real-device PWA QA.

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

### 3. Fix frontend dependency vulnerabilities - complete

Result:

- `npm --prefix antokton-export audit` reports `0 vulnerabilities`.
- Frontend build passed after cleanup.
- Unused `react-quill` dependency was removed.

### 4. Fix legal/support Albanian encoding and complete legal review - partially complete

Completed:

- `antokton-export/src/pages/Privacy.jsx`
- `antokton-export/src/pages/Terms.jsx`
- `antokton-export/src/pages/Contact.jsx`
- `antokton-export/src/pages/ContentModeration.jsx`
- `antokton-export/src/pages/CookiePolicy.jsx`

Remaining before broad beta:

- Confirm cookie/analytics wording matches actual behavior.
- Legal/privacy owner approves final text.
- Confirm account/data deletion contact process owner.

### 5. Make support and moderation operations real, not only present in UI

Existing pieces:

- `Report`
- `CommentReport`
- `ContentModeration`
- `AdminAction`
- Admin user tools
- Contact form creating `ContactMessage`

Required before broad beta:

- Assign report review owners using `PUBLIC_BETA_OPERATIONS_RUNBOOK.md`.
- Define response SLA using `PUBLIC_BETA_OPERATIONS_RUNBOOK.md`.
- Confirm admin/moderator production access.
- Confirm contact/support queue is checked daily.
- Define block/ban/appeal policy.

## P1 Blockers

### 6. Configure monitoring and alerting

Completed baseline:

- GitHub scheduled health monitor added to check production every 15 minutes.
- Manual health monitor command passed against `https://antokton.com`.
- The monitor fails if `/health` is not HTTP 200, `ok=true` is missing, `dbMode` is not `postgres`, or `schemas` is not `60`.

Required:

- External uptime monitor for `/health` every minute using `PUBLIC_BETA_MONITORING_ALERTING_RUNBOOK.md`.
- External alert if `dbMode` is not `postgres`.
- External alert on two consecutive failures.
- Alert routing for 5xx spikes, upload failures, auth failures, and PostgreSQL diagnostic failures.

### 7. Configure PostgreSQL backup automation and restore drill

Completed baseline:

- Backup strategy document exists.
- Restore drill runbook exists.
- Restore validation script exists.
- Automated `pg_dump` backup template exists at `backend/scripts/postgres-logical-backup.js`.
- Full external setup checklist exists at `AUTOMATED_POSTGRESQL_BACKUPS_RUNBOOK.md`.

Required:

- Provider-native backups enabled.
- Render Cron Job or equivalent scheduled backup job configured.
- S3 or Cloudflare R2 private bucket configured with lifecycle retention.
- Failed backup alerting configured.
- At least one logical dump captured after cutover.
- Restore into a throwaway database tested using `POSTGRESQL_RESTORE_DRILL_RUNBOOK.md`.
- `backend/scripts/verify-postgres-restore.js` returns `ok: true` against the restored database.
- Integrity/smoke/diagnostics run against restored database.

### 8. Mobile/PWA real-device QA

Required:

- iOS Safari login/upload/install test using `MOBILE_PWA_QA_CHECKLIST.md`.
- Android Chrome login/upload/install test using `MOBILE_PWA_QA_CHECKLIST.md`.
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
3. Enable monitoring/alert routing.
4. Complete PostgreSQL restore drill.
5. Assign support/moderation operations.
6. Run real-device mobile/PWA QA.
