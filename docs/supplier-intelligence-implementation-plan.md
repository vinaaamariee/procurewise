# ProcureWise Supplier Intelligence and Decision-Support Assessment

## Purpose

This assessment compares the requested supplier, pricing, delivery, forecasting, budget, canvass-reporting, and recommendation capabilities with the current ProcureWise implementation. It separates operational data capture from completed analytics or decision-support features so that future work does not overstate what the system can currently support.

> **Decision principle:** ProcureWise may calculate transparent, evidence-based recommendations, but a Procurement Officer and the Administrative Approver must retain accountable human review and decision authority. No recommendation engine should automatically award a supplier.

## Current capability assessment

| Requested capability | Current status | Current evidence | Gap to close |
|---|---|---|---|
| Supplier database | **Implemented** | Supplier master records include code, legal name, contact details, TIN, offerings, accreditation status, active state, and controlled goods/services tags. [1] | Add aggregated supplier history and a supplier profile view; the current registry is principally administrative. |
| Product catalog | **Implemented** | Managed catalog items support product code, description, unit, reference price, source metadata, active state, PPMP/PR links, code-family filters, and favorites. [1] | Add controlled catalog governance for price-history matching and an approved item-alias policy. |
| Price comparison dashboard | **Implemented for a package** | Pre-Canvass comparison displays supplier, quote total, delivery days, compliance, and the highlighted lowest compliant quote. [2] | Add cross-package item/supplier price trends, variance to estimate/budget, and line-item comparison where per-item evaluation is selected. |
| Historical price tracking | **Partially implemented** | Officers can record historical item prices, while the forecast view calculates average price, first-to-last trend, and a simple forecast from recorded observations. [3] | Link price history automatically to awarded and delivered item lines, retain source-document references, flag outliers, and prevent duplicate/manual mismatches. |
| Supplier performance ratings | **Partially implemented** | The Supplier Evaluation form stores 1–5 quality, delivery, pricing, and compliance scores with optional PO and remarks. [3] | Require evidence and a linked completed PO where applicable; aggregate scorecards by supplier, period, category, evaluator, and score dimension. |
| Delivery performance tracking | **Partially implemented** | Purchase Orders store scheduled delivery date; delivery receipts store actual delivery date and complete/partial status. [1] | Calculate on-time rate, days early/late, partial-delivery rate, unresolved receipt rate, and supplier/category/period views. |
| Procurement forecasting | **Partially implemented** | A HistoricalPrice trend chart and average-plus-trend forecast are available with no fabricated observations. [3] | Add minimum-data/confidence rules, fiscal-year filters, catalog linkage, budget impact, and documented forecast methodology. |
| Budget monitoring | **Implemented for current allotments and commitments** | Office/object/fiscal-year allotment, commitment, available-balance, PPMP plan-versus-actual, and PO budget checks are present. [1] | Add forward-looking committed-plus-forecast exposure, threshold alerts, and drill-down from budget balance to linked PPMP/PR/PO records. |
| Purchase recommendation engine | **Implemented at baseline** | Abstract generation selects the lowest compliant quote. A separate MCDM calculation uses fixed weights of 60% price, 20% delivery, and 20% compliance. [3] | Unify duplicate recommendation paths; make policy version, criteria, calculations, exclusions, and override rationale visible and auditable. |
| Automated canvass report generation | **Partially implemented** | Abstract packages can be exported as quote-inclusive CSV and PDF files. [2] | Generate a versioned report snapshot automatically when the Abstract is prepared; include score breakdown, item schedule, certification/signatures, and report history. |
| Best Value Recommendation Engine | **Partially implemented** | Current MCDM produces an explainable price/delivery/compliance score and recommended supplier. [3] | Add controlled policy weights, category applicability, historical price and delivery-performance inputs, conflict/exclusion rules, mandatory human approval, and an auditable override. |

## Key dependencies and control requirements

The requested dashboards and engines need trustworthy item-level evidence. Current Pre-Canvass and RFQ quote records hold package total, delivery days, compliance, and notes, but not a supplier quote per requested item. Therefore, a true **per-item** price comparison, item-level historical-price capture, or catalog-linked best-value analysis requires a non-destructive quote-line entity before those features can be considered complete. [1]

Historical data must remain sourced from authorized procurement records. The implementation must not seed ratings, delivery outcomes, prices, or recommendation history merely to populate charts. Where older paper records are later imported, each imported value should retain its source-document reference, import operator, and verification state.

| Control area | Required rule |
|---|---|
| Data ownership | Procurement Officers create comparison/report drafts; Administrative Approvers decide whether to approve, reject, or return an Abstract. |
| Policy governance | Only Admin may create or retire best-value policies; changing weights must create a new immutable policy version rather than alter a completed recommendation. |
| Recommendation guardrail | An engine may recommend and explain. It must not issue an award or Purchase Order automatically. |
| Override | Selecting a non-top recommendation requires a mandatory written rationale, named decision maker, timestamp, and audit entry. |
| Supplier scoring | Only authorized post-award users may enter evidence-backed performance scores; a related PO should be required for production rating use. |
| Visibility | End-Users see their own permitted package status. Supplier scoring, comparison diagnostics, policy weights, and organization-wide dashboards remain role-gated. |
| Data quality | Missing, non-compliant, stale, or unverified data is shown as unavailable—not replaced with assumed values or synthetic scores. |

## Phased implementation plan

### Phase 1 — Decision-data foundation

