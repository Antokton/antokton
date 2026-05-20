# Production Rollout Checklist

Scope: pre-production readiness for Antokton. This checklist does not authorize a production database switch by itself.

## Pre-Merge Safety

- [ ] Changes are backend-only unless explicitly approved.
- [ ] No production environment variables changed.
- [ ] No Render production service settings changed.
- [ ] SQLite production remains available and unmodified.
- [ ] Rollback path is documented and tested.

## Staging Validation

- [ ] `/health` returns `ok: true`.
- [ ] `/health` reports `dbMode=postgres` for staging.
- [ ] Smoke test passes with `failed: 0`.
- [ ] Auth register/login and `User/me` pass.
- [ ] Entity create/read/list/update/delete pass.
- [ ] Upload and asset fetch pass.
- [ ] Integrity verifier exits `0` against the migrated staging dataset.
- [ ] PostgreSQL diagnostics show no long-running queries.
- [ ] No idle-in-transaction sessions older than 60 seconds.
- [ ] Index and table cache hit ratios are acceptable for the current load.

## Data Migration Gate

- [ ] SQLite source snapshot selected and checksummed.
- [ ] Migration dry run completed.
- [ ] Migration into staging completed.
- [ ] Row counts match for required tables.
- [ ] Missing-row check reports zero required missing rows.
- [ ] JSON field comparison reports zero mismatches.
- [ ] Auth/session tables are explicitly verified or explicitly excluded with a reason.

## Performance Gate

- [ ] Index migration applied to staging PostgreSQL.
- [ ] Load test completed against staging.
- [ ] p95 API latency remains below the agreed threshold.
- [ ] Pool usage remains below saturation.
- [ ] Application logs show no PostgreSQL errors.

## Production Cutover Hold Points

- [ ] Backup restore drill completed.
- [ ] Maintenance window approved.
- [ ] Final SQLite snapshot captured.
- [ ] PostgreSQL rollback plan reviewed.
- [ ] Monitoring owner assigned.
- [ ] Go/no-go decision recorded.

## Explicit Non-Goals

- Do not switch production to PostgreSQL until all staging gates pass.
- Do not delete SQLite data during rollout.
- Do not attach new production env groups without a separate approval.
