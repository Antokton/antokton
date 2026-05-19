# Antokton Database Migration Plan

Date: 2026-05-13

This document is a planning artifact only. It does not implement PostgreSQL, Supabase, a new ORM, or any backend/frontend behavior changes.

## Scope

- Audit the current SQLite data model.
- Identify current generic storage patterns and app entities.
- Define a safe migration path toward PostgreSQL/Supabase-compatible production storage.
- Keep SQLite as the working local database until the replacement path is tested.
- Avoid adding Supabase SDK or changing runtime logic in this step.

## Files Inspected

- `AGENTS.md`
- `PRODUCTION_ROADMAP.md`
- `AUDIT_REPORT.md`
- `AUTH_MIGRATION_PLAN.md`
- `DEVELOPMENT_SETUP.md`
- `backend/server.js`
- `backend/schema.sql`
- `backend/data/antokton.sqlite` metadata and entity counts
- `antokton-export/antokton-reference/entities/*.jsonc`
- Frontend source references to `base44.entities.*`

## Current SQLite Architecture

The backend currently uses `node:sqlite` through `DatabaseSync` in `backend/server.js`. The configured database path is `DB_PATH`, defaulting to `backend/data/antokton.sqlite`.

SQLite is initialized directly by `backend/server.js`, and the same schema is also documented in `backend/schema.sql`.

Current tables:

- `entity_records`
- `uploaded_files`
- `email_logs`
- `function_logs`
- `entity_schemas`

### `entity_records`

This is the main application data table.

Columns:

- `id TEXT PRIMARY KEY`
- `app_id TEXT NOT NULL`
- `entity TEXT NOT NULL`
- `data TEXT NOT NULL`
- `created_date TEXT NOT NULL`
- `updated_date TEXT NOT NULL`

Index:

- `idx_entity_records_entity_created` on `(app_id, entity, created_date DESC)`

Pattern:

- Every app entity is stored as JSON text in `data`.
- `id`, `created_date`, and `updated_date` are stored as table columns.
- Entity-specific fields live inside `data`.
- The backend loads exported JSONC schemas from `antokton-export/antokton-reference/entities` and uses them to apply defaults and coerce basic field types.
- Generic CRUD is implemented by `createRecord`, `updateRecord`, `deleteRecord`, and `listEntity`.
- Filters, sorting, field selection, skip, and limit are mostly performed in JavaScript after loading rows for the entity.
- Natural-id lookup falls back to matching `email`, `key`, or `slug` inside the JSON data.
- `created_by` is injected into JSON data from the request user email if not already present.

### `uploaded_files`

Columns:

- `id TEXT PRIMARY KEY`
- `filename TEXT NOT NULL`
- `mime_type TEXT`
- `size INTEGER NOT NULL`
- `disk_path TEXT NOT NULL`
- `public_url TEXT NOT NULL`
- `created_date TEXT NOT NULL`

Pattern:

- Used by local upload handling and remote asset localization.
- Files are stored on local disk under `backend/uploads`.
- URLs are served through local `/uploads`.

### `email_logs`

Columns:

- `id TEXT PRIMARY KEY`
- `payload TEXT NOT NULL`
- `created_date TEXT NOT NULL`

Pattern:

- `Core.SendEmail` writes payloads here.
- This is a development placeholder, not production email delivery.

### `function_logs`

Columns:

- `id TEXT PRIMARY KEY`
- `function_name TEXT NOT NULL`
- `payload TEXT`
- `result TEXT`
- `created_date TEXT NOT NULL`

Pattern:

- Used for local function call logging.
- Helpful during migration from exported Base44 functions to backend modules/workers.

### `entity_schemas`

Columns:

- `entity TEXT PRIMARY KEY`
- `schema_json TEXT NOT NULL`
- `source_path TEXT`
- `loaded_at TEXT NOT NULL`

Pattern:

- Stores the exported entity schemas from `antokton-export/antokton-reference/entities`.
- Useful as migration reference metadata.

## Entity Inventory

### Entity Schemas Present

The schema directory contains 60 entity schemas:

