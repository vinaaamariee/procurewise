# Day 1 Feature Audit

**Audited:** September 21, 2026  
**Defense date:** September 29, 2026

## Audit Matrix

| Requirement | Status | Evidence/path | Required change | Priority | Estimate (h) | Dependency | Assigned day |
|---|---|---|---|---:|---:|---|---|
| **Entry** — Stable demo entry (no fragile login) | 🔴 Absent | No `/demo` route exists | Create `/demo` entry page with no auth requirement | P0 | 1.5 | None | Day 1 |
| **Entry** — One-click reset to initial scenario | 🔴 Absent | No reset mechanism | Implement `reset()` at repository level; wire button Day 4 | P0 | 0.5 | Seed repo | Day 1 (repo only) |
| **Navigation** — Overview, Requests, Detail, Approvals, Audit, Validation, Governance | 🔴 Absent | Existing nav is procurement-workspace nav; no defense shell | Create defense layout with 6-item nav | P0 | 2 | Demo layout | Day 1 |
| **Overview** — Summary metrics and prioritized request | 🔴 Absent | `/dashboard` shows existing PR dashboard (auth required) | Create `/demo/overview` with seeded metrics band | P0 | 1.5 | Seed data | Day 1 |
| **Requests** — Searchable filterable table | 🔴 Absent | `/purchase-requests` is auth-gated, real data | Create `/demo/requests` shell with seeded row | P0 | 1 | Seed data | Day 1 (shell) |
| **Detail** — Request metadata and business context | 🔴 Absent | No detail route for demo | Create `/demo/requests/:id` shell | P0 | 0.5 | Seed data | Day 1 (shell) |
| **Comparison** — Three-supplier comparison table | 🔴 Absent | No supplier comparison view exists | Build comparison table | P0 | 3 | Seed data, scoring | Day 2 |
| **Recommendation** — Weighted result + explanation | 🔴 Absent | No recommendation engine | Implement scoring function + explanation | P0 | 4 | Comparison | Day 2 |
| **Evidence** — Source references and missing-evidence state | 🔴 Absent | No evidence panel | Build evidence panel with missing state | P1 | 2 | Recommendation | Day 3 |
| **Governance** — Human approval/modification/rejection/evidence request | 🔴 Absent | No governance workflow in demo path | Build governance panel | P0 | 4 | Recommendation | Day 3 |
| **Audit** — Persistent human and system events | 🟡 Repairable | `/audit` exists but is auth-gated and shows real data | Create `/demo/audit` shell showing seeded events | P0 | 1 | Governance | Day 3 |
| **Resilience** — Loading, empty, error, success, AI-unavailable states | 🔴 Absent | No unified state components for defense path | Add to component library | P0 | 1 | UI components | Day 1 |
| **Honesty** — Synthetic/Prototype/Simulated/Planned labels | 🔴 Absent | No label mechanism in app | Implement `SyntheticDataLabel`, use on every route | P0 | 0.5 | None | Day 1 |
| **UI system** — Shared design tokens | 🟡 Repairable | Tailwind v4 custom properties exist but use BSC palette | Add `--pw-*` tokens alongside existing tokens | P0 | 1 | None | Day 1 |
| **UI system** — Core components (Button, Input, Badge, Alert, Panel, Table) | 🟡 Repairable | Radix primitives exist; need flat-UI variants/states | Extend/create components in defense path | P0 | 2.5 | Tokens | Day 1 |
| **Accessibility** — Keyboard navigation, focus, labels, contrast, zoom | 🟡 Repairable | Some a11y present; focus ring uses existing ring color | Apply `--pw-focus` ring, verify nav order | P0 | 1 | Components | Day 1 |
| **Release** — Hosted build, local fallback, recording | 🟡 Repairable | Vercel deployment configured; build passes | Verify after Day 1 changes | P1 | 0.5 | Build | Day 1 |

## Summary counts

| Classification | Count |
|---|---|
| 🟢 Working | 0 |
| 🟡 Repairable | 5 |
| 🔴 Absent | 12 |

## P0 items requiring Day 1 completion

1. Demo entry route `/demo` (Absent)
2. Defense navigation shell (Absent)
3. Overview with seeded metrics (Absent)
4. Request list shell (Absent)
5. Request detail shell (Absent)
6. Synthetic data label (Absent)
7. `--pw-*` design tokens (Repairable)
8. Core flat-UI components (Repairable)
9. Typed seed data + repository boundary (Absent)
10. Reset at repository level (Absent)
11. Route shells for Approvals, Audit, Validation, Governance (Absent)
12. Keyboard focus treatment (Repairable)
