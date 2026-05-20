# Antokton PostgreSQL Backups Strategy

## Overview

This document defines the backup and disaster recovery strategy for Antokton's PostgreSQL database on Render.

---

## 1. Render Automated Backups (Primary Strategy)

### Automated Backups
- **Frequency**: Daily automated backups
- **Retention**: 7 days (automatic)
- **Method**: Render's managed PostgreSQL service
- **Location**: Render data center (automatic replication)
- **RTO** (Recovery Time Objective): < 2 hours
- **RPO** (Recovery Point Objective): < 24 hours

### Access to Backups
1. Log into Render dashboard: https://dashboard.render.com
2. Navigate to PostgreSQL database: `antokton_staging` or `antokton_prod`
3. Click "Backups" tab
4. View available backup snapshots (last 7 days)

### Restoring from Automated Backup
1. Click target backup snapshot in Render dashboard
2. Click "Restore"
3. Render creates a new PostgreSQL instance from snapshot
4. Update `DATABASE_URL` to point to restored instance
5. Restart application service
6. Verify `/health` endpoint returns `"dbMode": "postgres"`

**Time to restore**: ~15-30 minutes

---

## 2. Manual Backups (Pre-Major Changes)

### When to Create Manual Backups
- Before major schema migrations
- Before production cutover
- Before running bulk data operations
- Before security updates
- Before any data mutation in production

### Creating Manual Backup via pg_dump

**Local/Staging Environment:**
```bash
# Set DATABASE_URL (include credentials in connection string)
export DATABASE_URL="postgresql://user:password@host:port/dbname"

# Create timestamped backup file
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).dump

# Verify backup file
ls -lh backup-*.dump
file backup-*.dump  # Should show "PostgreSQL custom format"
```

**Expected output**: Binary PostgreSQL dump file (~5-50 MB depending on data)

### Storing Manual Backups

1. **Local archive** (immediate):
   ```bash
   # Store in project backup directory
   mkdir -p backups/
   cp backup-YYYYMMDD-HHMMSS.dump backups/
   ```

2. **Remote storage** (recommended for production):
   - Upload to Render's provided S3 bucket, or
   - Upload to personal AWS S3 / Cloudflare R2
   - Store with naming: `antokton-backup-YYYYMMDD-HHMMSS.dump`

3. **Encrypted backup** (for sensitive data):
   ```bash
   gpg --symmetric backup-YYYYMMDD-HHMMSS.dump  # Creates .gpg file
   ```

---

## 3. Disaster Recovery Procedures

### Scenario A: Database Becomes Unavailable
**Symptoms**: 
- `GET /health/db` returns 5xx error
- Application cannot connect to PostgreSQL

**Recovery**:
1. Check Render dashboard for database status
2. If database is down:
   - Restore from latest automated backup (Render UI → Backups → Restore)
   - Wait 15-30 minutes for restore to complete
   - Update `DATABASE_URL` in environment variables
   - Restart application service
3. Verify recovery: `curl https://app-url/health`

**Time to recovery**: ~1 hour

---

### Scenario B: Data Corruption / Accidental Deletion
**Symptoms**:
- Integrity checks report missing/corrupted records
- User reports missing data

**Recovery**:
1. Check time of data loss
2. Find backup taken BEFORE data loss
3. Restore from manual backup OR Render automated backup before that time
4. Verify data with integrity verifier: `node backend/scripts/verify-postgres-integrity.js`
5. If integrity passes, complete recovery
6. If integrity fails, try earlier backup

**Time to recovery**: 1-4 hours (depending on backup availability)

---

### Scenario C: Service Migration (Render to AWS/Other Cloud)
**Procedure**:
1. Create manual backup via `pg_dump`
2. Export to portable format (already portable)
3. Set up new PostgreSQL instance on target cloud
4. Restore backup to new instance: `psql "$NEW_DATABASE_URL" < backup.dump`
5. Update `DATABASE_URL` to point to new instance
6. Restart application
7. Run integrity verifier to confirm data integrity
8. Keep old instance running for 24 hours as fallback

**Time to migrate**: 2-8 hours (depending on data size and cloud setup)

---

## 4. Backup Verification

### Weekly Backup Health Check
```bash
# Every Monday, verify backups exist and are recent
# In Render dashboard, check:
# - Last backup timestamp (should be < 24 hours old)
# - Backup file size (should match previous backups, ±10%)
# - Number of available backups (should be 7)
```

### Test Restore Procedure (Monthly)
1. Create manual backup
2. Set up temporary PostgreSQL instance (same environment)
3. Restore backup to temporary instance
4. Run integrity verifier: `node backend/scripts/verify-postgres-integrity.js --pg <TEMP_DATABASE_URL>`
5. Verify all row counts match production
6. Delete temporary instance

**Purpose**: Confirm backups are restorable before disaster strikes

---

## 5. Retention Policy

| Backup Type | Retention | Frequency | Use Case |
|------------|-----------|-----------|----------|
| Render Automated | 7 days | Daily | Daily failover |
| Manual (Staging) | 30 days | As-needed | Before major changes |
| Manual (Production) | 90 days | Weekly | Long-term recovery |
| Encrypted Backups | 1 year | After each release | Compliance / audit |

---

## 6. Environment Variables for Backup Tools

```bash
# Required for pg_dump/pg_restore
DATABASE_URL="postgresql://user:password@host:port/dbname"

# Optional for automated backups
BACKUP_STORAGE_BUCKET="s3://my-bucket"  # Future: automated S3 upload
BACKUP_ENCRYPTION_KEY="..."             # Future: encrypted backups
BACKUP_NOTIFICATION_EMAIL="ops@..."    # Future: backup status alerts
```

---

## 7. Monitoring & Alerts (Future Implementation)

**Recommended tools**:
- Render's built-in monitoring (check dashboard daily)
- PagerDuty integration (for production-critical alerts)
- Automated backup verification (cron job to test restores weekly)

**Alert conditions**:
- Backup not created in 25 hours
- Backup file size < 50% of expected size
- Database connection fails
- High error rates in application logs

---

## 8. Checklist for Production Cutover

Before switching production to PostgreSQL, verify:

- [ ] Manual backup created and tested (restore successful)
- [ ] Backup stored in remote location (S3/R2)
- [ ] Backup encryption key stored securely (not in git)
- [ ] Render automated backups enabled (7-day retention)
- [ ] Recovery procedure documented and tested
- [ ] All stakeholders notified of backup strategy
- [ ] Integrity verifier ready to run post-migration
- [ ] Rollback procedure defined and tested
- [ ] DBA/ops team trained on restore procedures
- [ ] Monitoring/alerting configured for backup health

---

## 9. Support & Escalation

**Questions about backups?**
- Render PostgreSQL docs: https://render.com/docs/databases
- PostgreSQL pg_dump manual: https://www.postgresql.org/docs/current/app-pgdump.html

**Backup failure?**
1. Check Render dashboard for database status
2. Verify DATABASE_URL is correct in Render environment variables
3. Test connection: `psql "$DATABASE_URL" -c "SELECT 1"`
4. If still failing, contact Render support with database ID from dashboard

---

## Document Version
- **Last Updated**: 2026-05-20
- **Author**: Antokton Platform Engineering
- **Status**: DRAFT (ready for production use)

