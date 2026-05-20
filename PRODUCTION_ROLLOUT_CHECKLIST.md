# Antokton Production PostgreSQL Rollout Checklist

## Pre-Deployment (48 Hours Before)

### Data Verification
- [ ] Run staging integrity verifier: `node backend/scripts/verify-postgres-integrity.js`
  - Expected: All checks PASS, row counts match targets
- [ ] Confirm staging smoke tests: 17/17 passing
- [ ] Verify `/health` endpoint returns `dbMode: "postgres"`
- [ ] Confirm no active production users during migration window

### Backup Preparation
- [ ] Create manual PostgreSQL backup: `pg_dump $STAGING_DATABASE_URL > backup-pre-prod-migration.dump`
- [ ] Store backup in secure location with timestamp
- [ ] Verify backup file size is reasonable (> 1 MB, < 500 MB)
- [ ] Document backup restore procedure for rollback

### Environment Setup
- [ ] Prepare production PostgreSQL instance on Render
- [ ] Verify `DATABASE_URL` is set correctly (test connection via `psql`)
- [ ] Confirm `DATABASE_PROVIDER=postgres` will be set on deployment
- [ ] Verify `NODE_ENV=production` is set
- [ ] Confirm all production secrets are in Render environment variables

### Team Notification
- [ ] Notify stakeholders of migration window (time, expected downtime)
- [ ] Schedule on-call engineer for 24-hour post-deployment monitoring
- [ ] Brief team on rollback procedure
- [ ] Prepare status page / maintenance message

---

## Day Of Deployment (1 Hour Before Migration)

### Final Staging Verification
- [ ] Staging health check: `curl https://antokton-pg-staging.onrender.com/health`
- [ ] Staging auth flow test (register/login/logout)
- [ ] Staging entity CRUD test
- [ ] Staging file upload test

### Production Pre-Flight
- [ ] Verify no production traffic (or minimal traffic)
- [ ] Confirm production database is PostgreSQL (not SQLite)
- [ ] Test production PostgreSQL connection: `psql "$PRODUCTION_DATABASE_URL" -c "SELECT 1"`
- [ ] Verify all production services are ready to restart

### Backup Final Checkpoint
- [ ] Create final production backup (if migrating from SQLite): `pg_dump $PRODUCTION_DATABASE_URL > backup-pre-cutover.dump`
- [ ] Verify backup integrity with `pg_restore --list backup-pre-cutover.dump`

---

## Deployment Phase (30-60 Minutes)

### Step 1: Halt Production Traffic (if applicable)
- [ ] Stop new requests to production API (maintenance mode)
- [ ] Wait for in-flight requests to complete (max 30 seconds)
- [ ] Verify no active user sessions

### Step 2: Execute Data Migration
- [ ] Run migration script: `powershell -ExecutionPolicy Bypass -File backend/scripts/run-staging-migration.ps1`
- [ ] Monitor output for errors
- [ ] Capture full output to log file: `migration-$(date +%Y%m%d-%H%M%S).log`
- [ ] **If migration fails**: ABORT, restore from backup, rollback

### Step 3: Integrity Verification
- [ ] Run integrity verifier: `node backend/scripts/verify-postgres-integrity.js --pg $PRODUCTION_DATABASE_URL`
- [ ] Confirm all checks PASS
- [ ] Verify row counts match expectations:
  - entity_records: 174+
  - uploaded_files: 10+
  - function_logs: 2+
  - entity_schemas: 60

### Step 4: Resume Production
- [ ] Set `DATABASE_PROVIDER=postgres` in production environment
- [ ] Set `DATABASE_URL=<production-postgresql-url>` (already set)
- [ ] Restart production application service via Render dashboard
- [ ] Wait for service to be healthy (30-60 seconds)