Introduce non-destructive data structures for quote line items, delivery-performance metrics, supplier-performance evidence, recommendation policies, policy versions, and recommendation snapshots. Migrate existing package-level quote data unchanged, while leaving line-level fields empty until authentic information is recorded or imported. Add indexes for supplier, catalog item, PO, fiscal year, and observation date.

The phase should also define the authoritative calculation glossary: planned versus actual amount, quote variance, on-time delivery, delivery lateness, supplier composite score, forecast confidence, and best-value score. The definitions must appear in the UI and exported reports.

**Acceptance criteria:** Existing workflows and official forms continue to work; migrations are reviewed and applied safely; package-level records remain readable; no real or test procurement data is fabricated; new services reject unauthorised actions and invalid policy totals.

### Phase 2 — Supplier and delivery intelligence dashboards

Build a role-gated Supplier Intelligence workspace. It should show a supplier profile with accreditation, tags, awarded value, quote participation, win rate, evaluation averages, completed/partial delivery rate, on-time rate, median days early/late, and evidence links. Add a Delivery Performance view that compares scheduled and actual delivery dates by supplier, procurement category, and period.

Supplier ratings should become evidence-backed: require a related completed PO for production scoring, capture evaluation date and source notes, and show score count and recency beside any average. Suppress averages when there are too few authorized observations, rather than presenting a misleading rating.

**Acceptance criteria:** Metrics reconcile to visible PO, delivery receipt, and evaluation records; filters apply consistently; role restrictions are exercised by tests; empty/no-history states are explicit and never simulated.

### Phase 3 — Price intelligence and budget-forward view

Add an Item Price Intelligence dashboard that compares current quotes against PPMP/PR estimate, approved budget ceiling, catalog reference price, past awarded price, and recent delivered price. It should show per-item quote dispersion, supplier-specific price history, source record links, and configurable outlier warnings.

Extend budget monitoring with projected exposure: current committed amount plus approved-but-not-issued commitments and supported price forecasts. This is planning support only; existing PO budget validation remains the authoritative gate.

**Acceptance criteria:** Each figure links to an authorized source record; forecast screens disclose calculation basis and observation count; price variance cannot replace the existing budget-control decision; tests cover missing history, mixed units, and permitted roles.

### Phase 4 — Governed Best Value Recommendation Engine

Replace the fixed MCDM calculation with a versioned, category-aware recommendation policy. A policy should define eligible criteria, weights that total 100%, scoring transforms, exclusion rules, minimum evidence, and effective dates. Initial criteria may include quoted price, delivery commitment, compliance, verified delivery performance, verified quality score, and historical-price reasonableness.

For each Abstract, calculate a snapshot that lists every eligible supplier, all input values, excluded suppliers and reasons, normalized criterion scores, applied policy version, top recommendation, and confidence/data-completeness notice. Keep the current lowest-compliant result as a transparent fallback when reliable performance or history data is unavailable. The Procurement Officer may generate the recommendation; the Administrative Approver still makes the final decision. A non-top selection requires an override reason.

**Acceptance criteria:** The same input/policy produces the same score; weights, exclusions, and overrides are visible in PDF/CSV exports; policy edits do not rewrite prior snapshots; every decision is audit-trailed; no automatic PO or award is created.

### Phase 5 — Automated canvass-report package and rollout

Generate a frozen canvass report snapshot when an Abstract is prepared or regenerated by an authorized Procurement Officer. The package should contain the official Abstract form, supplier quotation comparison, item schedule, policy scorecard where available, recommendation/override rationale, source-document register, and report version/date. Permit CSV/PDF download and preserve prior versions when a returned package is corrected and resubmitted.

Roll out by enabling the advanced scorecard only after enough verified historical data exists. Begin with the existing lowest-compliant recommendation, then introduce delivery and supplier-performance criteria per approved policy. Train Procurement Officers and Approvers on inputs, exceptions, and override rationale before activating any higher-impact policy.

**Acceptance criteria:** Reports are reproducible from stored snapshot data; historical report versions remain available; corrected packages produce a new version without losing prior audit evidence; a live authorized record validates download and review behavior.

## Recommended delivery order

| Priority | Workstream | Why it comes first |
|---|---|---|
| 1 | Phase 1 decision-data foundation | Item-level quotes, verifiable delivery evidence, and policy versioning are prerequisites for trustworthy analytics and scoring. |
| 2 | Phase 2 supplier and delivery intelligence | Converts existing captured operational records into defensible performance evidence. |
| 3 | Phase 3 price intelligence and budget-forward view | Makes price history and future budget exposure usable before they influence recommendations. |
| 4 | Phase 4 governed Best Value Engine | Uses mature, explainable inputs while preserving accountable human approval. |
| 5 | Phase 5 automated canvass reports and rollout | Freezes and communicates the final, auditable recommendation package. |

## Decisions required before implementation

The following institutional decisions are required before the advanced phases are enabled:

1. Approve the initial best-value criteria, category-specific weights, and the minimum verified-history threshold.
2. Confirm who may create supplier evaluations, whether an evaluation requires a closed PMR, and the evidence standard for each score.
3. Confirm whether older procurement records will be imported, which records are authoritative, and who verifies imported values.
4. Confirm the official signature/certification wording for a scorecard-enhanced Abstract package.

## References

[1] [ProcureWise PostgreSQL schema](../drizzle/schema.ts)

[2] [Pre-Canvass and execution workspaces](../client/src/pages/WorkflowPages.tsx)

[3] [Procurement services and decision-support calculations](../server/db.ts)
