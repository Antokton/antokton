# Antokton Backup And Recovery

Date: 2026-05-18

Scope: restricted beta only. The current production beta still uses SQLite on a Render persistent disk and local uploads on the same disk. This document is not a replacement for the planned PostgreSQL and object storage migration.

## What Must Be Backed Up

Back up these paths from the Render persistent disk:

- SQLite database: `/data/antokton.sqlite`
- SQLite WAL/SHM sidecar files when present:
  - `/data/antokton.sqlite-wal`
  - `/data/antokton.sqlite-shm`
- Uploads and cached remote assets: `/data/uploads`

Also keep a private inventory of required Render environment variable names. Do not store secret values in Git, screenshots, or public notes.

## Current Production Paths

The first Render beta should use:

```text
DATA_DIR=/data
DB_PATH=/data/antokton.sqlite
UPLOAD_DIR=/data/uploads
```

If these values change in Render, use the Render values as the source of truth.

## Suggested Daily Backup Process

Run one backup daily, and also before deployments that change auth, database, uploads, migrations, or import scripts.

From a machine with Render SSH access:

```bash
ssh srv-d84clkjbc2fs73c7jtqg@ssh.ohio.render.com
```

Inside the Render shell:

```bash
set -e
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="/data/backups/$STAMP"
mkdir -p "$BACKUP_DIR"

cp -a /data/antokton.sqlite "$BACKUP_DIR/antokton.sqlite"
if [ -f /data/antokton.sqlite-wal ]; then cp -a /data/antokton.sqlite-wal "$BACKUP_DIR/antokton.sqlite-wal"; fi
if [ -f /data/antokton.sqlite-shm ]; then cp -a /data/antokton.sqlite-shm "$BACKUP_DIR/antokton.sqlite-shm"; fi
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /data uploads

sha256sum "$BACKUP_DIR"/* > "$BACKUP_DIR/SHA256SUMS.txt"
echo "$BACKUP_DIR"
```

Then download the backup folder to a private machine or private storage location. Keep at least one copy outside Render.

Example from your local machine:

```bash
scp -r srv-d84clkjbc2fs73c7jtqg@ssh.ohio.render.com:/data/backups/YYYYMMDD-HHMMSS ./antokton-backups/
```

## Restore Process

Use restore only when you know which backup is correct. Restoring can overwrite newer production data.

1. Put the site into maintenance mode if possible, or stop the Render service temporarily.
2. Create a fresh emergency backup of the current `/data` state before overwriting anything.
3. Upload or locate the backup folder on the Render persistent disk.
4. Restore the SQLite files:

```bash
set -e
RESTORE_DIR="/data/backups/YYYYMMDD-HHMMSS"

cp -a "$RESTORE_DIR/antokton.sqlite" /data/antokton.sqlite
if [ -f "$RESTORE_DIR/antokton.sqlite-wal" ]; then cp -a "$RESTORE_DIR/antokton.sqlite-wal" /data/antokton.sqlite-wal; fi
if [ -f "$RESTORE_DIR/antokton.sqlite-shm" ]; then cp -a "$RESTORE_DIR/antokton.sqlite-shm" /data/antokton.sqlite-shm; fi
```

5. Restore uploads:

```bash
rm -rf /data/uploads.restore-tmp
mkdir -p /data/uploads.restore-tmp
tar -xzf "$RESTORE_DIR/uploads.tar.gz" -C /data/uploads.restore-tmp
rm -rf /data/uploads
mv /data/uploads.restore-tmp/uploads /data/uploads
```

6. Restart the Render service.
7. Verify:

```text
https://antokton.com/health
https://antokton.com/health/config
https://antokton.com/Home
https://antokton.com/uploads/<known-existing-file>
```

8. Log what was restored, from which backup timestamp, and why.

## Beta-Only Warning

This backup process is acceptable for a restricted beta on one Render instance. It is not the final production architecture.

Before broad public launch, Antokton should move to:

- PostgreSQL or Supabase-compatible Postgres with managed backups and restore testing.
- S3/R2/Supabase-compatible object storage for uploads.
- Automated daily backups with monitoring.
- A tested restore drill, not only written instructions.