- `AdminAction`
- `AkademiaApplication`
- `AkademiaAttendance`
- `AkademiaCertificate`
- `AkademiaCourse`
- `AkademiaEvaluation`
- `AntonktonProject`
- `CandidateRating`
- `Certification`
- `CharityProject`
- `ChatMessage`
- `CommentLike`
- `CommentReport`
- `CompanyProfile`
- `CompanyRating`
- `ContactMessage`
- `ContentModeration`
- `CountrySuggestion`
- `DetailedRating`
- `EducationPartner`
- `Event`
- `EventComment`
- `EventParticipant`
- `EventRegistration`
- `EventRSVP`
- `FeaturedJob`
- `ImportedPost`
- `Interview`
- `Job`
- `JobApplication`
- `JobComment`
- `JobMatch`
- `JobReaction`
- `JobTemplate`
- `JobView`
- `MediaChannel`
- `MediaPost`
- `NavConfig`
- `Notification`
- `NotificationPreference`
- `Partner`
- `PremiumSubscription`
- `ProfessionSuggestion`
- `ProfileView`
- `Questionnaire`
- `QuestionnaireResponse`
- `Rating`
- `RecurringEvent`
- `Report`
- `SavedSearch`
- `SiteConfig`
- `StaffMessage`
- `Status`
- `StatusComment`
- `Subscription`
- `User`
- `UserActivity`
- `UserReference`
- `UserReview`
- `UserWarning`

### Entities Referenced By Active Frontend Source

The active frontend references these through the compatibility client:

- `AdminAction`
- `AkademiaApplication`
- `AkademiaAttendance`
- `AkademiaCertificate`
- `AkademiaCourse`
- `AkademiaEvaluation`
- `AntonktonProject`
- `CandidateRating`
- `Certification`
- `CharityProject`
- `ChatMessage`
- `CommentLike`
- `CommentReport`
- `CompanyProfile`
- `CompanyRating`
- `ContactMessage`
- `ContentModeration`
- `CountrySuggestion`
- `DetailedRating`
- `EducationPartner`
- `Event`
- `EventParticipant`
- `EventRegistration`
- `EventRSVP`
- `FeaturedJob`
- `ImportedPost`
- `Job`
- `JobApplication`
- `JobComment`
- `JobMatch`
- `JobReaction`
- `JobTemplate`
- `JobView`
- `MediaChannel`
- `MediaPost`
- `NavConfig`
- `Notification`
- `NotificationPreference`
- `Partner`
- `PremiumSubscription`
- `ProfessionSuggestion`
- `ProfileView`
- `Questionnaire`
- `Rating`
- `Report`
- `SavedSearch`
- `SiteConfig`
- `StaffMessage`
- `Status`
- `StatusComment`
- `User`
- `UserActivity`
- `UserReference`
- `UserReview`

Notable gap:

- No separate `MarketplacePost` schema was found. Marketplace/Pazar workflows appear to use `Job` records and imported post flows use `ImportedPost`.

### Entities Currently Stored In Local SQLite

The current local `backend/data/antokton.sqlite` contains data for:

| Entity | Count |
| --- | ---: |
| `AdminAction` | 18 |
| `Certification` | 7 |
| `ChatMessage` | 6 |
| `CommentLike` | 2 |
| `Event` | 10 |
| `Job` | 15 |
| `JobApplication` | 1 |
| `JobComment` | 8 |
| `JobReaction` | 4 |
| `JobView` | 27 |
| `Notification` | 16 |
| `NotificationPreference` | 4 |
| `Status` | 9 |
| `StatusComment` | 38 |
| `User` | 7 |
| `UserActivity` | 1 |

This count reflects the current local database only. It does not represent the complete live Base44/production data set.

## Weaknesses For Production

SQLite/local JSON storage works for local development, but it is not enough for production Antokton.

Main issues:

- Single-file SQLite is not ideal for multi-user, multi-server web production.
- Most data is schemaless JSON inside one generic table.
- Database constraints are missing for entity-specific rules.
- There are no foreign keys between users, jobs, applications, comments, events, subscriptions, certificates, messages, or notifications.
- Filters and sorts happen mostly in application code, which will not scale well.
- Entity-specific indexes do not exist for common queries such as user email, job status, city, country, category, event date, certificate number, or unread notifications.
- JSON fields are hard to validate and migrate safely.
- Role and permission boundaries are not enforceable at the database level.
- Local upload paths in `uploaded_files` are not portable across servers.
- Email/function logs are useful but not production-grade observability.
- Backups, restore checks, migrations, and rollback strategy are not formalized.
- Reporting and analytics will be difficult against generic JSON storage.

## Recommended PostgreSQL Architecture

Use PostgreSQL as the production database and keep a compatibility layer during transition.

Recommended shape:

