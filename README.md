# ProcureWise

> A role-gated procurement management system for **Batanes State College**. ProcureWise supports the planned-procurement-to-close-out process through PPMP, Purchase Request, three-supplier Pre-Canvass, Abstract of Canvass, administrative approval, Purchase Order, delivery, and PMR recording.

ProcureWise is designed as an internal operational system. It presents a flat interface with Batanes State College branding, preserves recorded values rather than filling unavailable fields, and enforces workflow actions through server-side role checks.

## What the system covers

| Area | Included capability |
|---|---|
| Planning | APP/PPMP entries, office and expenditure references, budget monitoring, catalog selection, and PPMP supporting documents |
| Requesting | Itemized Purchase Requests, PPMP links, budget validation, routing, and public tracking tokens |
| Canvassing | Supplier registry, goods-and-services tags, three-supplier Pre-Canvass quotes, compliance flags, and lowest-compliant comparison |
| Approval and execution | Abstract recommendation, correction/resubmission workflow, administrative decision, Purchase Order issue, delivery, and PMR logging |
| Reporting and records | Official-form PDF exports, PPMP and Abstract package CSV/PDF downloads, audit events, workflow notifications, forecasting, notices, and BAC transmittals |
| Operations | Supabase PostgreSQL, Drizzle ORM, Supabase Realtime invalidation signals, role-aware dashboards, and test-record archival safeguards |

## Workflow

| Stage | Responsible role | Result |
|---|---|---|
| PPMP and Purchase Request | End-User | A planned procurement and itemized request are recorded. |
| Pre-Canvass | End-User | Three supplier quotations are captured and forwarded for review. |
| Abstract of Canvass | Procurement Officer | The lowest compliant supplier is recommended from the recorded quotes. |
| Administrative decision | Administrative Approver | The Abstract is approved, rejected, or returned with mandatory correction comments. |
| Purchase Order to PMR | Procurement Officer | A Purchase Order is issued, delivery is recorded, and the PMR closes the package. |

## Architecture

```text
React 19 + Vite + Tailwind CSS
            │
            ├── tRPC client / React Query
            │
Express 4 + tRPC 11 server
            ├── Drizzle ORM + PostgreSQL driver
            ├── Supabase PostgreSQL
            ├── Supabase Realtime broadcast signals
            └── S3-backed document metadata and storage integration
```

The browser never receives the Supabase service-role key or database credentials. Pre-Canvass and Abstract workflow mutations publish a minimal record-change signal from the server, and browser clients use that signal only to invalidate their authorized tRPC dashboard data. Transaction rows continue to be obtained through the role-gated tRPC API.

## Technology

| Layer | Primary technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Radix UI, Wouter |
| Backend | Express 4, tRPC 11, Zod |
| Data | PostgreSQL on Supabase, Drizzle ORM, `pg` |
| Documents and visualizations | jsPDF, Recharts |
| Testing | Vitest, TypeScript compiler checks |

## Repository layout

```text
client/                 React application and UI components
server/                 Express, tRPC routers, data services, and tests
drizzle/                PostgreSQL schema and Drizzle migrations
shared/                 Workflow rules and shared types
storage/                Managed document-storage helpers
```

## Local development

Install **Node.js 22+** and **pnpm 10+**, then install dependencies:

```bash
pnpm install
```

Provide the required variables through your local shell or an untracked local environment-file workflow, then start the application:

```bash
pnpm dev
```

The development server selects an available port beginning at `3000`.

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the development server with file watching. |
| `pnpm test` | Run the Vitest regression suite. |
| `pnpm check` | Run TypeScript validation without emitting files. |
| `pnpm build` | Build the Vite frontend and Node server bundle. |
| `pnpm start` | Run the built Node server. |
| `pnpm db:push` | Generate and apply Drizzle PostgreSQL migrations. Review schema changes before using this command against a shared database. |

## Environment variables

Create local configuration outside Git and configure the same values in your deployment platform. The repository ignores `.env`, `.env.local`, and environment-specific dotenv files by design.

