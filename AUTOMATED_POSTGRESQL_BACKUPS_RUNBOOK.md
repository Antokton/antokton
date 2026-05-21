# Automated PostgreSQL Backups Runbook

Date: 2026-05-21

Status: readiness template complete; real automation remains pending until Render and storage are configured outside git.

Scope: production PostgreSQL backup automation for ANTOKTON after production is already running on PostgreSQL. This runbook does not change production runtime, schema, or Render env vars by itself.

Strict limits:

- Do not commit database URLs, bucket credentials, dumps, or `.env` files.
- Do not run backup exports against staging and call them production backups.
- Do not change `DATABASE_PROVIDER`, `DATABASE_URL`, CORS, or session settings from this workflow.
- Do not deploy production as part of backup setup unless a separate deploy is explicitly approved.

## Already Implemented

- `POSTGRESQL_BACKUP_STRATEGY.md` defines the backup gate and restore validation rule.
- `POSTGRESQL_RESTORE_DRILL_RUNBOOK.md` defines a throwaway restore drill.
- `backend/scripts/verify-postgres-restore.js` validates restored PostgreSQL databases without printing the database URL.
- `backend/scripts/postgres-logical-backup.js` is a template runner for `pg_dump`, local checksums, local retention, and optional S3/R2 upload.
- `.backup-artifacts/` is ignored so local dump files are not committed accidentally.

## Still Manual In Render

- Confirm the production PostgreSQL service identity and plan.
- Confirm paid Render PostgreSQL recovery is available for the production database.
- Confirm the visible PITR recovery window in Render.
- Create any manual logical export from the Render PostgreSQL Recovery page.
- Create the optional Render Cron Job.
- Set backup job environment variables in Render.
- Create the S3 or Cloudflare R2 bucket and credentials.
- Configure alert destinations for failed cron runs.
- Run and record the first restore drill from an automated backup.

## Gate 1 - Render Provider-Native PITR

Use the Render Dashboard only. Do not change web service runtime env vars.

Checklist:

- Open the intended production PostgreSQL service.
- Confirm it is not the old staging database by mistake.
- Open Recovery / Backups.
- Confirm the service is on a paid PostgreSQL plan with PITR available.
- Record the visible recovery window in private operations notes.
- Confirm the latest recoverable timestamp is recent.
- Confirm a recovery creates a separate database instance, not an in-place overwrite.

GO if PITR is available and the service identity is confirmed.

NO-GO if the database is free, backup/recovery controls are missing, the database identity is ambiguous, or the recovery window is not visible.

## Gate 2 - Render Logical Export

Use this for an on-demand backup before risky maintenance windows and as an independent artifact for restore drills.

Checklist:

- Open the production PostgreSQL service in Render.
- Open Recovery / Backups.
- Click Create export if no export is already running.
- Wait for export completion.
- Download the `.dir.tar.gz` export to a private encrypted location.
- Record export timestamp, source service, and operator in a private note.
- Do not store exports in the repo or GitHub Actions artifacts.

GO if the export completes and is stored outside git.

NO-GO if another export is stuck, export creation fails, or the downloaded artifact cannot be located.

## Gate 3 - Optional Render Cron Job With pg_dump

This is the missing automation layer. It complements Render PITR with portable logical dumps in storage you control.

Recommended Render service:

- Type: Cron Job
- Repo: `Antokton/antokton`
- Branch: `main`
- Schedule: daily, for example `15 2 * * *` UTC
- Command:

```bash
node backend/scripts/postgres-logical-backup.js --json
```

Required Cron Job tools:

- `node`
- `pg_dump` matching the PostgreSQL major version
- `aws` CLI if S3/R2 upload is enabled

If the standard Render Node runtime does not include `pg_dump` or `aws`, use a Docker-based Cron Job or Render's official PostgreSQL-to-S3 backup template as the implementation base.

Required Cron Job env vars:

```text
BACKUP_DATABASE_URL=<production PostgreSQL direct URL, not PgBouncer>
BACKUP_OUTPUT_DIR=/tmp/antokton-postgres-backups
BACKUP_RETENTION_DAYS=7
BACKUP_PREFIX=antokton-postgres
```

