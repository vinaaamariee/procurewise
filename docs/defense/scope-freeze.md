# Procwise Defense Scope Freeze

**Frozen on:** September 21, 2026  
**Defense date:** September 29, 2026  
**Primary goal:** Demonstrate an explainable, human-controlled procurement recommendation with an auditable final decision.

---

## Scenario

### Purchase Request

| Field | Value |
|---|---|
| Request ID | REQ-2026-0929 |
| Title | Ergonomic office chair procurement |
| Department | Operations |
| Category | Workplace equipment |
| Quantity | 40 |
| Budget | £12,000 GBP |
| Required by | 2026-10-30 |
| Data classification | **Synthetic demo data** |
| Initial status | review |
| Initial risk | medium |

### Supplier Quotations

| Supplier | Quote ID | Total | Delivery | Warranty | Compliance |
|---|---|---|---|---|---|
| Supplier A | Q-A-001 | £11,600 | 21 days | 3 years | Complete |
| Supplier B | Q-B-001 | £10,880 | 14 days | 5 years | Complete |
| Supplier C | Q-C-001 | £9,920 | 18 days | 2 years | **Missing required supplier due-diligence evidence** |

### Decision Rules

**Weights:**

| Factor | Weight |
|---|---|
| Price | 40% |
| Compliance | 25% |
| Delivery | 20% |
| Warranty & service | 15% |

**Rule:** A missing mandatory supplier due-diligence requirement makes a quote ineligible for automatic recommendation, even if the total weighted score would otherwise be competitive.

**Expected recommendation:** Supplier B  
**Savings vs Supplier A:** £720 (~6.2%)  
**Supplier C:** Cheapest but ineligible — missing mandatory evidence

**Expected normalized scores (for Day 2 verification):**

| Supplier | Score | Note |
|---|---|---|
| Supplier A | 81.5 | Eligible |
| Supplier B | 96.5 | **Recommended** |
| Supplier C | 61.6 | Ineligible — missing evidence |

> These values are stored in test/demo-metadata only. Presentation components derive them through the scoring function.

---

## Route Map

| Route | Purpose | Day 1 behavior | Final defense behavior |
|---|---|---|---|
| `/demo` | Stable entry | ✅ Complete | Entry and reset |
| `/demo/overview` | Summary | ✅ Shell + seeded request + metrics | Metrics, prioritized request, activity |
| `/demo/requests` | Request list | ✅ Shell + seeded table row | Search and filters |
| `/demo/requests/:id` | Request detail | ✅ Route shell | Comparison and recommendation |
| `/demo/approvals` | Decision queue | ✅ Route shell | Pending and completed decisions |
| `/demo/audit` | Event history | ✅ Route shell | Persistent human/system events |
| `/demo/validation` | Evaluation evidence | ✅ Honest placeholder | Measured test results |
| `/demo/governance` | AI and security controls | ✅ Implemented/planned outline | Complete defense explanation |
| `/demo/ui-kit` | Internal visual QA | ✅ Complete | Optional internal route (not in nav) |

> **Route prefix:** All defense routes use `/demo/` prefix. The existing app at `/dashboard` and other routes is not modified.

---

## Definition of Done

### Day 1 is done only when

- [x] The existing application still builds.
- [x] The defense scope and feature audit are saved in the repository.
- [x] The defense route structure exists.
- [x] The demo entry opens the defense shell.
- [x] A visible **Synthetic demo data** label appears on every defense route.
- [x] Shared flat-UI tokens control color, type, spacing, borders, radius, focus, and status styling.
- [x] Core reusable components expose all required states.
- [x] The seeded request can be loaded through a repository or service interface.
- [x] At least the Overview route displays the seeded request or an honest foundation view.
- [x] There are no gradients, background videos, glass effects, or large shadows on defense routes.
- [x] Keyboard focus is visible.
- [x] No route presents an inactive control as if it were functional.
- [x] Type check, lint, tests, and production build pass, or pre-existing failures are precisely documented.
- [x] No new console error appears on the defense path.

### Final defense is done only when

- [ ] The complete scenario works after a clean reset.
- [ ] The recommendation is deterministic and explainable.
- [ ] Every decisive factor has a visible source.
- [ ] A human can approve, modify, reject, or request evidence.
- [ ] Every final action creates a persistent audit event.
- [ ] AI failure does not block the recommendation.
- [ ] Synthetic, simulated, implemented, and planned states are labeled.
- [ ] Validation claims are traceable to test records.
- [ ] The demo passes three consecutive rehearsals.
- [ ] A hosted build and at least one offline fallback are verified.
