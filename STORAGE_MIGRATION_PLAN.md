# Antokton Storage Migration Plan

Date: 2026-05-13

This document is a planning artifact. It does not replace local uploads, add cloud SDKs, or change runtime behavior.

## Current Local Uploads Behavior

The backend currently stores uploaded and localized files on local disk.

Current behavior:

- `UPLOAD_DIR` defaults to `backend/uploads`.
- `REMOTE_ASSET_DIR` defaults to `backend/uploads/remote`.
- The backend serves public files under `/uploads/...`.
- `Core.UploadFile` writes uploaded files to local disk and returns:
  - `file_url: "/uploads/<file>"`
  - `url: "/uploads/<file>"`
- Remote assets detected in entity payloads are downloaded into `/uploads/remote/...`.
- File metadata is recorded in the SQLite `uploaded_files` table.
- Existing frontend pages expect the current `/uploads/...` public URL format.
- Local behavior is now wrapped by `backend/storage.js`, but still uses local disk.

## Production Risks

Local disk uploads are fine for development, but risky for production:

- Files can disappear when a server is redeployed or replaced.
- Multiple servers would not share the same upload directory.
- There is no cloud backup or lifecycle policy.
- Public/private access rules are not formalized.
- Sensitive documents such as CVs may be publicly reachable if stored under public URLs.
- File validation is still basic.
- There is no virus/malware scanning.
- Large uploads can fill the server disk.
- Remote asset cache files are tied to one machine.
- Migration mapping from local URLs to cloud URLs does not exist yet.

## Option A: Supabase Storage

Supabase Storage fits naturally if Antokton chooses Supabase Auth and Supabase Postgres.

Pros:

- Integrated with the Supabase ecosystem.
- Buckets, public/private policy, and signed URLs are available.
- Easier operational setup if the database/auth path is also Supabase.
- Good fit for a Supabase-compatible MVP.

Cons:

- More provider coupling if used directly throughout the codebase.
- Bucket policies and signed URL behavior need careful design.
- Cost and limits depend on the selected Supabase plan.

Recommended usage if selected:

- Keep Supabase Storage calls inside `backend/storage.js` or provider-specific storage adapters.
- Do not call Supabase Storage directly from React pages.
- Use private buckets for CVs/documents.
- Use public buckets only for assets intentionally public.

## Option B: Cloudflare R2 Or S3-Compatible Object Storage

S3-compatible storage includes Cloudflare R2, AWS S3, DigitalOcean Spaces, Backblaze B2 S3 API, and similar providers.

Pros:

- More portable across vendors.
- Standard S3-compatible APIs.
- R2 can be cost-effective for public assets.
- Works well with a Node backend and CDN-style delivery.

Cons:

- Requires separate auth/database setup.
- Signed URL and bucket policy design is the app's responsibility.
- Provider-specific edge cases still exist.

Recommended usage if selected:

- Keep an S3-compatible adapter behind `backend/storage.js`.
- Store `provider`, `bucket`, `object_key`, `public_url`, `mime_type`, `size`, and checksum metadata.
- Use signed URLs for private files.
- Keep public URLs stable through a CDN/custom domain if possible.

## Recommendation For Antokton

Keep `backend/storage.js` as the storage boundary and use local disk only for development until production auth and database direction are settled.

Primary production recommendation:

- If Antokton chooses Supabase Auth/Postgres, use Supabase Storage for the first production version because it reduces setup complexity.
- Keep the implementation portable by isolating Supabase-specific calls inside a storage adapter.
- If avoiding Supabase lock-in is more important, choose Cloudflare R2 or another S3-compatible storage provider and keep the same storage interface.

Do not migrate uploads before deciding private/public file rules. CVs, documents, profile photos, certificates, public media, and cached remote assets should not all have the same access policy.

## Migration Phases

### Phase 1: Local Storage Abstraction

Status:

- [x] Local storage behavior wrapped in `backend/storage.js` on 2026-05-13.
- [x] `/uploads/...` URL format preserved.
- [x] `Core.UploadFile` response shape preserved.
- [x] No cloud SDK added.
- [ ] Cloud provider not selected yet.

Likely files changed:

- `backend/storage.js`
- `backend/server.js`
- `DEVELOPMENT_SETUP.md`
- `STORAGE_MIGRATION_PLAN.md`

### Phase 2: Define Storage Policy

Goal:

Classify file types and decide access rules.

Buckets or logical groups:

- Public assets: logos, profile photos intended public, post images.
- Private documents: CVs, application documents, verification documents.
- Generated files: certificates and PDFs.
- Remote cache: downloaded remote assets.

Output:

- Public/private matrix.
- Max upload sizes.
- Allowed MIME types/extensions.
- Signed URL rules.
- Retention and deletion policy.

Likely files to change:

- `STORAGE_MIGRATION_PLAN.md`
- `.env.example`
- `DEVELOPMENT_SETUP.md`
- future privacy/security docs

### Phase 3: Add Cloud Storage Adapter

Goal:

Implement a provider behind the existing storage interface without changing frontend responses.

Likely files to change:

- `backend/storage.js`
- `backend/storage/local.js`
- `backend/storage/supabase.js` or `backend/storage/s3.js`
- `backend/config.js`
- `.env.example`
- `backend/server.js`

Expected work:

- Add `STORAGE_DRIVER=local|supabase|s3`.
- Keep local mode for development.
- Add upload, public URL, signed URL, and delete helpers.
- Keep `/uploads/...` compatibility where needed through redirects or proxy routes.

### Phase 4: Migrate Existing Files

Goal:

Move local files to object storage and preserve references.

Likely files to change:

- `backend/migrate-uploads-to-storage.js`
- `backend/storage/*`
- `backend/db/*`
- migration report docs

Expected work:

- Scan `backend/uploads`.
- Upload files to selected storage.
- Update or map `uploaded_files.public_url`.
- Keep a mapping from old local URLs to new public/signed URLs.
- Verify counts and checksums.
- Keep rollback plan.

### Phase 5: Production Enforcement

Goal:

Make production use cloud/object storage only.

Expected work:

- Fail production startup if `STORAGE_DRIVER=local` unless explicitly allowed for a private staging environment.
- Enforce MIME and size rules.
- Add monitoring for failed uploads.
- Add backup/export manifest for media assets.

## Data To Preserve

Preserve these fields during migration:

- Original filename.
- MIME type.
- Size.
- Current public URL or redirect mapping.
- Storage provider.
- Bucket/key.
- Uploader or source entity where known.
- Creation timestamp.

## Recommended Next Step

Keep local storage as-is and define the file access policy before choosing the cloud provider. The next implementation step should be a storage policy document or `.env.example` extension for future storage driver settings, not cloud SDK integration yet.

