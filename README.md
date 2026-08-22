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
