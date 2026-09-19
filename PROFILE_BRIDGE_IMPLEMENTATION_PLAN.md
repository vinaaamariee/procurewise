# ProcureWise Profile-Bridge Fix Implementation Plan

**Date:** September 19, 2026  
**Target:** Production Vercel deployment connected to the active Supabase project

## Problem statement

Supabase Auth accepts the user’s credentials, but the ProcureWise server cannot load the internal workspace profile. The failure occurs after authentication, while the server verifies the bearer token, connects to PostgreSQL, and maps the Supabase identity to `procurewise.users`.

## Root-cause checks

The production deployment must be checked for four conditions:

1. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DATABASE_URL` all target the same Supabase project.
2. `SUPABASE_DATABASE_URL` uses the transaction pooler on port `6543` and selects `procurewise,public`.
3. The `procurewise` schema and `procurewise.users` table exist in that database.
4. The authenticated email either matches an existing profile or can be provisioned by the server bridge.

## Implementation already applied locally

The profile bridge now trims and lowercases the verified Supabase email before matching or saving it. Existing profiles are still matched by `openId` first, then by normalized email. Existing internal user IDs and assigned roles remain unchanged. A focused regression assertion covers this behavior.

This change does not expose secrets, change permissions, or alter the official forms.

## Production execution sequence

### Phase 1 — Confirm Vercel variables

In **Vercel → ProcureWise → Settings → Environment Variables**, verify the Production values:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DATABASE_URL
```

The variables must reference the active project `tfswokhkuxwvpcpxekso`, not the older project. Do not paste secret values into source control, screenshots, or chat.

The database URL must follow this shape:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&options=-c%20search_path%3Dprocurewise%2Cpublic
```

### Phase 2 — Verify the database from Supabase SQL Editor

Run this read-only query:

```sql
select
  current_database(),
  current_user,
  to_regclass('procurewise.users') as users_table,
  to_regclass('procurewise.purchase_requests') as purchase_requests_table;
```

Both table fields must be non-null.

Then verify the sign-in profile:

```sql
select id, "openId", name, email, role, "loginMethod"
from procurewise.users
where lower(trim(email)) = lower(trim('THE_SIGN_IN_EMAIL'));
```

If the row is missing, copy the Auth UID from **Supabase → Authentication → Users** and create an End-User profile only for that exact test account:

```sql
insert into procurewise.users
  ("openId", name, email, "loginMethod", role)
values
  ('SUPABASE_AUTH_UID', 'Demo End-User', 'THE_SIGN_IN_EMAIL', 'supabase', 'end_user');
```

### Phase 3 — Redeploy

Create a new Vercel deployment from the branch containing the local changes. Environment-variable changes do not affect an existing deployment. Do not validate against an old preview URL.

### Phase 4 — Live verification

Use a clean private browser window and test:

1. Open `/access`.
2. Sign in with the exact account whose profile was checked.
3. Confirm the redirect reaches `/dashboard`.
4. Confirm the dashboard displays the correct role.
5. Confirm an End-User can open Catalog and create a sample Purchase Request.
6. Sign out and confirm protected pages no longer load as an authenticated user.

### Phase 5 — Regression and defense readiness

Run the deterministic checks locally:

```text
pnpm check
pnpm build
```

Run live Supabase PostgreSQL and Realtime tests only from an environment with valid network access and dedicated CI secrets. Sandbox failures caused by unavailable Supabase connectivity must be recorded separately from application failures.

## Acceptance criteria

The fix is complete when:

- A verified Supabase sign-in reaches `/dashboard`.
- The internal profile preserves the correct user ID and role.
- A missing profile is provisioned as `end_user` rather than causing a workspace error.
- The database resolves `procurewise.users` in production.
- Catalog-to-PR handoff works with a demonstration account.
- TypeScript and production build checks pass.
- The exact deployed commit and environment target are recorded for the defense.

## Rollback

If the new deployment fails, redeploy the last known-good deployment. The local normalization change is low-risk and does not modify data or schema. Do not delete Auth users or database profiles during troubleshooting; first capture the exact email, Auth UID, database project, and deployment commit.

## Ownership boundary

The code-side change and local validation can be completed in the repository. Vercel environment inspection, production redeployment, and Supabase SQL execution require access to the user’s accounts. Those steps must be performed in the authenticated dashboards or by enabling the corresponding connectors.

## Defense schedule

- **September 19–20:** complete production configuration and live sign-in verification.
- **September 21:** present the stable workflow to end users and collect feedback.
- **September 22–24:** implement Blocking and High-priority feedback.
- **September 25:** freeze non-critical feature requests.
- **September 26–28:** run full acceptance and capture defense evidence.
- **September 29:** present the frozen build.
