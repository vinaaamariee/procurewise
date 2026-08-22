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

## Vercel authentication deployment

ProcureWise currently uses an OAuth flow that starts in the browser and completes at the server route below:

```text
https://YOUR-VERCEL-DOMAIN/api/oauth/callback
```

The application derives this URL from `window.location.origin`; it must not be hardcoded in source code. When the Vercel domain, custom domain, or preview domain changes, the OAuth provider must recognize the corresponding callback URL before sign-in can succeed.

### Required configuration

| Setting | Where to configure it | Classification |
|---|---|---|
| `VITE_APP_ID` | Vercel environment variables and the OAuth application configuration | Browser-visible identifier |
| `VITE_OAUTH_PORTAL_URL` | Vercel environment variables | Browser-visible provider URL |
| `OAUTH_SERVER_URL` | Vercel environment variables | Server configuration |
| `JWT_SECRET` | Vercel environment variables | **Secret**; use a long, unique random value |
| `https://YOUR-VERCEL-DOMAIN/api/oauth/callback` | OAuth provider’s allowed redirect/callback URL list | Required redirect URL |

Complete the setup in this order:

1. Choose a stable production domain, preferably a custom Batanes State College domain rather than a changing preview URL.
2. Add the four variables above in **Vercel → Project Settings → Environment Variables**. Set `JWT_SECRET` as sensitive and never use a `VITE_` prefix for it. Vercel applies variable changes only to new deployments, so redeploy afterwards.[1]
3. In the OAuth provider or application administration console, register the exact callback URL shown above. The scheme, host, and path must match the deployed domain exactly.
4. Complete a browser sign-in from `/access`, return through `/api/oauth/callback`, and verify that the authenticated dashboard loads and the session survives a page refresh.
5. Confirm sign-out clears the session, and confirm that an End-User can access only records permitted by the server-side role rules.

> **Important:** The current OAuth integration is provider-specific. If the provider cannot register your Vercel or custom-domain callback URL, environment variables alone cannot make external sign-in work. In that case, migrate the application to an OAuth provider you control, such as Supabase Auth or an institutional identity provider, before publishing production access.

The login flow creates a one-time state nonce in a secure cookie and validates it in the callback. Do not replace the dynamic callback mechanism, remove the nonce check, or call the login initializer during React rendering. These protections prevent OAuth state mismatch and session-fixation failures.

Vercel deployment must be HTTPS. The OAuth state cookie and signed session cookie use secure cookie settings. Users who block all cookies, or use browser privacy modes that prevent them, may be unable to complete sign-in.

### Preview deployments

Treat pull-request preview URLs as non-production. They often have a different origin from the production domain and therefore require a separately allowlisted callback URL. Do not weaken the callback check or add broad redirect wildcards solely to make preview login work. Prefer production-domain authentication testing unless the OAuth provider supports a carefully constrained preview-domain allowlist.

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
