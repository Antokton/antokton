# 24h Post-Cutover Monitoring Checklist

Start this checklist immediately after production reports `dbMode=postgres`.

## First 15 Minutes

- [ ] `/health` returns `ok: true`.
- [ ] `/health` reports `dbMode=postgres`.
- [ ] Register/login works.
- [ ] Existing user login works.
- [ ] `User/me` works.
- [ ] Entity create/read/list/update/delete works.
- [ ] Upload and asset fetch works.
- [ ] No startup env validation errors.
- [ ] No PostgreSQL pool errors in logs.
- [ ] No long-running queries over 30 seconds.
- [ ] No idle-in-transaction sessions older than 60 seconds.

## First Hour

Run every 15 minutes:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json validation-runs\prod-diag-<timestamp>.json
```

Check:

- [ ] Connection count remains below pool saturation.
- [ ] No blocked queries.
- [ ] No growing dead tuple percentage on hot tables.
- [ ] Table cache hit ratio remains healthy.
- [ ] Index cache hit ratio remains healthy.
- [ ] Error logs remain stable.
- [ ] Login and uploads remain stable.

## Hours 1-6

Run hourly:

- [ ] `/health`
- [ ] Smoke test against production base URL with non-destructive checks.
- [ ] PostgreSQL diagnostics.
- [ ] Render service logs review.
- [ ] User-facing auth check.
- [ ] Upload check.

## Hours 6-24

Run every 3 hours:

- [ ] Diagnostics.
- [ ] Error log review.
- [ ] Auth/session check.
- [ ] Upload check.
- [ ] Database size growth check.
- [ ] Backup status check.

## Escalation Thresholds

Escalate immediately if:

- Health check fails twice in a row.
- Auth failures increase.
- Uploads fail.
- PostgreSQL reports lock waits.
- Idle-in-transaction sessions persist.
- Connection count approaches max capacity.
- Error rate remains elevated for 10 minutes.

## End Of 24h Criteria

- [ ] No rollback triggers occurred.
- [ ] No data integrity issues reported.
- [ ] Backups confirmed.
- [ ] SQLite snapshot retained.
- [ ] Post-cutover report recorded.