- Add a database module behind the backend API.
- Keep SQLite as local development storage until PostgreSQL is tested.
- Introduce SQL migrations.
- Keep a PostgreSQL `entity_records` compatibility table at first.
- Add normalized tables for stable, important workflows.
- Gradually route high-value entities to normalized tables while keeping Base44-shaped API responses compatible.
- Keep `antokton-export/antokton-reference/entities` as migration references until every entity has a native model or a documented compatibility mapping.

Recommended tooling options:

- Plain SQL migrations for maximum portability.
- A lightweight query layer around `pg`.
- Prisma/Drizzle/Knex only after deciding whether the added abstraction is worth it.

Initial PostgreSQL baseline:

- `schema_migrations`
- `entity_records` compatibility table
- `uploaded_files` or `media_assets`
- `email_logs`
- `function_logs`
- `audit_logs`
- normalized tables listed below

## Supabase-Compatible Option

Supabase-compatible means PostgreSQL-first, with optional Supabase services used through clear adapters.

Possible components:

- Supabase Postgres for database.
- Supabase Auth for real authentication, as recommended in `AUTH_MIGRATION_PLAN.md`.
- Supabase Storage later for uploads, or any S3-compatible storage if portability is preferred.
- Backend verifies auth and continues serving the existing API.

Pros:

- Fast path to managed PostgreSQL.
- Good fit with planned Supabase Auth.
- Built-in backups and dashboard features depending on plan.
- Easy local-to-cloud mental model for PostgreSQL.
- SQL remains portable if schema design avoids provider-only features.

Cons:

- Some operational and billing dependence on Supabase.
- Row Level Security can be powerful but can also create provider-specific complexity if the Node backend remains the main API boundary.
- Storage/Auth integrations can increase lock-in if used directly throughout app code.

Recommended Supabase-compatible usage:

- Keep all Supabase-specific logic inside backend adapters.
- Use ordinary SQL migrations.
- Avoid relying on Supabase-only APIs in frontend pages.
- Keep the Node backend as the business logic layer.
- Keep data export scripts from day one.

## Self-Hosted Or Managed PostgreSQL Option

This means using PostgreSQL from a host/cloud provider without Supabase-specific services.

Examples:

- Managed PostgreSQL from the deployment provider.
- Dedicated PostgreSQL service.
- Self-hosted PostgreSQL on a VPS, only if operations/backups are handled seriously.

Pros:

- Less Supabase-specific vendor coupling.
- Full control over database operations.
- Easier to pair with custom Node auth if chosen later.
- Standard PostgreSQL remains portable.

Cons:

- More operational work.
- Auth, storage, backups, dashboarding, and monitoring must be assembled separately.
- Higher chance of missing production basics if rushed.

## Primary Recommendation For Antokton

Use Supabase-compatible PostgreSQL as the primary path, but keep the backend and schema portable.

Practical recommendation:

- Choose Supabase Postgres if the goal is fastest safe production path.
- Do not put Supabase calls directly into React pages.
- Keep a Node database adapter so Antokton can move later to standard PostgreSQL with less pain.
- Use standard SQL migrations and standard PostgreSQL types.
- Avoid Supabase-specific table design unless the benefit is clear.
- Keep SQLite local until PostgreSQL migration and smoke tests pass.

This aligns with the current roadmap: real auth first, then PostgreSQL/Supabase-compatible database, then storage and deployment.

## Migration Phases

### Phase 1: Keep SQLite Local, Add Database Abstraction

Status:

- [x] SQLite initialization moved behind `backend/db.js` on 2026-05-13.
- [x] `backend/db.js` exports `db`, `statements`, `getDatabaseStatus()`, and `getDatabaseMode()`.
- [x] `backend/server.js` now consumes the existing prepared statements from the database module.
- [x] SQLite remains the active local database and no PostgreSQL/Supabase SDK was added.
- [x] PostgreSQL schema, `DATABASE_PROVIDER`, `DATABASE_URL`, and a safe SQLite-to-PostgreSQL migration script were added on 2026-05-19.

Goal:

Introduce a backend database boundary without changing endpoint behavior.

Likely files to change:

- `backend/server.js`
- `backend/db/index.js`
- `backend/db/sqlite.js`
- `backend/db/types.js` or `backend/db/entities.js`
- `backend/config.js`
- `.env.example`
- `DEVELOPMENT_SETUP.md`
- `DATABASE_MIGRATION_PLAN.md`

Expected work:

