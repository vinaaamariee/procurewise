# ProcureWise Official Procurement Process Flow

## Procedure Details 5.1–5.15

**Institutional process basis:** The official procedure assigns work to Procurement Officer II, Procurement Staff, BAC Secretariat/BAC, Procurement Officer I, BAC/HoPE, Budget Officer/HoPE, and Supplier/Contractor. This document uses those official role names instead of the generic Administrative Approver label.

**System scope:** ProcureWise records, routes, validates, and reports the procurement package. A system action does not replace the required institutional signature, BAC action, HoPE decision, PhilGEPS posting, contract signing, or physical delivery activity.

> **Role-model note:** The application now recognizes the official roles as persisted role labels. Existing capability gates remain backward-compatible while the official responsibility mapping is introduced.

---

## 1. Official process at a glance

```text
Receive and verify PR & PPMP
→ Record PR to PMR
→ Prepare resolution and endorsement for BAC/HoPE signatures
→ Prepare RFQ and recommend HoPE approval
→ Distribute and retrieve RFQ; transmit to BAC
→ PhilGEPS posting
→ Forward to BAC for Abstract of Quotations
→ BAC/HoPE recommendation on award
→ Prepare Letter of Notice
→ Serve Letter of Notice
→ Prepare Purchase Order
→ Contract signing
→ PO/contract releasing
→ Supplier/Contractor delivery
→ Monitor delivery
```

The system also supports document retrieval, notifications, audit events, public status tracking, supplier evaluation, analytics, and PMR closure around this official sequence.

---

## 2. Responsibility and record matrix

| Procedure | Key activity | Responsible | Reference document/record | ProcureWise system stage |
|---|---|---|---|---|
| **5.1** | Receive and verify PR & PPMP | **Procurement Officer II** | Purchase Request and PPMP | Incoming PR/PPMP review |
| **5.2** | Record PR to PMR | **Procurement Staff** | PR, PPMP, Procurement Tracking Slip | PR registration and tracking record |
| **5.3** | Prepare resolution and endorsement to BAC members and HoPE for signature | **BAC Secretariat/BAC** | Resolution | Resolution preparation and signature handoff |
| **5.4** | Prepare RFQ and recommend HoPE approval | **Procurement Staff** | Request for Quotation | RFQ preparation |
| **5.5** | Distribute and retrieve RFQ and transmit to BAC | **Procurement Officer I** | Request for Quotation | RFQ distribution/retrieval and BAC transmittal |
| **5.6** | PhilGEPS posting | **Procurement Officer I** | Request for Quotation | Posting milestone and evidence record |
| **5.7** | Forward to BAC for preparation of Abstract of Quotations | **Procurement Staff** | Abstract of Quotations | BAC abstract handoff |
| **5.8** | Recommendation on the Award of Contract | **BAC/HoPE** | Letter of Notice | Award recommendation and decision |
| **5.9** | Prepare Letter of Notice | **Procurement Staff** | Letter of Notice | Notice drafting and controlled print |
| **5.10** | Serve Letter of Notice | **Procurement Officer I** | Letter of Notice | Notice service milestone |
| **5.11** | Prepare Purchase Order | **Procurement Staff** | Purchase Order | PO preparation |
| **5.12** | Contract signing | **Budget Officer/HoPE** | Purchase Order | Signing handoff and signed-record attachment |
| **5.13** | Purchase Order/Contract releasing | **Procurement Officer I** | Purchase Order | Release milestone |
| **5.14** | Delivery of goods | **Supplier/Contractor** | Purchase Order | External delivery event |
| **5.15** | Monitor delivery | **Procurement Officer II** | Purchase Order | Delivery monitoring, receipt, and PMR update |

---

## 3. Detailed system flow

### 3.1 Preparation and access

The Administrator configures offices, objects of expenditure, budgets, signatories, suppliers, entity defaults, user accounts, and official roles. The End-User then signs in and prepares the PPMP/APP planning record and Purchase Request. These preparation activities support Procedure 5.1; they are not substitutes for the official receiving and verification step.

### 3.2 Procedure 5.1 — Receive and verify PR & PPMP

**Responsible:** Procurement Officer II  
**Reference:** Purchase Request and Project Procurement Management Plan

The Procurement Officer II receives the submitted PR/PPMP package and verifies:

- The requesting office and requester are authorized.
- The PR is linked to the correct PPMP.
- The item schedule, quantities, specifications, and estimate are complete.
- The office/object-of-expenditure budget reference is appropriate.
- Required signatory information is present.
- The package is not a duplicate or unauthorized test record.

