# Rollback Verification Checklist

Rollback must be tested before PostgreSQL production cutover. This checklist covers both data rollback and runtime fallback.

## Pre-Cutover Rollback Assets

- [ ] Final SQLite snapshot captured.
- [ ] SQLite snapshot checksum recorded.
- [ ] PostgreSQL pre-migration backup captured.
- [ ] PostgreSQL post-migration backup captured.
- [ ] Migration rollback JSONL log created and stored outside git.
- [ ] Render production env snapshot captured without secret values.
- [ ] Previous production commit SHA recorded.

## Staging Rollback Drill

1. Run live staging migration with `--rollback-log`.
2. Verify staging integrity succeeds.
3. Run rollback against staging:

   ```powershell
   node backend\migrate-sqlite-to-postgres.js --pg $env:STAGING_DATABASE_URL --rollback validation-runs\<run>\migration-rollback.jsonl --confirm
   ```

4. Re-run diagnostics:

   ```powershell
   node backend\scripts\pg-diagnostics.js --pg $env:STAGING_DATABASE_URL
   ```

5. Re-run smoke:

   ```powershell
   node backend\scripts\smoke-test.js --base https://antokton-pg-staging.onrender.com
   ```

Expected result:

- Rollback command exits `0`.
- No blocked queries.
- No idle-in-transaction sessions older than 60 seconds.
- Staging app remains reachable.

## Production Runtime Fallback Drill

Before cutover, verify SQLite can still start:

```powershell
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\DATABASE_PROVIDER -ErrorAction SilentlyContinue
node -e "const db = require('./backend/db'); Promise.resolve(db.getDatabaseStatus()).then(s => console.log(JSON.stringify({mode: db.getDatabaseMode(), status: s})))"
```

Expected result:

- `mode` is `sqlite`.
- Database status is configured.
- No PostgreSQL connection attempt occurs.

## Emergency Rollback Decision

Rollback production if any of these occur after cutover:

- `/health` fails or reports the wrong database mode.
- Auth login/register fails for real users.
- Entity CRUD fails.
- Uploads fail.
- PostgreSQL has blocked queries or idle-in-transaction sessions that do not clear.
- Error rate remains elevated for more than 10 minutes.

## Emergency Rollback Steps

1. Stop write traffic if possible.
2. Capture PostgreSQL diagnostic output and error logs.
3. Revert Render production env to SQLite values:
   - remove or ignore `DATABASE_URL`
   - set `DATABASE_PROVIDER=sqlite`
   - preserve `DB_PATH`/SQLite volume settings
4. Redeploy or restart production.
5. Verify `/health` reports SQLite.
6. Run auth, entity CRUD, and upload smoke checks.
7. Keep the failed PostgreSQL database intact for postmortem.
