# Authorized Test-Only PPMP-to-Abstract Verification

> **Status:** Completed. This document records a user-authorized, clearly labelled **non-operational** workflow test. The records must not be used for an actual procurement, approval, obligation, delivery, or payment.

## Test Boundaries

The verification package uses a dedicated office, expenditure object, budget allotment, End-User actor, Procurement Officer actor, and three dedicated suppliers. Each has a visible `TEST ONLY` identifier. The test budget is **₱10,000.00**, reset solely for the non-operational verification package, and the test Purchase Request uses the fund source `TEST ONLY — Not for obligation`.

| Record | Identifier | Verified state |
|---|---|---|
| PPMP entry | ID 1 | Linked to the test Purchase Request and common-use catalog item |
| Purchase Request | `PR-2026-2721129` | `procurement_review` |
| Pre-Canvass | `PC-2026-2721324` | `abstracted` with three quotations |
| Abstract of Canvass | `AOC-2026-2804717` | `recommended` |

## Catalog and Quotation Evidence

The linked request item retained its catalog reference throughout the test flow. The item was **AIR FRESHENER** with product code `47131812-AF-A01`, quantity **2 Can**, and estimated unit cost **₱128.09**.

| Supplier | Quotation ref. | Total price | Delivery days | Compliant | Result |
|---|---:|---:|---:|---:|---|
| TEST ONLY — Supplier C | `TEST-Q-C` | ₱251.06 | 5 | No | Excluded from recommendation despite lowest price |
| TEST ONLY — Supplier B | `TEST-Q-B` | ₱256.18 | 6 | Yes | Recommended lowest compliant supplier |
| TEST ONLY — Supplier A | `TEST-Q-A` | ₱268.99 | 7 | Yes | Higher compliant quotation |

## Workflow Evidence

The application services successfully created the PPMP entry, created a PPMP-linked Purchase Request, added three supplier quotations, submitted the Pre-Canvass, forwarded the Purchase Request to Procurement review, and generated the Abstract. The Abstract correctly selected `TEST-SUP-B` as the lowest compliant supplier, rather than selecting the lower-priced non-compliant quotation.

The run also exposed a missing live-database `openingDate` column in `abstracts_of_canvass`. The column was restored non-destructively to match the existing schema and migration, and the test Abstract was then generated successfully with opening date **2026-08-21 14:33:24**.

## Audit Evidence

The test produced audit entries for PPMP creation, Purchase Request creation and procurement-review handoff, Pre-Canvass creation, three quotation additions, Pre-Canvass submission, and Abstract recommendation. Automated regression and type validation completed after the verification with **55 passing tests** and no TypeScript errors.