If the package is incomplete, the officer returns it for correction with specific comments. The system retains the correction history.

### 3.3 Procedure 5.2 — Record PR to PMR

**Responsible:** Procurement Staff  
**Reference:** PR, PPMP, and Procurement Tracking Slip

The Procurement Staff records the verified PR in the procurement monitoring record and associates the Procurement Tracking Slip. The tracking record establishes the package identity, date received, responsible office, and current status. This is the administrative registration point before the downstream RFQ and BAC activities.

### 3.4 Procedure 5.3 — Prepare resolution and endorsement

**Responsible:** BAC Secretariat/BAC  
**Reference:** Resolution

The BAC Secretariat/BAC prepares the resolution and endorsement package for BAC members and the HoPE to sign. ProcureWise may store the resolution, link it to the PR, and record its preparation or signature milestone. The system must not represent an unsigned resolution as a completed official approval.

### 3.5 Procedure 5.4 — Prepare RFQ and recommend HoPE approval

**Responsible:** Procurement Staff  
**Reference:** Request for Quotation

The Procurement Staff prepares the Request for Quotation using the verified PR/PPMP details, item schedule, quotation requirements, delivery expectations, deadline, and authorized procurement information. The staff recommends the RFQ for HoPE approval according to institutional procedure.

### 3.6 Procedure 5.5 — Distribute, retrieve, and transmit RFQ

**Responsible:** Procurement Officer I  
**Reference:** Request for Quotation

The Procurement Officer I distributes the approved RFQ to the intended suppliers, retrieves the responses, and transmits the RFQ package to the BAC. ProcureWise records the RFQ, supplier quotations, dates, acknowledgements, received-by information, and transmittal milestone when those records are available.

The minimum quotation rule remains important: the package should contain at least three legitimate supplier quotations when required by the applicable procurement procedure. A cheaper quotation with missing mandatory evidence is flagged for evidence completion and review rather than silently treated as compliant.

### 3.7 Procedure 5.6 — PhilGEPS posting

**Responsible:** Procurement Officer I  
**Reference:** Request for Quotation

The Procurement Officer I posts the RFQ through PhilGEPS when required. The system should record the posting milestone and authorized reference or attachment. ProcureWise does not claim that a posting occurred merely because an RFQ exists; the posting action and supporting record must be entered by the responsible officer.

### 3.8 Procedure 5.7 — Forward to BAC for Abstract of Quotations

**Responsible:** Procurement Staff  
**Reference:** Abstract of Quotations

The Procurement Staff forwards the complete quotation package to the BAC for preparation of the Abstract of Quotations. ProcureWise supports comparison of supplier quotations, compliance classification, delivery information, supporting evidence, and recommendation calculations. The Abstract remains linked to the original PR, PPMP, RFQ, and quotation set.

### 3.9 Procedure 5.8 — Recommendation on the Award of Contract

**Responsible:** BAC/HoPE  
**Reference:** Letter of Notice

The BAC/HoPE reviews the Abstract of Quotations and makes the recommendation on the award of contract. This is the official decision authority in this process model; it should not be labelled merely as “Administrative Approver.”

The system may present a transparent comparison or weighted recommendation aid, but the BAC/HoPE remains responsible for the authorized decision and required signature. A recommendation is not the same as a signed award decision.

### 3.10 Procedure 5.9 — Prepare Letter of Notice

**Responsible:** Procurement Staff  
**Reference:** Letter of Notice

The Procurement Staff prepares the Letter of Notice using the authorized award or disqualification information. The notice must use approved wording and must not contain placeholder data. ProcureWise can create, link, preview, and print the controlled notice record.

### 3.11 Procedure 5.10 — Serve Letter of Notice

**Responsible:** Procurement Officer I  
**Reference:** Letter of Notice

The Procurement Officer I serves the Letter of Notice to the intended recipient and records the service milestone, recipient, date, and supporting reference where available. Preparing a notice and serving a notice are separate activities and should not be collapsed into one status.

### 3.12 Procedure 5.11 — Prepare Purchase Order

**Responsible:** Procurement Staff  
**Reference:** Purchase Order

The Procurement Staff prepares the Purchase Order after the required award decision and notice steps. The PO must remain traceable to the PR, PPMP, RFQ, Abstract of Quotations, award recommendation, supplier, item schedule, budget, and supporting approvals.

### 3.13 Procedure 5.12 — Contract signing

**Responsible:** Budget Officer/HoPE  
**Reference:** Purchase Order

