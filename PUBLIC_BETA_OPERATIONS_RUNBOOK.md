# Public Beta Operations Runbook

Date: 2026-05-21

Status: draft for controlled public beta operations.

Scope: support, moderation, incident response, and daily operating cadence for ANTOKTON public beta. This runbook does not authorize a production deploy, database schema change, or new feature launch.

## Operating Mode

Recommended launch mode:

- Start with controlled invite-only beta.
- Keep broad public launch on hold until monitoring, backup restore, and owner assignments are complete.
- Review production health daily during the first week.
- Keep PostgreSQL rollback knowledge available until the beta week is stable.

## Required Owners

Assign named people before broad beta:

- Beta lead: approves invite waves and GO/NO-GO decisions.
- Technical on-call: watches health, deploys, logs, and database diagnostics.
- Support owner: reviews contact messages and user issues.
- Moderation owner: reviews reports, content flags, blocks, bans, and appeals.
- Privacy/legal owner: handles deletion, privacy, terms, and cookie requests.

Minimum rule: every queue below must have a human owner and a backup owner.

## Daily Cadence

Every morning during beta:

```powershell
Invoke-RestMethod https://antokton.com/health
node backend\scripts\smoke-test.js --base https://antokton.com
```

Manual checks:

- Review Render logs for recurring 5xx, auth, upload, and database connection errors.
- Review support/contact queue.
- Review moderation/report queue.
- Confirm backups are present.
- Record incidents, user-facing bugs, and unresolved support items.

Every evening during beta:

- Re-check `/health`.
- Confirm no unresolved P0 support or moderation cases.
- Confirm no unexplained PostgreSQL errors or connection pressure.
- Decide whether the next invite wave is safe.

## Support Triage

Support channels:

- Contact form records in `ContactMessage`.
- Email: `info@antokton.com`.
- Privacy/legal email: `privacy@antokton.com` and `legal@antokton.com`.

Categories:

- Account access
- Listing/posting problem
- Upload/media problem
- Payment/subscription problem
- Abuse/reporting
- Privacy/data deletion
- Legal/terms
- Bug report

SLA targets for beta:

- P0 safety, auth lockout, payment, or privacy issue: first response within 4 hours.
- Abuse/report requiring immediate moderation: first review within 4 hours.
- General support: first response within 1 business day.
- Feature request or non-blocking bug: acknowledge within 3 business days.

Escalation:

- Privacy/legal requests go to privacy/legal owner immediately.
- Security-sensitive reports go to technical on-call and beta lead.
- Payment or subscription issues get priority over general UX feedback.

## Moderation Triage

Queues to review:

- `Report`
- `CommentReport`
- `ContentModeration`
- `AdminAction`
- Admin user tools and blocked user state

Response targets:

- Illegal, dangerous, or personally harmful content: review immediately, target under 4 hours.
- Spam/scam reports: review within 1 business day.
- Low-confidence AI flags: review within 1 business day.
- Appeals: acknowledge within 2 business days.

Actions:

- Approve when content is safe and relevant.
- Remove or reject content that violates terms.
- Block or restrict repeat abusers.
- Preserve enough admin notes to explain high-impact moderation decisions.
- Log manual action in the admin/audit trail where available.

Appeals:

- Users can contact `legal@antokton.com` or `info@antokton.com`.
- Appeals should be reviewed by someone other than the original moderator when possible.
- Keep final appeal notes short, factual, and tied to the Terms of Use.

## Incident Levels

P0 incident:

- Site is down.
- `/health` is failing.
- `dbMode` is not `postgres` unexpectedly.
- Login or registration is broadly broken.
- Uploads are broadly broken.
- Data loss or privacy exposure is suspected.

P1 incident:

- A major workflow is degraded.
- Repeated 5xx errors appear in Render logs.
- Smoke test fails one or more checks.
- PostgreSQL diagnostics show blocked queries or idle-in-transaction sessions.

P2 incident:

- Minor UI problem.
- Single-user issue.
- Non-blocking text/content bug.

## Incident Response

For P0:

1. Stop invite waves.
2. Capture `/health` output.
3. Run production smoke.
4. Review Render logs.
5. Decide whether rollback, hotfix, or hold is needed.
6. Document exact time, symptom, action, and result.

For P1:

1. Capture failing check.
2. Review logs and recent deploys.
3. Re-run affected workflow.
4. Fix forward only when the cause is clear.

For P2:

1. Add to backlog.
2. Batch into the next beta cleanup branch.

## GO/NO-GO For Wider Invite Waves

GO only if:

- `/health` is OK.
- Smoke test is passing.
- No unresolved P0 incidents.
- No unresolved privacy/legal requests older than SLA.
- Moderation queue is current.
- Backups are present.

NO-GO if:

- Any P0 is open.
- PostgreSQL diagnostics are unhealthy.
- Backup status is unknown.
- Support or moderation queues are unowned.
- Recent deploy or data migration has not been observed long enough.

