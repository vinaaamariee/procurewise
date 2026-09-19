# Draft Initial Best Value Policy and Historic Record Import Specification

> **Draft — review before activation.** This is an internal control design, not formal legal advice or a substitute for Batanes State College procurement, legal, records-management, and approving-authority review. It is designed to support transparent value-for-money analysis while preserving the applicable Philippine procurement rules and accountable human approval. [1]

## 1. Initial Best Value Recommendation Policy

### 1.1 Policy purpose and boundary

The engine produces a transparent **recommendation**, not an award. A Procurement Officer may generate or regenerate a recommendation after the required canvass evidence exists. An Administrative Approver remains responsible for the documented approval, rejection, or return-for-correction decision. The engine must never create a Purchase Order or bind the College to a supplier automatically.

The initial policy must use only recorded, authorized data. When required evidence is missing, the engine must show the gap and apply its documented fallback calculation; it must never infer a supplier score or create a historical observation.

### 1.2 Eligibility gates — score only eligible quotations

A quotation is excluded before scoring if any required condition below is not met. The exclusion reason must appear in the recommendation snapshot and canvass report.

| Gate | Required evidence | Treatment if unmet |
|---|---|---|
| Supplier eligibility | Active supplier record and permitted accreditation status | Exclude from scoring. |
| Mandatory documents | Required supplier quotation, references, signatures/acknowledgement, and mode-specific documents | Exclude from scoring or return package for correction. |
| Technical/specification compliance | Every mandatory specification line is compliant | Exclude from scoring. |
| Budget ceiling | Quote is within the approved budget ceiling, unless a documented, authorized exception path exists | Flag and require manual disposition; do not silently recommend. |
| Conflict/blacklist/suspension | No recorded disqualifying procurement restriction | Exclude from scoring. |
| Complete price and delivery input | Numeric quote amount and delivery commitment are recorded | Exclude until corrected. |

> The existing `isCompliant` flag is a useful starting control but should be replaced by auditable compliance-checklist evidence before the enhanced policy is activated.

### 1.3 Recommended initial weights

The table below defines the proposed first controlled policy, **BSC-BV-2026-01**. It is appropriate only once quote-line, delivery, and evaluation evidence is available through the implementation foundation described in the supplier-intelligence plan.

| Criterion | Maximum points | Evidence | Scoring method |
|---|---:|---|---|
| Quoted price competitiveness | 55 | Eligible supplier quote lines and evaluated package total | Lowest eligible comparable price ÷ supplier comparable price × 55. |
| Delivery commitment | 15 | Quoted delivery days against the stated requirement | Fastest eligible commitment ÷ supplier commitment × 15; a commitment over the required maximum is excluded. |
| Historical price reasonableness | 10 | At least three verified comparable item observations from the last 36 months | Score based on variance to the verified comparable-price median; show the baseline and observation count. |
| Verified delivery performance | 10 | At least three verified completed deliveries in the relevant goods/service category from the last 36 months | Score using on-time completion rate, partial-delivery rate, and documented delivery exceptions. |
| Verified quality and contract performance | 10 | At least three evidence-backed post-award evaluations from the last 36 months | Use the verified average of quality, pricing, compliance, and documented performance dimensions. |
| **Total** | **100** |  |  |

The weights are intentionally price-led while reserving a limited, evidence-based portion for demonstrated delivery and quality. Mandatory compliance remains an **eligibility gate**, not discretionary points.

### 1.4 Evidence threshold and deterministic fallback

New suppliers and suppliers with limited verified history must not be penalized merely because the College has no prior records. The system therefore uses the following deterministic fallback modes and displays the applied mode prominently.

| Evidence available for the package | Applied criteria and weights | Display label |
|---|---|---|
| All evidence thresholds satisfied | Price 55; delivery commitment 15; historical price reasonableness 10; delivery performance 10; quality/performance 10 | **Enhanced Best Value** |
| No supplier-performance evidence, but verified historical-price baseline exists | Price 68.75; delivery commitment 18.75; historical price reasonableness 12.50 | **Price-history Best Value** |
| No verified historical-price or supplier-performance evidence | Price 78.57; delivery commitment 21.43 | **Comparable-quote Best Value** |
| No comparable eligible quote or incomplete mandatory evidence | No score | **Manual review required** |

The fallback weights are mathematically normalized from the initial policy’s applicable criteria. The report must state which inputs were unavailable, the number of verified observations, and that unavailable history did not count as a negative supplier score.

### 1.5 Ties, outliers, and override

If final scores tie within **0.50 points**, rank the supplier with the lower comparable quote total first. If price is also tied, rank the supplier with the shorter compliant delivery commitment first. If still tied, mark the result as an accountable Procurement Officer review rather than inventing another tie-breaker.

The system must flag but not automatically exclude a quote whose comparable price is materially lower or higher than the verified historic median. The officer must record whether the variance reflects a valid market change, quantity/quality difference, data mismatch, or a concern requiring clarification.

Selecting a supplier other than the top-ranked eligible recommendation requires an **override** with all fields below.