S3 env vars:

```text
BACKUP_UPLOAD_PROVIDER=s3
BACKUP_S3_BUCKET=<private bucket>
BACKUP_S3_PREFIX=antokton/postgres
AWS_ACCESS_KEY_ID=<write-capable backup key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_DEFAULT_REGION=<bucket region>
```

Cloudflare R2 env vars:

```text
BACKUP_UPLOAD_PROVIDER=s3
BACKUP_S3_BUCKET=<private r2 bucket>
BACKUP_S3_PREFIX=antokton/postgres
BACKUP_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<r2 access key>
AWS_SECRET_ACCESS_KEY=<r2 secret>
AWS_DEFAULT_REGION=auto
```

Validation commands before enabling the schedule:

```powershell
node backend\scripts\postgres-logical-backup.js --dry-run --json
node backend\scripts\postgres-logical-backup.js --json
```

GO if the manual cron run exits successfully, a `.dump` object and matching `.sha256` object appear in storage, and the backup can be downloaded.

NO-GO if `pg_dump` is missing, upload credentials fail, the bucket is public, or no checksum file is produced.

## Storage Choice

Use one primary target:

- AWS S3 private bucket with a narrowly scoped IAM key.
- Cloudflare R2 private bucket using its S3-compatible endpoint.

Minimum bucket controls:

- Public access disabled.
- Access keys scoped to the backup bucket/prefix where possible.
- Lifecycle retention configured.
- Server-side encryption or provider-managed encryption enabled.
- Delete permissions limited to operators who own backup retention.

## Retention Policy

Provider-native:

- Keep Render PITR enabled continuously.
- Treat PITR as the primary fast recovery path.

Logical dumps:

- Daily backups: keep 14 days.
- Weekly backups: keep 8 weeks.
- Monthly backups: keep 12 months after public beta opens.
- Keep the final SQLite migration snapshot for at least 90 days after PostgreSQL cutover.

The script only prunes local working files in `BACKUP_OUTPUT_DIR`. Long-term retention must be enforced by S3/R2 lifecycle rules or an intentionally reviewed cleanup job.

## Encryption And Secret Handling

- Store DB URLs and storage keys only in Render Cron Job environment variables or a local one-time shell.
- Never print full database URLs in logs.
- Never add backup credentials to `.env`, docs, screenshots, or git commits.
- Do not use PgBouncer URLs for backup jobs; use the direct PostgreSQL URL.
- Keep buckets private and use provider encryption at rest.
- Prefer a dedicated backup credential that cannot access unrelated buckets.
- Rotate backup storage credentials after any accidental exposure.

## Failure Alerting

Minimum alerts:

- Render Cron Job failure notification.
- Alert if no new backup object appears within 26 hours.
- Alert if checksum file is missing.
- Alert if weekly restore drill fails.
- Alert if storage credentials are rejected.

Recommended validation rhythm:

- Daily: verify new `.dump` and `.sha256` object exist.
- Weekly: restore latest automated backup into a throwaway database and run `POSTGRESQL_RESTORE_DRILL_RUNBOOK.md`.
- Monthly: review PITR recovery window, storage retention, and credential access.

## Completion Definition

Automated PostgreSQL backups become 100% complete only when all are true:

- Render production PostgreSQL PITR is confirmed.
- A logical export has been created and stored privately.
- A scheduled Cron Job writes encrypted/private backups to S3 or R2.
- Failed cron runs alert a human.
- Latest automated backup has been restored into a throwaway database.
- `backend/scripts/verify-postgres-restore.js` returns `ok: true`.
- Integrity verifier returns `fails: 0`.
- Diagnostics are clean.

Until those external steps are done, the repo is backup-ready but automated backups are still pending setup.

## Reference Docs

- Render PostgreSQL Recovery and Backups: `https://render.com/docs/postgresql-backups`
- Render Backup PostgreSQL to S3: `https://render.com/docs/backup-postgresql-to-s3`
- Render Cron Jobs: `https://render.com/docs/cronjobs`
- Cloudflare R2 S3-compatible API: `https://developers.cloudflare.com/r2/get-started/s3/`