### Step 5: Post-Migration Validation
- [ ] Check production `/health` endpoint: `curl https://antokton.com/health`
- [ ] Expected response: `{"ok":true,"dbMode":"postgres","db":"...","schemas":60}`
- [ ] Test auth flow in production (register/login/logout with test account)
- [ ] Test entity CRUD operations
- [ ] Test file uploads
- [ ] Verify no error spikes in logs

---

## Post-Deployment (24 Hours)

### Monitoring
- [ ] Monitor error logs every 15 minutes for first 2 hours
- [ ] Check database connection pool status
- [ ] Verify response times are normal (not degraded)
- [ ] Confirm no spike in 4xx/5xx errors
- [ ] Verify user reports indicate normal operations

### Data Validation
- [ ] Run diagnostic query: `SELECT COUNT(*) FROM entity_records`
- [ ] Compare with expected count (174+)
- [ ] Run spot-check queries on key tables
- [ ] Verify no data loss or corruption

### Performance Baseline
- [ ] Record database query performance metrics
- [ ] Note response time baseline (for future optimization)
- [ ] Verify connection pool is not saturated
- [ ] Check CPU/memory usage on database

### Success Criteria
- [ ] All checks PASS
- [ ] No critical errors reported
- [ ] User traffic flowing normally
- [ ] No rollback needed

**Estimated Time**: 30-60 minutes (actual execution) + 2-4 hours (monitoring)

---

## Rollback Procedure (If Anything Fails)

### Immediate Rollback
1. **Stop production traffic** (maintenance mode)
2. **Restore from backup**:
   ```bash
   psql "$PRODUCTION_DATABASE_URL" < backup-pre-migration.dump
   ```
3. **Verify restore**:
   ```bash
   node backend/scripts/verify-postgres-integrity.js --pg $PRODUCTION_DATABASE_URL
   ```
4. **Restart production** with original configuration
5. **Verify rollback**: `curl https://antokton.com/health`
6. **Notify stakeholders** of rollback

**Time to rollback**: 10-30 minutes (depending on database size)

### Post-Rollback
- [ ] Investigate root cause of migration failure
- [ ] Fix issues in staging environment
- [ ] Re-run staging tests
- [ ] Schedule new production migration date

---

## Production SQLite Fallback (Critical)

**NEVER** modify production SQLite during this rollout.

- [ ] SQLite remains at `backend/data/production.db` (untouched)
- [ ] `DATABASE_PROVIDER` can be switched back to `sqlite` if PostgreSQL fails
- [ ] Keep SQLite as emergency fallback for up to 30 days post-migration

---

## Success Indicators (48 Hours Post-Deployment)

✅ **All of these should be true**:
- [ ] Production app running on PostgreSQL
- [ ] All API endpoints responding normally
- [ ] User authentication working
- [ ] File uploads working
- [ ] No data loss reported
- [ ] Database performance acceptable
- [ ] Error rate < 1%
- [ ] Response times normal (< 200ms p95)

---

## Document Version
- **Created**: 2026-05-20
- **Status**: READY FOR PRODUCTION ROLLOUT
- **Next Review**: After first production migration

---

## Contacts

| Role | Name | Phone | Email | On-Call? |
|------|------|-------|-------|----------|
| Lead Engineer | — | — | — | YES (24h) |
| Database Admin | — | — | — | Available |
| Ops Manager | — | — | — | Available |

---

## Appendix: Commands Quick Reference

```bash
# Check staging health
curl https://antokton-pg-staging.onrender.com/health

# Connect to staging database
psql "$STAGING_DATABASE_URL"

# Backup staging database
pg_dump "$STAGING_DATABASE_URL" > backup-staging.dump

# Restore from backup
psql "$DATABASE_URL" < backup-staging.dump

# Run integrity verifier
node backend/scripts/verify-postgres-integrity.js --pg "$DATABASE_URL"

# Run smoke tests
node backend/smoke-test.js https://antokton-pg-staging.onrender.com

# Check production status
curl https://antokton.com/health
```