| Required override field | Rule |
|---|---|
| Recommendation snapshot ID and policy version | Stored immutably with the decision. |
| Selected supplier and rank | The selected supplier and engine rank must both be retained. |
| Written rationale | Mandatory, at least 20 meaningful characters, linked to allowed policy/record evidence. |
| Officer and Approver identities | Record preparation and decision roles separately. |
| Decision date/time and linked Abstract | Audit-trailed and exportable. |
| Supporting document references | Include clarification, technical review, or authorized exception evidence. |

### 1.6 Initial policy approval checklist

Before activation, Batanes State College should approve the policy name/version, weights, category definitions, evidence threshold, permitted exclusions, allowed override reasons, and report certification wording. Policy edits should create a new version with an effective date; prior recommendation snapshots must retain their original version and values.

## 2. Historic Authorized Record Import Format

### 2.1 Import method

Use a **multi-sheet Excel workbook** or a ZIP folder of UTF-8 CSV files. Do not merge all information into one flat table: suppliers, packages, quote lines, deliveries, and evaluations have one-to-many relationships. Every sheet uses a stable, user-assigned reference key so data can be validated before it is written to ProcureWise.

Do not include fabricated rows, placeholders, or estimated historical values. Blank optional fields remain blank; required fields that cannot be verified should be marked `needs_review` rather than guessed.

### 2.2 Universal formatting rules

| Field type | Required format |
|---|---|
| Text references | Stable uppercase identifier with no formulas, for example `HIST-2023-0001`; preserve leading zeroes as text. |
| Dates | ISO `YYYY-MM-DD`, for example `2024-06-30`. |
| Money | Decimal number without currency sign or thousands separators, for example `12500.00`. |
| Quantity | Decimal number using `.` as decimal separator, for example `12.50`. |
| Yes/no | `TRUE` or `FALSE`. |
| Scores | Whole number `1` to `5` only. |
| Status values | Use only the allowed values listed on the relevant sheet. |
| Empty values | Leave blank; do not use `N/A`, `-`, `unknown`, or zero as a substitute. |
| Source evidence | Preserve document number plus a stable local/archive locator or managed-storage URL where available. |

Each source row must include `verification_status` with one of `verified`, `needs_review`, or `rejected`. Only `verified` source data may feed historic price, delivery, or supplier-performance calculations.

### 2.3 Required workbook sheets

#### Sheet A — `suppliers`

One row per historic supplier. Use `supplier_ref` to connect the supplier to quotes, awards, deliveries, and evaluations.

```text
supplier_ref,supplier_code,company_name,tin,contact_person,email,phone,address,offerings,accreditation_status,is_active,source_document_ref,verification_status
```

`supplier_ref`, `company_name`, `accreditation_status`, and `verification_status` are required. Use a source document reference for any supplier identity or accreditation assertion. Do not overwrite a current supplier merely because the name is similar; duplicate matching must be reviewed by an authorized administrator.

#### Sheet B — `procurement_packages`

One row per authorized historic procurement package, award, or Purchase Order. `package_ref` is the primary link across the workbook.

```text
package_ref,pr_number,po_number,office_code,object_code,fiscal_year,purpose,fund_source,mode_of_procurement,approved_budget,award_total,pr_date,award_date,po_date,scheduled_delivery_date,package_status,source_document_ref,verification_status
```

Required fields are `package_ref`, `office_code`, `object_code`, `fiscal_year`, `purpose`, `package_status`, and `verification_status`. The allowed imported statuses are `awarded`, `delivered`, `closed`, `cancelled`, and `needs_review`. Importers must not convert a historic record into an active ProcureWise workflow state without explicit migration approval.

#### Sheet C — `package_items`

One row for each requested or awarded item in a package. This sheet is essential for price history and future item-level comparison.

```text
package_ref,line_no,catalog_product_code,item_description,specification,quantity,unit,estimated_unit_cost,awarded_unit_cost,awarded_line_total,source_document_ref,verification_status
```

Required fields are `package_ref`, `line_no`, `item_description`, `quantity`, `unit`, `source_document_ref`, and `verification_status`. Use `catalog_product_code` only when it is an exact, verified match; otherwise leave it blank and retain the source description. `awarded_line_total` must equal `quantity × awarded_unit_cost` within the approved rounding tolerance.

#### Sheet D — `supplier_quotes`

One row for each supplier’s package-level quotation. Quote references must be unique within a package.

```text
quote_ref,package_ref,supplier_ref,quote_number,quote_date,quoted_total,quoted_delivery_days,is_compliant,compliance_basis,required_documents_complete,source_document_ref,verification_status
```

Required fields are `quote_ref`, `package_ref`, `supplier_ref`, `quoted_total`, `is_compliant`, `source_document_ref`, and `verification_status`. `compliance_basis` should name the authentic checklist, committee finding, or document reference; it must not be a generic assertion.

#### Sheet E — `quote_lines`

One row for each supplier’s price for each requested item. This sheet enables valid per-item canvass comparison and historical-price matching.

```text
quote_ref,line_no,catalog_product_code,item_description,specification,quantity,unit,unit_price,line_total,meets_mandatory_specification,source_document_ref,verification_status
```

