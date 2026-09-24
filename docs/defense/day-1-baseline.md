# Day 1 Baseline

## Repository

- **Root:** `/Users/banangnang/Downloads/procurewise`
- **Framework:** React 19 + Vite 7 (Tailwind CSS v4 via `@tailwindcss/vite`)
- **Package manager:** pnpm 10
- **Router:** Wouter 3
- **Styling:** Tailwind CSS v4 (inline theme, CSS custom properties) + `tw-animate-css`
- **Component library:** Radix UI primitives (full suite via shadcn-style wiring)
- **State management:** TanStack Query v5 + tRPC v11
- **Backend:** Express + tRPC routers (`server/routers.ts`)
- **Database:** Supabase PostgreSQL via Drizzle ORM (`drizzle/schema.ts`)
- **Test runner:** Vitest 2
- **Build command:** `pnpm build`
- **Development command:** `pnpm dev`
- **Type check:** `pnpm check`
- **Lint/format:** `pnpm format` (Prettier only — no ESLint configured)
- **Existing deployment:** Vercel (`vercel.json`)
- **Authentication:** Supabase Auth (JWT via JWKS); required on all `/dashboard/*` routes via `DashboardLayout`
- **Git:** Clean working tree on `main`; latest commit `ada9bf9`

## Baseline commands

| Command | Result | Relevant output |
|---|---|---|
| `pnpm check` | ✅ Pass | No TypeScript errors |
| `pnpm test` | ⚠️ 10 failed / 85 passed | 10 failures are pre-existing DB-connected tests requiring live Supabase credentials; not caused by this task |
| `pnpm build` | Not yet run (run after Day 1 changes) | — |

## Existing routes

| Route | Purpose | Current state |
|---|---|---|
| `/` | Marketing landing page | Working |
| `/access` | Supabase Auth login/signup | Working |
| `/track` | Public PR tracking | Working |
| `/dashboard` | Procurement overview (authenticated) | Working — requires login |
| `/purchase-requests` | PR list and creation | Working — requires login |
| `/rfq` | Pre-canvass / RFQ workflow | Working — requires login |
| `/purchase-orders` | PO and PMR management | Working — requires login |
| `/documents` | File attachments | Working — requires login |
| `/notifications` | In-app notifications | Working — requires login |
| `/officer/notices` | Letters of notice | Working — requires login |
| `/officer/transmittals` | BAC transmittals | Working — requires login |
| `/officer/forecast` | Procurement forecast | Working — requires login |
| `/officer/settings` | Officer settings | Working — requires login |
| `/supplier-evaluations` | Supplier evaluation list | Working — requires login |
| `/supplier-evaluation-form` | Evaluation form | Working — requires login |
| `/plans` | PPMP planning | Working — requires login |
| `/catalog` | PhilGEPS catalog (242 items seeded) | Working — requires login |
| `/suppliers` | Supplier registry | Working — requires login |
| `/budgets` | Budget control | Working — requires login |
| `/analytics` | Analytics dashboard | Working — requires login |
| `/audit` | Audit trail | Working — requires login |
| `/setup` | System setup | Working — requires login |
| `/test-records` | Test record management | Working — requires login |
| `/best-value-policy` | Best-value policy settings | Working — requires login |
| `/print/*` | Print layouts | Working — requires login |

## Existing risks

| Risk | Evidence | Defense impact |
|---|---|---|
| All protected routes require Supabase login | `DashboardLayout` redirects to `/access` if no session | Defense demo cannot use existing shell without auth; **defense routes must be auth-free** |
| No demo/fixture data layer exists | No `src/features/demo` or equivalent | Supplier comparison and scenario are absent |
| Existing color palette is warm-red/brown (BSC branding) | `#7b1e1e` primary in CSS and components | Defense tokens must be layered without breaking existing routes |
| 10 pre-existing test failures | Supabase connection required at test time | Acceptable; must document and not worsen |
| Flat-panel class uses `shadow-[0_1px_0_...]` | `index.css` line 134 | Minor — acceptable existing shadow on existing routes only |
| Marketing landing uses `shadow-[14px_14px_0_...]` decorative card | `Landing.tsx` line 52 | Pre-existing; defense path will be separate |
