# PostgreSQL Backup Strategy

Scope: Antokton PostgreSQL staging and future production databases. This does not switch production from SQLite.

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

## Production Cutover Backup Gate

Before any production PostgreSQL switch:

- Capture a final SQLite snapshot and keep it immutable.
- Capture a PostgreSQL dump immediately after migration.
- Confirm restore from the dump into a throwaway database.
- Run smoke, integrity, and diagnostics against the restored database.

## Retention

- Staging rehearsal dumps: keep the latest 7 successful runs.
- Production cutover snapshots: keep for at least 90 days.
- Production recurring backups: follow the managed provider retention policy, plus weekly logical dumps during the first month after cutover.

## Operational Notes

- Never commit database URLs, dumps, or validation artifacts.
- Store backup files outside the repo.
- Prefer provider-native backups for recovery point objectives and logical dumps for migration verification.
- A backup is not considered valid until a restore drill has passed.