- Wrap current SQLite statements behind functions such as:
  - `createEntityRecord`
  - `updateEntityRecord`
  - `deleteEntityRecord`
  - `getEntityRecord`
  - `listEntityRecords`
  - `insertUploadedFile`
  - `insertEmailLog`
  - `insertFunctionLog`
  - `upsertEntitySchema`
- Preserve the current Base44-shaped API responses.
- Keep `node:sqlite` behavior as the default local driver.
- Add `DATABASE_PROVIDER=sqlite` and `DATABASE_URL` config documentation.

Do not do in Phase 1:

- Do not switch to PostgreSQL yet.
- Do not change frontend API calls.
- Do not normalize tables yet.

### Phase 2: Create PostgreSQL Schema And Migrations

Status:

- [x] Initial PostgreSQL compatibility schema added at `backend/postgres/schema.sql` on 2026-05-19.
- [x] The schema mirrors the current SQLite compatibility tables and auth tables.
- [x] Live runtime still defaults to SQLite.
- [x] PostgreSQL API runtime adapter is available behind `DATABASE_PROVIDER=postgres` as of 2026-05-19.
- [ ] PostgreSQL staging smoke test has not run yet because no `DATABASE_URL` is configured in the local environment.

Goal:

Create the target PostgreSQL schema while SQLite remains active.

Likely files to change:

- `backend/migrations/0001_initial.sql`
- `backend/migrations/0002_core_entities.sql`
- `backend/migrations/0003_indexes.sql`
- `backend/db/postgres.js`
- `backend/db/migrate.js`
- `backend/config.js`
- `.env.example`
- `DEVELOPMENT_SETUP.md`

Expected work:

- Add `schema_migrations`.
- Add PostgreSQL `entity_records` compatibility table.
- Add normalized core tables.
- Add indexes for current query patterns.
- Add constraints where the model is stable.
- Keep JSONB compatibility columns where schema is still moving.

### Phase 3: Write Migration Script From SQLite To PostgreSQL

Status:

- [x] Safe one-way migration helper added at `backend/scripts/migrate-sqlite-to-postgres.js` on 2026-05-19.
- [x] The script refuses to import into non-empty PostgreSQL tables.
- [x] Exact Render migration steps documented in `POSTGRESQL_MIGRATION_RUNBOOK.md`.
- [ ] Migration has not been run against a real Render PostgreSQL database yet.

Goal:

Move current local/live imported data from SQLite into PostgreSQL repeatably.

Likely files to change:

- `backend/migrate-sqlite-to-postgres.js`
- `backend/db/sqlite.js`
- `backend/db/postgres.js`
- `backend/db/entity-mappers.js`
- `backend/db/migration-report.js`
- `DEVELOPMENT_SETUP.md`

Expected work:

- Read all rows from SQLite `entity_records`.
- Insert raw rows into PostgreSQL `entity_records`.
- Map stable entities into normalized PostgreSQL tables.
- Preserve original ids where possible.
- Preserve `created_date`, `updated_date`, and `created_by`.
- Produce a migration report with counts per entity, skipped records, validation errors, and duplicate conflicts.
- Make the script idempotent or clearly one-way with a fresh target database.

### Phase 4: Switch Backend Via `DATABASE_URL`

Goal:

Allow the same backend endpoints to run against PostgreSQL in production.

Likely files to change:

- `backend/server.js`
- `backend/db/index.js`
- `backend/db/postgres.js`
- `backend/db/sqlite.js`
- `backend/config.js`
- `.env.example`
- `backend/smoke-test.js`
- `backend/smoke-test.ps1`
- Deployment config files when added

Expected work:

- Use `DATABASE_PROVIDER=postgres` after the PostgreSQL runtime adapter is tested.
- Keep SQLite for local dev.
- Keep endpoint responses compatible.
- Run smoke tests against both SQLite and PostgreSQL.
- Confirm core flows:
  - user/profile
  - jobs/feed/pazar
  - applications
  - events
  - status posts/comments
  - messages/notifications
  - Akademia
  - admin actions

### Phase 5: Production Backup And Restore Plan

Goal:

Make production data recoverable before launch.

Likely files to change:

- `docs/BACKUP_RESTORE_PLAN.md`
- `backend/scripts/backup-postgres.js` or deployment-specific backup notes
- `backend/scripts/export-data.js`
- `backend/scripts/restore-test.md`
- `DEVELOPMENT_SETUP.md`

Expected work:

- Define backup frequency.
- Define retention policy.
- Test restore into a clean database.
- Export object storage/media mappings separately.
- Document emergency rollback to last known good deployment.
- Add periodic verification that backups are restorable.

