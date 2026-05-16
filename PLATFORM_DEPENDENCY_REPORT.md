# Antokton Platform Dependency Report

Date: 2026-05-13

This report documents legacy platform dependency risk without removing or refactoring code.

## Summary

The active React/Vite frontend no longer imports `@base44/sdk` or `@base44/vite-plugin` in the build path.

However, the active frontend still uses a local compatibility layer named `base44` through `@/api/antoktonClient`. This is intentional for now. It keeps the exported app working while the backend provides Base44-shaped local API routes.

The exported Base44 function source under `antokton-export/antokton-reference/functions` still contains Base44 SDK imports. These files are migration/reference code, not active frontend bundle code.

Active project file and folder names have been moved to Antokton-neutral names where safe:

- `antokton-export/src/api/antoktonClient.js`
- `antokton-export/antokton-reference`
- `antokton-design-import-archive-20260508-153758`

## Checks Performed

Checked active frontend files:

- `antokton-export/src`
- `antokton-export/package.json`
- `antokton-export/package-lock.json`
- `antokton-export/vite.config.js`

Findings:

- `@base44/sdk`: 0 active frontend matches.
- `@base44/vite-plugin`: 0 active frontend matches.
- `@/api/antoktonClient`: 103 active frontend source files import the local compatibility client.

Checked exported/reference files:

- `antokton-export/antokton-reference/functions`
- `antokton-design-import-archive-20260508-153758`
- `backend` import/helper scripts

Findings:

- `antokton-export/antokton-reference/functions`: 40 function `entry.ts` files import `npm:@base44/sdk`.
- `antokton-design-import-archive-20260508-153758`: archived/reference project still has real Base44 package dependencies and plugin usage.
- `backend/import-live-data.js`: still references `https://app.base44.com` through `BASE44_API_URL` for migration/import tooling.

## Remaining Base44 Imports/Usages

### Active frontend compatibility usage

Most active pages/components import:

```js
import { base44 } from "@/api/antoktonClient";
```

This local client exposes:

- `base44.entities`
- `base44.asServiceRole.entities`
- `base44.auth`
- `base44.integrations.Core`
- `base44.functions.invoke`
- `base44.users`
- `base44.appLogs`

These names are Base44-compatible API shapes, but the implementation is local in:

```text
antokton-export/src/api/antoktonClient.js
```

### Active backend compatibility usage

`backend/server.js` intentionally implements Base44-shaped routes:

```text
/api/apps/{appId}/entities/{Entity}
/api/apps/{appId}/entities/User/me
/api/apps/{appId}/functions/{functionName}
/api/apps/{appId}/integration-endpoints/Core/{operation}
/api/apps/public/prod/public-settings/by-id/{appId}
```

It also loads schemas from:

```text
antokton-export/antokton-reference/entities
```

### Frontend legacy parameter names

`antokton-export/src/lib/app-params.js` still uses legacy Base44 naming:

- `base44_access_token`
- `VITE_BASE44_APP_ID`
- `VITE_BASE44_FUNCTIONS_VERSION`
- `VITE_BASE44_APP_BASE_URL`
- URL params such as `app_id`, `access_token`, `from_url`, `functions_version`, `app_base_url`

These are compatibility leftovers and should be migrated carefully.

### Exported function reference code

`antokton-export/antokton-reference/functions/*/entry.ts` contains Base44/Deno function code. Examples include:

- `createCheckout`
- `createPremiumCheckout`
- `createFeaturedCheckout`
- `createSubscriptionCheckout`
- `stripeWebhook`
- `premiumWebhook`
- `featuredWebhook`
- `subscriptionWebhook`
- `generateCV`
- `generateCoverLetter`
- `generateProfileSuggestions`
- `rankApplications`
- `importJobPost`
- `importMarketplacePost`
- `notifyApprovalEmail`
- `syncGoogleCalendar`
- `publishToFacebook`

These should be ported to the local Node backend or a future worker layer before production.

### Archived/ejected copy

`antokton-design-import-archive-20260508-153758` still contains:

- `@base44/sdk`
- `@base44/vite-plugin`
- Base44 Vite config
- Base44 SDK client imports

This folder should be treated as archive/reference, not as the active app.

## Compatibility Layers

Keep these for now:

- `antokton-export/src/api/antoktonClient.js`
- Base44-shaped backend API routes in `backend/server.js`
- `antokton-export/antokton-reference/entities`
- `entity_records` compatibility table in SQLite
- `backend/import-live-data.js` until data migration is complete

Why keep them:

- They prevent breaking the current exported frontend.
- They let the app run locally without Base44 packages.
- They provide a bridge for gradual migration to Antokton-native APIs.

## Safe Removals Later

These can be considered after the replacement path is tested:

1. Remove `@base44/sdk` and `@base44/vite-plugin` only from archived/reference copies if the archive is no longer needed.
2. Remove or archive `antokton-design-import-archive-20260508-153758` after confirming it is not needed for comparison.
3. Rename the exported `base44` compatibility object after feature modules are migrated to Antokton-native API names.
4. Remove `VITE_BASE44_*` fallback variables after `app-params.js` no longer needs them.
5. Move `antokton-export/antokton-reference/functions` to documentation/archive after every required function is ported.

## Risky Removals

Do not remove these yet:

- `antokton-export/src/api/antoktonClient.js`
- `base44.entities.*` calls in pages/components
- `backend/server.js` Base44-shaped routes
- `antokton-export/antokton-reference/entities`
- `entity_records`
- `backend/import-live-data.js` while import/migration is still needed

Removing them now would break current app workflows because many pages still depend on the compatibility shape.

## Recommended Replacement Direction

Replace Base44 dependency risk gradually:

1. Keep the compatibility client stable.
2. Add Antokton-native API modules beside it.
3. Move new features to Antokton-native modules first.
4. Migrate high-risk workflows:
   - auth
   - uploads
   - payments
   - admin permissions
   - messaging
   - applications
5. Once stable, rename/remove Base44 compatibility naming.
6. Keep rollback available until production deployment is proven.

## Current Risk Rating

- Build-time Base44 package dependency: low.
- Runtime naming compatibility risk: medium.
- Production security risk from dev auth and service-role-style frontend access: high.
- Data migration risk from schemaless SQLite compatibility storage: medium/high.
- Removing Base44 compatibility too early: high.
