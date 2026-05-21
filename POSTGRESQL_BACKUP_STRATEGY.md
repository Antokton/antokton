# PostgreSQL Backup Strategy

Scope: Antokton PostgreSQL staging and production databases. This does not change production runtime configuration.

Status: backup and restore tooling exists in the repo; automated production backups are not considered complete until the Render Cron Job or equivalent external storage job is configured and restore-tested.

## Objectives

- Keep point-in-time recovery available before any production cutover.
- Prove restores in staging before trusting backups for production.
- Keep SQLite snapshots until PostgreSQL has been validated under real traffic.

## Staging Baseline

1. Take a logical dump before every migration rehearsal:
   ```bash
   pg_dump --format=custom --no-owner --no-privileges "$STAGING_DATABASE_URL" > backups/staging-$(date -u +%Y%m%dT%H%M%SZ).dump
   ```
2. Restore into a throwaway database:
   ```bash
   createdb antokton_restore_drill
   pg_restore --clean --if-exists --no-owner --no-privileges --dbname antokton_restore_drill backups/<dump>.dump
   ```
3. Run the integrity verifier against the restored database before accepting the backup as usable.

## Production Backup Gate

After production PostgreSQL cutover and before broad beta:

- Confirm Render provider-native backups are enabled on the production PostgreSQL service.
- Confirm retention policy and latest successful backup timestamp.
- Capture at least one logical dump or provider-native manual backup after cutover.
- Configure automated logical backups using `AUTOMATED_POSTGRESQL_BACKUPS_RUNBOOK.md`.
- Restore into a throwaway PostgreSQL database.
- Run restore validation, integrity, and diagnostics against the restored database.
- Keep the final SQLite snapshot and rollback artifacts immutable until restore drill passes.

Restore validation command:

```powershell
node backend\scripts\verify-postgres-restore.js --pg $env:RESTORE_DATABASE_URL --expect-schemas 60 --json
```

## Retention

- Staging rehearsal dumps: keep the latest 7 successful runs.
- Production cutover snapshots: keep for at least 90 days.
- Production recurring backups: keep Render PITR enabled, plus daily logical dumps for 14 days, weekly logical dumps for 8 weeks, and monthly logical dumps for 12 months after public beta begins.

## Operational Notes

- Never commit database URLs, dumps, or validation artifacts.
- Store backup files outside the repo.
- Prefer provider-native backups for recovery point objectives and logical dumps for migration verification.
- A backup is not considered valid until a restore drill has passed.
- Do not store production backup dumps in GitHub Actions artifacts unless they are encrypted and access-controlled outside the repository workflow.
- Use `backend/scripts/postgres-logical-backup.js` as the local/Cron template for `pg_dump` backups and checksums.
- Treat S3/R2 bucket lifecycle, provider encryption, and failure alerts as required external setup, not repo-only work.