Required fields are `quote_ref`, `line_no`, `item_description`, `quantity`, `unit`, `unit_price`, `line_total`, `meets_mandatory_specification`, `source_document_ref`, and `verification_status`. `line_total` must reconcile to `quantity × unit_price` within rounding tolerance.

#### Sheet F — `awards`

One row per package award. It connects the approved supplier to the award evidence.

```text
package_ref,awarded_supplier_ref,award_reference,award_date,award_rationale,approved_by_name,source_document_ref,verification_status
```

Required fields are `package_ref`, `awarded_supplier_ref`, `award_date`, `award_rationale`, `source_document_ref`, and `verification_status`. The awarded supplier must exist in `supplier_quotes` for the same package unless the source evidence identifies an authorized exception.

#### Sheet G — `deliveries`

One row per receipt or delivery event. Use multiple rows when a historic package had partial deliveries.

```text
delivery_ref,package_ref,receipt_number,delivered_at,delivery_status,received_by_name,delivery_exception_reason,source_document_ref,verification_status
```

Required fields are `delivery_ref`, `package_ref`, `delivered_at`, `delivery_status`, `source_document_ref`, and `verification_status`. Allowed delivery statuses are `complete`, `partial`, `rejected`, and `cancelled`. `delivery_exception_reason` is required for `partial`, `rejected`, and `cancelled` statuses.

#### Sheet H — `supplier_evaluations`

One row per authorized, evidence-backed historic evaluation. Ratings without traceable supporting evidence can be imported for archival display as `needs_review`, but they must not feed supplier-performance scores.

```text
evaluation_ref,package_ref,supplier_ref,evaluated_at,quality_score,delivery_score,pricing_score,compliance_score,remarks,evidence_reference,source_document_ref,verification_status
```

Required fields are `evaluation_ref`, `package_ref`, `supplier_ref`, `evaluated_at`, all four score fields, `source_document_ref`, and `verification_status`. Scores must be integers from `1` to `5`. The supplier must match the awarded supplier for the package unless the evaluation expressly concerns a documented non-award interaction.

#### Sheet I — `source_documents`

One row per source document or authoritative archive reference. It makes imports reviewable without storing unverified file bytes in the database.

```text
source_document_ref,package_ref,document_type,document_number,document_date,archive_locator,content_hash_sha256,verified_by,verified_at,verification_status
```

Required fields are `source_document_ref`, `document_type`, `archive_locator`, `verification_status`. `archive_locator` may be an official repository URL, managed storage URL, records-office box/file reference, or digitization tracking ID. A SHA-256 hash is recommended for digitized files but may remain blank where the original paper record is held by the records office.

### 2.4 Preflight validation and import sequence

The import must use a staging process. No row should enter operational tables until a preflight report is reviewed and approved.

1. **Structure validation:** Confirm all required sheets, columns, enums, date formats, numeric formats, and reference keys.
2. **Referential validation:** Confirm every `supplier_ref`, `package_ref`, `quote_ref`, and `source_document_ref` resolves to a valid parent row.
3. **Arithmetic validation:** Reconcile item, quote, award, and package totals within a documented rounding tolerance.
4. **Evidence validation:** Reject or quarantine rows whose source document reference is missing or whose `verification_status` is not valid.
5. **Duplicate review:** Produce a report for possible supplier, PR, PO, quote, receipt, and document duplicates; an administrator decides whether each is a match, new record, or conflict.
6. **Dry run:** Create a non-writing validation report containing inserted, updated, skipped, quarantined, and conflict counts. Do not invent sample data to make the report appear populated.
7. **Approval gate:** An authorized Admin reviews the dry run and explicitly approves the named import batch.
8. **Commit and audit:** Import with a batch ID, immutable source references, operator, timestamp, mapping version, and post-import reconciliation report.

### 2.5 Data-quality thresholds for the engine

| Engine input | May be used only when |
|---|---|
| Historical price reasonableness | At least three verified, comparable observations exist; matching unit/category and adjusted quantity/specification are documented. |
| Delivery performance | At least three verified completed delivery records exist in the relevant category and period. |
| Quality/contract performance | At least three verified, evidence-backed evaluation records exist in the relevant category and period. |
| New supplier | No adverse score is inferred from lack of internal history; the fallback mode is disclosed. |
| Imported data with `needs_review` | Visible for reconciliation but excluded from scores, forecasts, and automated recommendations. |

## 3. Recommended next action

Start by preparing one historic import workbook in the format above with no sample rows. Export or scan only records already authorized for use, keep source-document identifiers with every row, and submit the workbook for a dry-run validation. After Batanes State College approves the policy weights and import mapping, the next implementation phase can add the staging tables, validation report, and versioned policy model without altering operational procurement records.

## References

[1] [Government Procurement Policy Board, Implementing Rules and Regulations of Republic Act No. 12009](https://www.gppb.gov.ph/wp-content/uploads/2025/02/Implementing-Rules-and-Regulations-of-RA-12009.pdf)

[2] [ProcureWise supplier intelligence implementation plan](./supplier-intelligence-implementation-plan.md)
