# PostgreSQL Backup Strategy

Scope: Antokton PostgreSQL staging and production databases. This does not change production runtime configuration.

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
- Production recurring backups: follow the managed provider retention policy, plus weekly logical dumps during the first month after cutover.

## Operational Notes

- Never commit database URLs, dumps, or validation artifacts.
- Store backup files outside the repo.
- Prefer provider-native backups for recovery point objectives and logical dumps for migration verification.
- A backup is not considered valid until a restore drill has passed.
- Do not store production backup dumps in GitHub Actions artifacts unless they are encrypted and access-controlled outside the repository workflow.
