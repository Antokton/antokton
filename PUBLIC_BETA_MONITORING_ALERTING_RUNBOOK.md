# Public Beta Monitoring And Alerting Runbook

Date: 2026-05-21

Status: required before broad public beta.

Scope: uptime, application health, database health, logs, alert routing, and first-week beta monitoring.

## Required Monitors

### 0. GitHub Scheduled Health Monitor

Repository automation:

```text
.github/workflows/production-health-monitor.yml
```

Manual command:

```powershell
node backend\scripts\monitor-production-health.js --base https://antokton.com --expect-db-mode postgres --expect-schemas 60
```

Schedule:

- Every 15 minutes through GitHub Actions.
- Manual dispatch after every production deploy.

Alert behavior:

- The workflow fails if `/health` is not HTTP 200.
- The workflow fails if `ok=true` is missing.
- The workflow fails if `dbMode` is not `postgres`.
- The workflow fails if `schemas` is not `60`.

Important:

- This GitHub monitor is a baseline production guard, not the only P0 alert path.
- Keep the 1-minute external uptime monitor below for faster paging during public beta.
- Do not add database URLs, Render tokens, or secrets to this workflow.

### 1. Public Health

Target:

```text
https://antokton.com/health
```

Frequency:

- Every 1 minute during the first beta week.
- Every 5 minutes after stability is proven.

Alert when:

- Two consecutive checks fail.
- Response is not HTTP 200.
- Response body does not include `ok=true`.
- Response body does not include `dbMode=postgres`.
- Response body does not include `schemas=60`.

### 2. Production Smoke

Manual during first beta week:

```powershell
node backend\scripts\smoke-test.js --base https://antokton.com
```

Frequency:

- Daily before invite waves.
- Immediately after any manual deploy.
- Immediately after any P0/P1 incident.

Required:

- `17/17` passed.

### 3. PostgreSQL Diagnostics

Manual command when database URL is available in the current shell only:

```powershell
psql "$env:PRODUCTION_DATABASE_URL" -f backend\scripts\pg-diagnostics.sql
```

Alert when:

- Blocked queries are present.
- Idle-in-transaction sessions are present.
- Unexpected long-running queries are present.
- Connection count approaches the service limit.

Do not print or commit `PRODUCTION_DATABASE_URL`.

### 4. Render Logs

Review for:

- Repeated 5xx responses.
- Auth login/register errors.
- Upload failures.
- PostgreSQL connection pool errors.
- Request timeout errors.
- Unhandled exceptions.

First beta week:

- Review logs at least twice per day.
- Review immediately after support reports a P0 or P1 issue.

## Alert Destinations

Before broad beta, choose at least two:

- Email to beta lead and technical on-call.
- SMS or phone push notification for P0.
- Slack, Discord, or equivalent operations channel.
- Render notification channel if available.

Minimum rule:

- P0 alerts must reach a human who can act within 30 minutes.
- P1 alerts must be reviewed within 4 hours during waking hours.

## Incident Thresholds

P0 alert:

- Site unavailable.
- `/health` fails twice.
- `dbMode` is not `postgres`.
- Smoke test fails auth, upload, or entity CRUD.
- Suspected data loss or privacy exposure.

P1 alert:

- Repeated 5xx in logs.
- Upload failures affecting multiple users.
- Login/register failures affecting multiple users.
- PostgreSQL diagnostic warning.

P2 alert:

- Single-user issue.
- Non-critical UI defect.
- Slow response not repeated.

## Daily Monitoring Log

Use this table during the first beta week:

| Date | `/health` | Smoke | Logs | DB Diagnostics | Action |
| --- | --- | --- | --- | --- | --- |
| TBD | Pending | Pending | Pending | Pending |  |

## GO/NO-GO For Invite Waves

GO:

- `/health` OK.
- Smoke `17/17`.
- No unresolved P0.
- Logs do not show recurring auth, upload, or 5xx failures.
- Backup status is known.

NO-GO:

- Any health or smoke failure.
- PostgreSQL diagnostics show blocked queries.
- Alert routing is not assigned.
- Support/moderation queue is unowned.