## Table Design Recommendations

The first PostgreSQL release should not try to perfectly normalize every field. Normalize the workflows that need constraints, permissions, filtering, and reporting. Keep JSONB for flexible or legacy fields while the app stabilizes.

### Users And Profiles

Recommended tables:

- `users`
- `profiles`
- `user_roles`
- `user_auth_identities` if not fully owned by Supabase Auth
- `user_activity`
- `profile_views`
- `user_reviews`
- `user_references`
- `user_warnings`

Key fields:

- stable `id UUID`
- `email CITEXT UNIQUE`
- auth provider id if using Supabase Auth
- role and account status server-side
- profile fields from `User.jsonc`
- timestamps

Indexes:

- `users(email)`
- `profiles(country, city)`
- `profiles(user_type)`
- `profiles(member_category)`
- search indexes later for names, skills, professions

### Jobs, Posts, And Marketplace/Pazar

Recommended tables:

- `posts`
- `jobs`
- `marketplace_listings` or a `posts.type` model
- `job_views`
- `job_reactions`
- `featured_jobs`
- `saved_searches`
- `imported_posts`

Because the current Pazar appears to use `Job` records rather than a separate `MarketplacePost` entity, decide early whether production should split marketplace listings from jobs or use a unified posts table.

Recommended approach:

- Use a shared `posts` table for common listing fields.
- Add job-specific fields in `jobs`.
- Add marketplace-specific fields later if Pazar needs separate rules.

Indexes:

- `posts(status, created_at)`
- `posts(category, country, city)`
- `posts(created_by)`
- `jobs(job_type)`
- `featured_jobs(is_active, end_date)`

### Applications

Recommended tables:

- `job_applications`
- `interviews`
- `questionnaires`
- `questionnaire_responses`
- `job_matches`
- `candidate_ratings`

Key requirements:

- Foreign keys to users and jobs.
- Unique guard to prevent duplicate active applications by the same user to the same job.
- Status history or audit logs for employer/admin decisions.

Indexes:

- `job_applications(job_id)`
- `job_applications(applicant_user_id)`
- `job_applications(status)`
- `interviews(scheduled_date)`

### Comments And Reactions

Recommended tables:

- `job_comments`
- `job_comment_likes`
- `comment_reports`
- `status_posts`
- `status_comments`
- `status_reactions`
- `event_comments`

Key requirements:

- Parent-child comment support.
- Soft delete where user-facing history matters.
- Moderation status.
- Author foreign keys.

Indexes:

- comments by parent content id and created date
- reactions unique by `(content_id, user_id, reaction_type)` where appropriate
- reports by status and created date

### Events

Recommended tables:

- `events`
- `event_registrations`
- `event_participants`
- `event_rsvps`
- `recurring_events`

Key requirements:

- Event status and visibility fields.
- Featured day/week fields with expiry.
- Registration capacity and status.
- Organizer relation to user/profile.

Indexes:

- `events(status, event_date)`
- `events(country, city)`
- `events(featured_day, featured_day_expires)`
- `events(featured_week, featured_week_expires)`
- `event_registrations(event_id, user_id)`

### Akademia

Recommended tables:

- `akademia_courses`
- `akademia_applications`
- `akademia_attendance`
- `akademia_evaluations`
- `akademia_certificates`

Key requirements:

- Course lifecycle: active, archived.
- Application statuses: pending, approved, rejected, completed.
- Attendance by day.
- Mentor assignment.
- Certificate number unique.
- Certificate public verification.

Indexes:

- `akademia_courses(status, start_date)`
- `akademia_applications(course_id, status)`
- `akademia_applications(user_id)`
- `akademia_certificates(certificate_number UNIQUE)`
- `akademia_certificates(user_id, status)`

### Moderation And Audit Logs

Recommended tables:

- `audit_logs`
- `admin_actions`
- `content_moderation`
- `reports`

Key requirements:

- Immutable audit entries where possible.
- Actor user id/email.
- Target entity type/id.
- Previous and new values for sensitive changes.
- IP/user agent if privacy policy allows.

Indexes:

- `audit_logs(actor_user_id, created_at)`
- `audit_logs(target_type, target_id)`
- `reports(status, created_at)`
- `content_moderation(admin_decision, created_at)`

### Uploaded Files And Media

Recommended tables:

- `media_assets`
- `uploaded_files` compatibility view/table
- `media_channels`
- `media_posts`