The Budget Officer/HoPE completes the contract-signing step using the Purchase Order and related contract records. ProcureWise may record the signing status and attach the signed document. An unsigned draft PO must not be represented as a signed contract.

### 3.14 Procedure 5.13 — Purchase Order/Contract releasing

**Responsible:** Procurement Officer I  
**Reference:** Purchase Order

The Procurement Officer I releases the approved and signed Purchase Order/Contract to the appropriate recipient. The release milestone identifies when the supplier/contractor has received the authority or instruction to perform.

### 3.15 Procedure 5.14 — Delivery of goods

**Responsible:** Supplier/Contractor  
**Reference:** Purchase Order

The Supplier/Contractor delivers the goods or performs the contracted obligation according to the Purchase Order. This is an external activity. ProcureWise records the delivery information only when authorized staff enter the verified delivery record.

### 3.16 Procedure 5.15 — Monitor delivery

**Responsible:** Procurement Officer II  
**Reference:** Purchase Order

The Procurement Officer II monitors delivery against the PO, records receipt and delivery status, and documents partial or complete delivery. The officer verifies the receipt number, receiving person, delivered items, signature reference, and supporting notes. After delivery and acceptance, the Procurement Officer II completes the PMR or monitoring record so the procurement package can close.

---

## 4. Evidence and correction paths

### Supplier evidence path

```text
Missing supplier evidence
→ Procurement Officer requests evidence
→ Evidence received
→ Procurement Officer starts review
→ Evidence accepted
→ Compliance and quotation eligibility recalculated
→ BAC/HoPE receives a complete comparison
```

### Correction path

```text
Incomplete PR/PPMP, RFQ, quotation, abstract, notice, or PO
→ Responsible official returns the package with comments
→ Responsible staff correct the record
→ Package is resubmitted
→ Previous correction remains in the audit trail
```

### Delivery exception path

```text
Delivery not complete
→ Procurement Officer II records partial or pending delivery
→ Supplier/Contractor completes delivery
→ Officer verifies receipt
→ PMR is updated and the package closes
```

---

## 5. Application role model

The application recognizes the following official role labels:

| Official role | Main system responsibility |
|---|---|
| **Procurement Officer I** | RFQ distribution/retrieval, PhilGEPS posting, Letter of Notice service, PO/Contract release |
| **Procurement Officer II** | PR/PPMP verification, delivery monitoring, receipt verification, PMR completion |
| **Procurement Staff** | PR-to-PMR recording, RFQ preparation, BAC forwarding, Letter of Notice preparation, PO preparation |
| **BAC Secretariat/BAC** | Resolution and endorsement preparation; BAC documentation and abstract handoff |
| **BAC/HoPE** | Recommendation on award of contract and official decision |
| **Budget Officer/HoPE** | Contract-signing responsibility |
| **Supplier/Contractor** | External delivery of goods or contracted performance |
| **End-User** | Planning, PR preparation, and initial procurement package submission |
| **System Administrator** | Configuration, users, reference data, and role assignment |

For backward compatibility, the application maps the official roles to existing capability gates while displaying the official role label to the user. This allows existing routes and server checks to continue operating during the role-model transition.

---

## 6. Defense presentation sequence using the official roles

1. Show the End-User preparing the PPMP and PR.
2. Explain that **Procurement Officer II** receives and verifies the PR/PPMP under 5.1.
3. Show **Procurement Staff** recording the PR to PMR under 5.2.
4. Explain the BAC Secretariat/BAC resolution and HoPE signature handoff under 5.3.
5. Show the RFQ preparation and HoPE recommendation under 5.4.
6. Explain that **Procurement Officer I** distributes/retrieves the RFQ, transmits it to BAC, and handles PhilGEPS posting under 5.5–5.6.
7. Show the quotation comparison and evidence review before BAC abstract preparation under 5.7.
8. Explain that BAC/HoPE makes the award recommendation under 5.8.
9. Show Procurement Staff preparing the Letter of Notice and Procurement Officer I serving it under 5.9–5.10.
10. Explain PO preparation, contract signing, and release under 5.11–5.13.
11. Show Supplier/Contractor delivery and Procurement Officer II monitoring under 5.14–5.15.
12. Finish with PMR completion, audit trail, controlled documents, and limited public tracking.

---

## 7. System boundary statement

> **ProcureWise is the digital control, record, routing, validation, and accountability layer for the official procurement procedure. It does not replace the legal or institutional responsibility of Procurement Officer I, Procurement Officer II, Procurement Staff, BAC Secretariat/BAC, BAC/HoPE, Budget Officer/HoPE, or Supplier/Contractor.**
