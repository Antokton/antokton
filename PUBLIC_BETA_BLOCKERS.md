# Public Beta Blockers

Date: 2026-05-21

Scope: public beta readiness review after PostgreSQL migration phase moved into post-merge stabilization.

Status: not ready for broad public beta until the blockers below are closed.

## P0 Blockers

### 1. Monitoring and alerting are not yet operational

Risk: production incidents may go unnoticed during beta traffic.

Minimum requirement:

- Uptime monitor for `/health`.
- Alert if `/health` fails twice in a row.
- Alert if production reports an unexpected `dbMode`.
- Alert on 5xx spikes, auth failures, upload failures, and PostgreSQL diagnostics after cutover.

Owner decision needed:

- Choose monitoring provider.
- Choose alert destinations: email, SMS, Slack, or equivalent.

### 2. Backup automation is not yet proven

Risk: beta users can create real data before restore procedures are proven.

Minimum requirement:

- Daily production SQLite snapshot while production remains SQLite.
- Snapshot checksum.
- Off-repo/off-machine retention.
- Restore drill documented.
- PostgreSQL backup and restore drill before the production DB switch.

### 3. Legal copy has visible encoding issues and needs review

Observed files:

- `antokton-export/src/pages/Privacy.jsx`
- `antokton-export/src/pages/Terms.jsx`
- `antokton-export/src/pages/Contact.jsx`
- `antokton-export/src/pages/ContentModeration.jsx`

Risk: Albanian text appears mojibake-encoded in several pages, which undermines trust and may create legal ambiguity.

Minimum requirement:

- Correct encoding for Privacy, Terms, Contact, and moderation pages.
- Legal review of Privacy and Terms before broad beta.
- Add clear data deletion/contact process.
- Confirm cookie/analytics language matches actual tracking behavior.

### 4. Abuse and moderation operations need an assigned process

Existing pieces:

- `Report` entity.
- `CommentReport` entity.
- `ContentModeration` entity.
- `AdminAction` entity.
- Admin report handling in `Admin.jsx`.
- User flag/block controls in admin/user tools.

Risk: the UI and entities exist, but public beta needs response ownership, SLA, and escalation rules.

Minimum requirement:

- Assign moderation owners.
- Define response SLA for reports.
- Define block/ban/escalation policy.
- Define appeal path.
- Confirm admin/moderator access is correct in production.
- Confirm report queues are visible and actionable.

## P1 Blockers

### 5. Contact form triage is not production-operational yet

Existing piece:

- Contact form creates `ContactMessage` records.

Risk: messages may be stored but not actively routed to operators.

Minimum requirement:

- Admin view or daily triage process for `ContactMessage`.
- Email notification or dashboard queue.
- Categorize support, privacy, legal, abuse, billing.

### 6. Admin and moderation audit trail needs beta runbook

Existing piece:

- `AdminAction` records admin actions.

Risk: audit data exists but operators need a procedure for reviewing it.

Minimum requirement:

- Weekly admin-action review during beta.
- Document who can grant admin/moderator roles.
- Confirm no unapproved admin users.

### 7. Public beta auth posture needs final review

Minimum requirement:

- Production has `ALLOW_DEV_AUTH=false`.
- Production has secure session cookies.
- Bootstrap admin credentials removed after setup.
- Password reset/email verification flows are either supported or clearly scoped.
- Rate limits verified under expected beta traffic.

### 8. PWA/mobile install readiness needs QA pass

Existing pieces:

- `manifest.json`
- `sw.js`
- offline page
- icons
- mobile navigation components

Risks:

- Offline cache may serve stale UI after releases.
- Mobile install and navigation need real-device QA.

Minimum requirement:

- iOS Safari install test.
- Android Chrome install test.
- Logout/login after service worker update.
- Upload flow on mobile.
- Push/notification behavior explicitly scoped.

## P2 Blockers

### 9. Duplicate/historical docs may confuse operators

Examples:

- `PRODUCTION_POSTGRES_ROLLOUT.md`
- `FINAL_POSTGRES_READINESS_REPORT.md`
- `PRODUCTION_POSTGRES_CUTOVER_RUNBOOK.md`
- `PRODUCTION_CUTOVER_GO_NO_GO_REPORT.md`

Minimum requirement:

- Mark old documents as historical or move them under an archive folder.
- Keep the cutover runbook as the source of truth.

### 10. Duplicate smoke/diagnostics entry points need documentation

Examples:

- `backend/smoke-test.js`
- `backend/scripts/smoke-test.js`
- `backend/scripts/pg-diagnostics.sql`
- `backend/scripts/pg-diagnostics.js`

Minimum requirement:

- Document the preferred command path.
- Avoid deleting until one full beta validation cycle confirms nothing depends on old entry points.

## Public Beta Launch Gate

Do not launch broad public beta until:

- Monitoring/alerting is active.
- Backups are automated and restore-tested.
- Legal text encoding and content are corrected.
- Abuse/moderation SLA is assigned.
- Contact support queue is monitored.
- Admin roles are reviewed.
- PWA/mobile smoke passes on at least one iOS and one Android device.

## Recommended Beta Scope

Start with a controlled beta:

- Invite-only users.
- Daily admin report review.
- Daily backup verification.
- Manual support triage.
- Weekly stability review.

Move to public beta only after one stable week.