| Variable | Used by | Classification |
|---|---|---|
| `DATABASE_URL` | Application PostgreSQL connection at runtime | **Secret** |
| `SUPABASE_DATABASE_URL` | Vercel serverless PostgreSQL connection at runtime | **Secret** |
| `SUPABASE_DB_PASSWORD` | Drizzle migration configuration | **Secret** |
| `VITE_SUPABASE_URL` | Supabase project URL used by the server to provide browser-safe Realtime configuration | Browser-safe |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe Supabase Realtime credential | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Realtime broadcast publication | **Secret** |
| `JWT_SECRET` | Server-side session signing | **Secret** |
| OAuth variables | Authentication integration, if enabled | Treat client-secret values as **Secret** |

> **Security rule:** Never expose `DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, OAuth secrets, or any private API key through a `VITE_` variable. Variables beginning with `VITE_` are intended for browser-visible configuration.

For Vercel, add variables in **Project Settings → Environment Variables**, scope them to the required environments, mark secrets as sensitive, and redeploy after updating them. Environment-variable updates apply only to new deployments.[1]

## Supabase and Drizzle

ProcureWise uses the active PostgreSQL schema in `drizzle/schema.ts` and PostgreSQL migration configuration in `drizzle.config.ts`. Run migrations only with an authorized Supabase credential and review generated SQL before applying schema changes to a shared production database.

The application uses Supabase Realtime **Broadcast** messages instead of direct browser table subscriptions. This keeps procurement data behind existing role-gated procedures while letting subscribed screens refresh after a relevant workflow change. Supabase documents Broadcast as a low-latency channel for sending messages between clients and servers.[2]

## External hosting note

This repository runs a Node/Express server in addition to its Vite frontend. A deployment must support the server process and `/api/trpc` routes; a static-only deployment will not support authentication, role-gated data, uploads, workflow mutations, or server-originated Realtime broadcasts.

The project also contains integrations originally supplied by its managed development environment, including authentication and document storage helpers. When moving to an external provider, verify each integration has an equivalent external configuration before treating the deployment as production-ready.

## Vercel and Supabase Auth deployment

The repository includes `vercel.json` and a committed `api/index.mjs` Express/tRPC function bundle for Vercel. The bundle is generated from `server/vercelApiEntrypoint.ts` by `pnpm build:vercel-api` during every production build. Vercel serves the Vite production output from `dist/public` and routes `/api/*` requests to the Express/tRPC function. Do not remove the `/api/*` rewrite; it is required for protected workflow actions. The standalone bundle avoids runtime resolution of the TypeScript source-module graph inside Vercel’s Node function loader.

ProcureWise uses **Supabase Auth** for the browser session. The browser sends its short-lived Supabase access token to the protected tRPC procedures, where the server verifies it before resolving the corresponding ProcureWise user and role. When a verified Supabase email matches an existing ProcureWise user, the system updates that existing identity record while preserving its internal user ID, assigned role, and linked procurement records.

### Required Vercel variables

| Setting | Where to configure it | Classification |
|---|---|---|
| `SUPABASE_DB_PASSWORD` | Vercel environment variables | **Secret** |
| `SUPABASE_DATABASE_URL` | Vercel environment variables | **Secret**; use the active Supabase project and port 6543 |
| `VITE_SUPABASE_URL` | Vercel environment variables | Browser-visible project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel environment variables | Browser-visible publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel environment variables | **Secret**; server verification and Realtime broadcasts |
| `OWNER_OPEN_ID` | Vercel environment variables | **Secret**; retain only if owner migration behavior is needed |
| `OWNER_NAME` | Vercel environment variables | Non-secret owner display value |

Do **not** add Manus-only values such as `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_KEY`, or `BUILT_IN_FORGE_API_URL` to Vercel.

### Production database connection string

For Vercel serverless functions, prefer Supabase’s transaction pooler on port `6543`. The connection must target the same Supabase project as `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Use this structure, replacing only the password:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&options=-c%20search_path%3Dprocurewise%2Cpublic
```

The `options` parameter is URL-encoded intentionally. It selects the isolated `procurewise` schema before ordinary unqualified queries run. ProcureWise also binds its Drizzle tables explicitly to that schema, so both connection-level and ORM-level protection are present. Never commit the completed URL or paste its password into an issue, chat, screenshot, or repository.

### Supabase Auth setup and verification

1. In **Supabase Dashboard → Authentication → Providers**, enable **Email** authentication and configure its email-confirmation policy for your institution.
2. In **Authentication → URL Configuration**, set the Site URL to the stable Vercel production domain and add `https://YOUR-VERCEL-DOMAIN/access` as an allowed redirect URL. Add a custom domain only after it is active.
3. Add the Vercel variables above for Production and Preview. Vercel applies variable changes only to new deployments, so redeploy after changes.[1]
4. Create or sign in through `/access` using a verified work email. Confirm that a new user receives the End-User role and that an existing user with the same email retains its assigned Procurement Officer, Administrative Approver, or Admin role.
5. Confirm sign-out removes the client session and that protected routes reject requests without a valid Supabase access token.

> **Preview deployment note:** Preview URLs are separate origins. Do not use broad redirect wildcards for production access; add only the specific preview address required for controlled testing, then remove it when testing is complete.

### Authentication troubleshooting

If the Access page reports that Supabase sign-in succeeded but the workspace profile could not load, authentication has completed and the failure is in the server-side profile bridge. Confirm that the deployed function has `SUPABASE_DATABASE_URL`, `VITE_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` for the same Supabase project, then create a new deployment; Vercel does not apply changed variables to an existing deployment. Confirm that the authenticated email has a corresponding row in `procurewise.users`, or allow the server bridge to provision it automatically. The server emits redacted diagnostic messages for missing configuration, missing bearer tokens, rejected tokens, and database/profile errors; it never logs passwords or secret key values.

If the browser reports `Failed to fetch`, first verify connectivity to the Supabase project URL and that the URL is reachable from the deployed origin. The Access form includes a show/hide password control; this only changes local display and never sends or stores the password outside Supabase Auth.

## GitHub Actions continuous integration

The repository includes `.github/workflows/ci.yml`. It runs TypeScript validation and the offline unit regression suite on every push, pull request, and manually dispatched workflow. A second job runs the Supabase connection and Realtime integration tests on pushes when its repository secrets are configured.

Add the following **GitHub repository secrets** in **Settings → Secrets and variables → Actions** before expecting the integration job to run:

| GitHub Actions secret | Passed to the test runner as | Purpose |
|---|---|---|
| `CI_DATABASE_URL` | `DATABASE_URL` | PostgreSQL connection for integration tests |
| `CI_SUPABASE_DB_PASSWORD` | `SUPABASE_DB_PASSWORD` | Drizzle/Supabase migration configuration |
| `CI_SUPABASE_URL` | `VITE_SUPABASE_URL` | Supabase project endpoint |
| `CI_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | Browser-safe Realtime integration credential |
| `CI_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | Server-side Realtime broadcast validation |

Use a dedicated non-production Supabase project for these CI secrets whenever possible. The full integration suite validates a known non-operational PPMP-to-Abstract package and opens a temporary Realtime broadcast channel. Never print secret values in workflow output, and never use `pull_request_target` to run untrusted pull-request code with secrets. GitHub does not provide repository secrets to workflows triggered from forks.[3]

The CI workflow intentionally skips the integration job with a visible notice when any `CI_*` secret is absent; the TypeScript and offline regression job still runs. Once all five CI secrets are configured, the integration job runs automatically on every push.

## Verification

Before opening a pull request or deploying, run:

```bash
pnpm test
pnpm check
pnpm build
```

Avoid creating fabricated procurement transactions merely to test a deployment. Use authorized records or clearly isolated non-operational test packages governed by the application's test-record safeguards.

## Contributing

Keep workflow permissions server-enforced, preserve official-form structures, avoid adding fabricated supplier reviews or procurement data, and keep all credentials out of commits. Use a branch and pull request for changes that affect schema, authentication, workflow rules, or external integrations.

## License

This repository is published under the **MIT** license, as declared in `package.json`. Confirm Batanes State College governance, data-protection, and procurement-policy requirements before operating the system with production records.

## References

[1] [Vercel, “Environment variables”](https://vercel.com/docs/environment-variables)

[2] [Supabase, “Realtime Broadcast”](https://supabase.com/docs/guides/realtime/broadcast)

[3] [GitHub Docs, “Using secrets in GitHub Actions”](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