Key requirements:

- Separate local disk path from public URL.
- Storage provider and bucket/key fields.
- MIME type, size, checksum, uploader, visibility.
- Private/public policy.
- Migration mapping from old `/uploads/...` URLs to future object storage URLs.

Indexes:

- `media_assets(uploader_user_id, created_at)`
- `media_assets(storage_provider, storage_key)`
- `media_posts(is_active, order_index)`
- `media_channels(is_active, order_index)`

### Subscriptions And Payments

Recommended tables:

- `subscriptions`
- `premium_subscriptions`
- `payments`
- `stripe_events`
- `featured_purchases`

Key requirements:

- Never trust frontend payment status.
- Store Stripe session/payment/subscription ids.
- Verify webhooks server-side.
- Keep raw webhook payload reference and processed status.

Indexes:

- `subscriptions(user_id, is_active)`
- `premium_subscriptions(user_email, is_active)` during compatibility
- `payments(provider, provider_payment_id UNIQUE)`
- `stripe_events(event_id UNIQUE)`

### Settings And Site Config

Recommended tables:

- `site_config`
- `nav_config`
- `feature_flags`

Key requirements:

- Preserve current `SiteConfig` key/value behavior.
- Add typed config only where stable.
- Keep history/audit for admin changes.

Indexes:

- `site_config(key UNIQUE)`
- `site_config(group_name)`

## Compatibility Strategy

The existing frontend expects Base44-shaped entity APIs. The backend should preserve that shape while the database changes underneath.

Recommended approach:

- Keep `/api/apps/:appId/entities/:entity` routes stable.
- Keep `id`, `created_date`, and `updated_date` in responses.
- Keep field names expected by current React pages.
- Add normalized table reads/writes behind the same endpoints for selected entities.
- Keep `entity_records` as a compatibility mirror during early migration.
- Use mapper functions per entity when moving to normalized tables.

Example:

- `Job` endpoint can write to `jobs/posts` and also keep a compatibility JSON row until frontend migration is complete.
- `User/me` can read from `users/profiles` and return the same shape expected by `base44.auth.me()`.
- `AkademiaCertificate` can use a normalized certificate table while returning the existing certificate fields.

## Portability

### Avoiding Base44 Lock-In

- Keep the exported `antokton-reference/entities` files as migration references, not runtime authority forever.
- Gradually replace `base44.entities.*` names with Antokton domain APIs or hooks after backend endpoints stabilize.
- Keep Base44-shaped routes as compatibility aliases, then retire them when frontend usage is gone.
- Store production data in PostgreSQL tables owned by Antokton, not in Base44-only formats.
- Keep import scripts separate from production runtime.

### Avoiding Supabase Lock-In

- Use standard PostgreSQL schemas and SQL migrations.
- Keep Supabase-specific Auth/Storage code behind backend adapters.
- Avoid direct Supabase calls from React pages unless intentionally approved.
- Avoid relying on provider-only database features unless there is a documented reason.
- Keep a path for `DATABASE_URL` to point to any PostgreSQL provider.
- Prefer S3-compatible object storage abstractions for media where possible.

### Exporting Data

Production should support:

- Full PostgreSQL dump with `pg_dump`.
- Logical exports by domain:
  - users/profiles
  - jobs/posts/applications
  - events
  - messages/notifications
  - statuses/comments
  - payments/subscriptions
  - Akademia/certificates
  - audit logs
- Media manifest export with storage keys, public URLs, checksums, and ownership metadata.
- Compatibility export of remaining `entity_records` JSON.
- A restore test against a clean staging database.

## Recommended Next Step

After the 2026-05-19 PostgreSQL runtime adapter, the next step is a staging-only PostgreSQL migration and smoke test:

- Keep SQLite as the default for production.
- Use `POSTGRESQL_MIGRATION_RUNBOOK.md` to migrate a backup into an empty Render PostgreSQL database.
- Run the existing PostgreSQL statement adapter against a migrated staging database.
- Run smoke tests against PostgreSQL in staging before any live switch.
- Do not set `DATABASE_PROVIDER=postgres` on the live Render service until staging passes.

Success criteria before switching:

- SQLite mode still passes.
- PostgreSQL migration imports all compatibility tables into an empty target.
- PostgreSQL runtime passes `/health`, `/health/config`, `User/me`, entity list/create/update/delete, auth, statuses, events, marketplace, Akademia, and admin smoke tests.
- Backup and restore are tested for PostgreSQL.
