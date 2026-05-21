# Technical Debt Backlog

Date: 2026-05-21

Scope: stabilization and public beta preparation backlog. This is not a feature roadmap and does not authorize production deploys, schema redesign, or frontend redesign.

## Priority 0: Operational Safety

### TD-001: Configure production uptime and health alerts

Why: beta traffic needs fast incident detection.

Acceptance:

- `/health` monitored every minute.
- Alert on two consecutive failures.
- Alert when `dbMode` does not match expected mode.
- Alert destination tested.

### TD-002: Preserve cutover SQLite backups until monitoring closes

Why: production has moved to PostgreSQL, but rollback confidence depends on keeping the final SQLite snapshot and migration rollback artifacts intact through the monitoring window.

Acceptance:

- Final cutover snapshot remains on Render disk.
- Rollback log remains available.
- No cleanup of `/data/backups/prod-cutover-*` until monitoring is closed.
- Off-Render copy is created for long-term retention.

### TD-003: Formalize PostgreSQL backup restore drill after cutover

Why: production is now PostgreSQL and broad beta needs restore confidence.

Acceptance:

- Logical dump created.
- Restored into throwaway DB.
- Integrity/smoke/diagnostics run against restored DB.

### TD-004: Add production log retention policy

Why: support, abuse reports, and incident analysis need enough history.

Acceptance:

- App logs retained at least 14 days during beta.
- Cutover artifacts retained at least 90 days.
- No secrets in logs.

## Priority 1: Beta Trust And Safety

### TD-005: Fix Albanian text encoding on legal and support pages

Why: Privacy, Terms, Contact, and moderation text currently show mojibake in source.

Acceptance:

- Privacy page renders correct Albanian characters.
- Terms page renders correct Albanian characters.
- Contact page renders correct Albanian characters.
- Moderation page renders correct Albanian characters.

### TD-006: Legal review for Privacy, Terms, Cookies, and account deletion

Why: broad beta requires clear user rights and platform obligations.

Acceptance:

- Privacy policy reviewed.
- Terms reviewed.
- Cookie/analytics wording matches actual implementation.
- Deletion/export contact process documented.

### TD-007: Document moderation and abuse response runbook

Why: report entities and admin UI exist, but operations need owners and SLAs.

Acceptance:

- Report review owner assigned.
- Daily report queue check defined.
- Severity levels defined.
- Block/ban/appeal process documented.

### TD-008: Verify admin and moderator access in production

Why: public beta requires the right people to resolve reports and support issues.

Acceptance:

- Admin list reviewed.
- Moderator list reviewed.
- Bootstrap credentials removed after setup.
- No unexpected admin accounts.

### TD-009: ContactMessage triage workflow

Why: contact form creates records, but beta needs a reliable support queue.

Acceptance:

- Operator can view new contact messages.
- Daily triage process exists.
- Privacy/legal/abuse/support messages can be routed.

## Priority 2: Tooling Cleanup

### TD-010: Close or delete merged branches

Candidates:

- `feature/pre-production-hardening`
- `origin/feature/pre-production-hardening`
- `feature/postgres-validation-tools`
- `origin/feature/postgres-validation-tools`

Acceptance:

- No open PR depends on branch.
- Branch deleted locally and remotely.

### TD-011: Archive stale experimental branches

Candidates:

- `origin/feature/postgres-runtime`
- `origin/codex/postgres-staging-runtime`
- `origin/feature/postgres-staging`

Acceptance:

- Owner confirms abandoned.
- Branch is closed/deleted or documented as historical.
- No code is merged from them.

### TD-012: Consolidate validation command documentation

Why: multiple docs now mention migration and smoke commands.

Acceptance:

- `PRODUCTION_POSTGRES_CUTOVER_RUNBOOK.md` is marked source of truth.
- Older rollout/readiness docs are marked historical.
- Preferred validation commands are listed once.

### TD-013: Decide canonical smoke-test entry point

Candidates:

- `backend/scripts/smoke-test.js`
- `backend/smoke-test.js`

Acceptance:

- Canonical script documented.
- Non-canonical wrapper either retained with explanation or removed in a separate cleanup PR.

### TD-014: Decide canonical diagnostics path

Candidates:

- `backend/scripts/pg-diagnostics.js`
- `backend/scripts/pg-diagnostics.sql`

Acceptance:

- Node diagnostics documented as Windows/Render-safe default.
- SQL diagnostics retained for psql-capable operator hosts.

## Priority 3: Mobile And PWA Hardening

### TD-015: Service worker release QA

Why: stale cached assets can confuse beta users after deployments.

Acceptance:

- Verify update behavior after deploy.
- Verify logout/login after service worker update.
- Verify offline fallback.

### TD-016: Mobile upload and auth QA

Why: uploads and auth are critical workflows for mobile users.

Acceptance:

- iOS Safari auth/upload smoke.
- Android Chrome auth/upload smoke.
- PWA installed-mode auth/upload smoke.

### TD-017: Notification scope decision

Why: notification entities exist, but beta needs a clear promise about delivery.

Acceptance:

- Define whether notifications are in-app only, email, or push.
- Disable or label incomplete notification channels.

## Priority 4: Future Scaling

### TD-018: PostgreSQL post-cutover monitoring closeout

Why: production cutover is complete, but broad beta should wait until the first 24h monitoring window closes cleanly.

Acceptance:

- 24h monitoring completed.
- Final `/health` still reports `dbMode=postgres`.
- Smoke still passes `17/17`.
- Diagnostics remain clean.
- Rollback artifacts are retained or archived.

### TD-021: Resolve frontend dependency vulnerabilities before public beta

Why: `npm --prefix antokton-export audit --omit=dev` reports public-beta security debt.

Acceptance:

- Critical/high frontend advisories are resolved or explicitly risk-accepted.
- Build passes.
- Production smoke passes after dependency update.
- Router/editor/PDF/export flows are manually checked.

### TD-019: Rate limit persistence strategy

Why: current rate limiting is in-memory and resets on restart.

Acceptance:

- Decide whether beta needs persistent or distributed rate limiting.
- If needed, implement in a separate design/PR.

### TD-020: Object storage migration plan

Why: uploads currently rely on local/mounted storage.

Acceptance:

- Decide S3/R2/Supabase strategy.
- Keep local uploads unchanged until separately approved.

## Recommended Next Milestone

Public Beta Readiness Sprint 1:

1. Monitoring and backup automation.
2. Legal/support text cleanup.
3. Moderation/support operations.
4. Mobile/PWA smoke pass.
5. Branch/doc cleanup PR.
