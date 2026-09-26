# ProcureWise User Guide

## Batanes State College Procurement Management System

**Version:** Defense-ready user manual  
**Audience:** End-Users, Procurement Officers, Administrative Approvers, and Administrators  
**System:** ProcureWise  
**Primary deployment:** `https://procurewise-a5x2.vercel.app`  
**Final-defense date:** 29 September 2026

---

## 1. Purpose of this guide

ProcureWise is a role-gated procurement management system for recording and routing the procurement lifecycle from annual planning through Purchase Request preparation, supplier canvassing, Abstract of Canvass, administrative decision, Purchase Order, delivery, and PMR closure.

This guide explains how to use the application as a real user. It also explains what each status means, why a button may be unavailable, what information must be prepared before entering a record, how to retrieve controlled documents, and how to troubleshoot common problems without changing data incorrectly.

ProcureWise is not a general-purpose public purchasing marketplace. It is an internal institutional workflow system. Users should enter only authorized procurement information, authorized supplier information, and legitimate supporting documents. For the defense presentation, use isolated demonstration records and temporary demonstration accounts rather than real personal data, real supplier quotations, or live institutional transactions.

> **Important data rule:** Do not invent supplier quotations, signatories, approvals, budgets, delivery receipts, or procurement milestones merely to make a screen look complete. If a value is not recorded or authorized, leave it blank and ask the responsible role to complete it.

## Official procedure-role clarification

The official institutional procedure uses the following responsibility assignments. These names take precedence over the generic **Administrative Approver** wording used by earlier application screens and drafts.

| Procedure | Key activity | Responsible | Reference document/record |
|---|---|---|---|
| 5.1 | Receive and verify PR & PPMP | **Procurement Officer II** | Purchase Request and PPMP |
| 5.2 | Record PR to PMR | **Procurement Staff** | PR, PPMP, and Procurement Tracking Slip |
| 5.3 | Prepare resolution and endorsement for signature | **BAC Secretariat/BAC** | Resolution |
| 5.4 | Prepare RFQ and recommend HoPE approval | **Procurement Staff** | Request for Quotation |
| 5.5 | Distribute/retrieve RFQ and transmit to BAC | **Procurement Officer I** | Request for Quotation |
| 5.6 | PhilGEPS posting | **Procurement Officer I** | Request for Quotation |
| 5.7 | Forward to BAC for validation and preparation of the official Abstract of Quotations | **Procurement Staff** | Preliminary quotation package and official Abstract of Quotations |
| 5.8 | Recommendation on Award of Contract | **BAC/HoPE** | Letter of Notice |
| 5.9 | Prepare Letter of Notice | **Procurement Staff** | Letter of Notice |
| 5.10 | Serve Letter of Notice | **Procurement Officer I** | Letter of Notice |
| 5.11 | Prepare Purchase Order | **Procurement Staff** | Purchase Order |
| 5.12 | Contract signing | **Budget Officer/HoPE** | Purchase Order |
| 5.13 | PO/Contract releasing | **Procurement Officer I** | Purchase Order |
| 5.14 | Delivery of goods | **Supplier/Contractor** | Purchase Order |
| 5.15 | Monitor delivery | **Procurement Officer II** | Purchase Order |

ProcureWise is the digital recording, routing, validation, and accountability layer for these activities. It does not replace required institutional signatures, BAC action, HoPE action, PhilGEPS posting, contract signing, or physical delivery. The role model now recognizes the official titles while retaining backward-compatible capability gates for existing records.

---

## 2. Quick-start summary

The normal operational sequence is:

1. An Administrator configures offices, objects of expenditure, budgets, signatories, entity defaults, suppliers, and user roles.
2. An End-User signs in or creates an End-User account.
3. The End-User creates or selects an APP/PPMP planning entry.
4. The End-User selects catalog items or enters item details.
5. The End-User prepares the three-file submission package: **PR, PPMP, and a preliminary quotation/abstract document from the completed pre-canvass**.
6. Procurement Officer II receives and verifies the PR and PPMP under Procedure 5.1.
7. Procurement Staff records the PR to PMR and the Procurement Tracking Slip under Procedure 5.2.
8. Procurement Staff and BAC validate, revise, and formally prepare the official Abstract of Quotations from the preliminary quotation document; the package then proceeds through the official BAC, RFQ, PhilGEPS, Letter of Notice, PO, signing, release, delivery, and monitoring procedures 5.3–5.15.
9. Authorized users retrieve documents, export official PDFs or CSV files, review notifications, and inspect the audit trail.

The application enforces role permissions both in the visible navigation and on the server. Seeing a route in a URL does not grant permission to perform its actions.

---

## 3. Accessing ProcureWise

### 3.1 Open the system

Open the deployed ProcureWise URL in a modern browser. For the defense, use a clean browser session or a private/incognito window so a previous user's Supabase session does not affect the demonstration.

The public landing page provides the institutional entry point. Select **Sign in** or open the Access page directly:

```text
https://procurewise-a5x2.vercel.app/access
```

To open the registration mode directly, use:

```text
https://procurewise-a5x2.vercel.app/access?mode=register
```

### 3.2 Sign in

1. Open the Access page.
2. Select **Sign in**.
3. Enter the registered work email address.
4. Enter the password.
5. Select **Sign in securely**.
6. Wait for ProcureWise to load the workspace profile.
7. Confirm that the dashboard and navigation match your assigned role.

The password must contain at least six characters according to the client-side validation. The email must have a valid email format.

Authentication is handled by Supabase Auth. ProcureWise then loads the corresponding internal profile and assigned procurement role. A successful Supabase login is not sufficient by itself: the application must also load the ProcureWise workspace profile.

### 3.3 Create an End-User account

Only new End-User accounts can be self-registered through the Access page.

1. Select **Create End-User account**.
2. Enter your full name.
3. Enter your work email address.
4. Enter a password with at least six characters.
5. Select **Create End-User account**.
6. If email confirmation is required, open the confirmation email.
7. Return to the Access page and sign in.
8. Confirm that the new profile opens with the **End-User** role.

A new self-registered profile must not automatically become a Procurement Officer, Administrative Approver, or Admin. An authorized administrator assigns elevated roles separately.

### 3.4 Recover a forgotten password

1. Enter your email address on the Sign in tab.
2. Select **Forgot password?**.
3. Follow the recovery link sent by Supabase Auth.
4. Return to the application using the recovery redirect.
5. Sign in again with the new password.

If the recovery message does not arrive, check the email address, spam folder, Supabase Auth configuration, and the deployed site's allowed redirect URL.

### 3.5 Sign out

Select your profile in the top-right area of the authenticated workspace, then choose **Sign out** from the dropdown menu. After sign-out, ProcureWise returns to the Access page. For a shared defense computer, always sign out before changing to another role.

### 3.6 Access problems

| Message or symptom | Meaning | User action |
|---|---|---|
| **Authorized access only** | The page requires an authenticated session. | Select **Sign in to ProcureWise**. |
| **Unable to reach Supabase Auth** | The browser could not reach the authentication service. | Check the network and deployed Supabase URL; retry once. |
| Sign-in succeeds but workspace profile cannot load | Auth succeeded, but the server could not load the internal ProcureWise profile or database record. | Contact the administrator; do not repeatedly create accounts. |
| A role menu is missing | The current profile does not have that role. | Ask an Admin to verify the assigned role. |
| The page appears to belong to another user | A previous session remains in the browser. | Sign out, clear the session, or use a private browser window. |

---

## 4. Understanding the workspace

### 4.1 Header

The authenticated header contains:

- ProcureWise/Batanes State College branding.
- A search field labelled **Search procurement records**.
- A notifications button with an unread count when applicable.
- The current user's name and normalized role on larger screens.
- A sign-out control.
- A mobile menu button on small screens.

### 4.2 Sidebar navigation

The sidebar is role-sensitive. The following route matrix describes the intended navigation.

| Feature | End-User | Procurement Officer | Administrative Approver | Admin |
|---|:---:|:---:|:---:|:---:|
| Overview | Yes | Yes | Yes | Yes |
| PPMP Planning | Yes | No | No | Yes |
| Catalog | Yes | Yes | Yes | Yes |
| PPMP & Purchase Requests | Yes | Yes | Yes | Yes |
| Suppliers | No | Yes | No | Yes |
| Pre-Canvass | Yes | Yes | No | Yes |
| Letters of Notice | No | Yes | No | Yes |
| BAC Transmittals | No | Yes | No | Yes |
| Abstracts, PO & PMR | No | Yes | Yes | Yes |
| Supplier Evaluation Form | Yes | Yes | Yes | Yes |
| Documents | Yes | Yes | Yes | Yes |
| Budget Control | No | No | Yes | Yes |
| Procurement Forecast | No | Yes | No | Yes |
| Analytics | No | Yes | Yes | Yes |
| Audit Trail | No | Yes | Yes | Yes |
| Officer settings | No | No | No | Yes |
| Best Value Policy | No | No | No | Yes |
| System setup | No | No | No | Yes |
| Test records | No | No | No | Yes |

The menu is a convenience and does not replace server authorization. A user must never attempt to bypass a missing menu by manually changing the URL.

### 4.3 Dashboard cards

The Overview dashboard summarizes the records visible to the signed-in role:

- **PPMP & Purchase Requests:** visible procurement packages.
- **Pre-Canvass packages:** supplier quote packages.
- **POs, delivery & PMR:** issued Purchase Orders and later execution records.
- **Audit events:** accountability records available to the role.

The active request list shows recent Purchase Requests and their status. The process-integrity panel reminds users that:

1. End-Users forward the PPMP, PR, and three supplier quotes as one package.
2. Procurement Officers create the Abstract and lowest-compliant recommendation.
3. Purchase Orders are issued only after administrative approval and are closed only after delivery and PMR logging.

### 4.4 Live-update indicator

The Pre-Canvass and execution screens can display a live-update state:

- **LIVE:** Realtime connection is available.
- **CONNECTING:** the application is checking the connection.
- **MANUAL:** live updates are unavailable; use the browser's refresh action or the application's data refresh behavior after another user makes a change.

A MANUAL indicator does not mean that saved data is lost. It means the current screen may not update automatically.

---

## 5. Administrator preparation

An End-User cannot complete a realistic package until the reference data is configured. An Admin should complete the following sequence before onboarding users or presenting the system.

### 5.1 Open System setup

1. Sign in as an Admin.
2. Open **System setup**.
3. Review the **Configuration readiness** panel.
4. Complete each incomplete control.

The readiness panel is the first place to look when End-Users report that a form is empty, disabled, or missing an option.

### 5.2 Configure entity and Purchase Order defaults

In **Entity and PO signatory defaults**, record:

- Entity name. The default is Batanes State College, but verify it against the institution's approved configuration.
- Authorized official full name.
- Authorized official designation.
- Chief Accountant name.

Select **Save defaults**. These values populate new Purchase Orders and remain blank when not legitimately recorded. Do not use placeholder names in an operational environment.

### 5.3 Add requesting offices

In **Requesting offices**:

1. Enter an office code, such as an institution-approved code.
2. Enter the official office name.
3. Select **Add office**.

Every Purchase Request must identify a requesting office.

### 5.4 Add objects of expenditure

In **Objects of expenditure**:

1. Enter the official object code.
2. Enter the object name.
3. Select **Add expenditure object**.

Budget authority is controlled at this classification level. Use the approved institutional classification, not an invented description.

### 5.5 Record a current-year budget allotment

In **Office budget allotment**:

1. Select the office.
2. Select the object of expenditure.
3. Enter the allotted amount for the displayed fiscal year.
4. Select **Record allotment**.

A Purchase Request can proceed only when the selected office/object combination has available funds. The relevant rule is:

```text
request amount <= allotted amount - committed amount
```

Do not reuse a budget allotment from a different office or object merely because the amount is sufficient.

### 5.6 Add authorized Purchase Request signatories

In **Purchase Request authorized signatories**:

1. Enter the authorized person's full name.
2. Enter the official designation.
3. Select **May request** when the person may appear in the Requested by selector.
4. Select **May approve** when the person may appear in the Approved by selector.
5. Select **Add authorized signatory**.

At least one permission must be selected. Only authorized names are offered in the Purchase Request signatory selectors. ProcureWise intentionally does not fabricate signatories.

### 5.7 Assign user roles

In the user directory on System setup, an Admin can assign the normalized workflow roles:

- End-User
- Procurement Officer
- Administrative Approver
- Admin

Use the least-privilege role required for the person's work. After changing a role, ask the user to sign out and sign in again so the navigation and server profile are refreshed.

### 5.8 Complete supplier registry preparation

The Pre-Canvass requires at least three legitimate supplier records. Open **Suppliers** and select **Register supplier**.

Required fields:

- Supplier code.
- Company name.

Recommended or available supporting fields:

- TIN.
- Accreditation status: Pending, Accredited, or Suspended.
- Contact person.
- Email.
- Phone.
- Product or service offerings.
- Address.

Select **Save supplier**. Use the supplier's official legal information. Do not create three fake suppliers to bypass the three-quotation rule.

### 5.9 Configure supplier goods/services tags

The supplier registry includes tags or declared offerings used to narrow supplier choices during quote entry. Tags are a filtering aid. They do not replace accreditation checks, authorization, or the three-supplier rule.

### 5.10 Admin readiness checklist

Before asking an End-User to start:

- [ ] At least one office exists.
- [ ] At least one object of expenditure exists.
- [ ] The current fiscal-year budget allotment is recorded for the intended office/object combination.
- [ ] At least three legitimate suppliers are registered.
- [ ] Supplier accreditation status and offerings are accurate.
- [ ] Entity and PO signatory defaults are recorded.
- [ ] Authorized Purchase Request signatories are recorded.
- [ ] Demonstration users have the correct roles.
- [ ] The deployment URL and Supabase Auth redirect configuration are verified.
- [ ] No live secret values are written into documentation or presentation slides.

---

## 6. End-User procedure

### 6.1 Start with PPMP Planning

Open **PPMP Planning**.

Select **Add planning entry** and complete the planning form using authorized information:

- Fiscal year.
- Requesting office.
- Object of expenditure.
- Catalog item, if the planned item corresponds to an active catalog record.
- Description.
- Planned amount.
- PAP code, when applicable.
- Project title, when applicable.
- Mode of procurement.
- Fund source.
- Procurement schedule.
- Remarks.
- Supporting document, when one is authorized and available.

When a catalog item is selected, its description and reference amount may populate the form. Verify the value against the approved planning record before saving.

Select **Save**. The planning table shows fiscal year, description, planned amount, actual amount, and status.

The page supports:

- **Download CSV** for visible PPMP entries.
- **Download PPMP PDF** for the visible planning set.

Exports include only records visible to the signed-in role. Blank fields remain blank; they are not replaced with guessed data.

### 6.2 Use the Catalog

Open **Catalog** to find reference items for a Purchase Request.

Available controls include:

- Search by item name or product code.
- Filter by catalog code family/category.
- Filter by a hidden reference amount range.
- Sort by description, product code, lowest hidden amount, or highest hidden amount.
- Mark items as favorites.
- Select one or more items.
- Set a quantity for each selected item.
- Remove one item from the saved selection.
- Clear the entire selection.
- Add saved items to a new Purchase Request.

The catalog cards are intended as reference records. The UI labels reference amounts as hidden from catalog cards; do not treat the catalog as a supplier-quotation source. Procurement pricing must come from the appropriate quotation workflow and authorized user-entered estimates.

#### Catalog procedure

1. Search for an item by name or product code.
2. Apply a category filter if the result set is large.
3. Select the checkbox on each required item.
4. Review the **Saved selection** panel.
5. Set a positive quantity for each item.
6. Remove any item that does not belong to the request.
7. Select **Add saved items to new PR**.
8. Confirm that the application opens **PPMP & Purchase Requests** with the selected items loaded.

If the selection does not appear in the new PR, remain in the same browser session and check whether browser storage is blocked. The handoff uses session storage and the saved catalog selection service.

### 6.3 Create a Purchase Request

Open **PPMP & Purchase Requests** and select **New Purchase Request**. If coming from Catalog, the form may already contain the selected catalog items.

Complete the header information:

- Purpose.
- Fund source, if applicable.
- Fund cluster.
- Responsibility center code.
- Requester designation.
- Requested by signatory, if applicable.
- Approved by signatory, if applicable.
- PPMP entry.
- Requesting office.
- Object of expenditure.

Complete at least one item line. Each line should contain:

- Catalog item or stock/property number when applicable.
- Description.
- Specification.
- Quantity greater than zero.
- Unit.
- Estimated unit cost greater than zero.

The displayed total is calculated as:

```text
quantity x estimated unit cost = line total
sum of line totals = Purchase Request estimate
```

The server recalculates important totals from the submitted item values. Do not rely on editing a displayed total manually.

#### Purchase Request validation

The form does not submit when:

- No office is configured.
- No object of expenditure is configured.
- Purpose is blank.
- No PPMP entry is selected.
- An item description is blank.
- Quantity is zero or negative.
- Estimated unit cost is zero or negative.
- A selected signatory is not one of the authorized suggestions.

Correct the first missing requirement shown by the form, then submit again.

#### Save and submit behavior

After a successful creation:

1. ProcureWise creates the PR number.
2. A public tracking token is generated.
3. The tracking token is copied to the clipboard when the browser permits it.
4. The request appears in the register as **DRAFT**.

A draft is not yet forwarded to Procurement. Review the item lines, purpose, office, expenditure object, signatories, and estimated total before selecting **Submit**.

### 6.4 Submit the Purchase Request package

In the Purchase Request register, locate the draft and select **Submit**.

The End-User submission advances the request toward Procurement review. In the complete operating process, the End-User should also ensure that the PPMP, item data, and Pre-Canvass package are complete according to institutional procedure.

Do not submit a draft simply to test a button in a production database. For demonstrations, use a clearly labelled isolated test record governed by the administrator.

### 6.5 Open a Pre-Canvass

Open **Pre-Canvass** and select **New Pre-Canvass**.

Select an eligible Purchase Request and record:

- Purchase Request.
- Approved budget ceiling.
- Quotation deadline.
- Delivery period in days.
- Price evaluation: Lot basis or Per item.

Select **Open Pre-Canvass**.

The package begins in **DRAFT** status. The form presents the Annex D structure and records the RFQ date/deadline, delivery requirements, budget ceiling, evaluation basis, and item schedule.

A Pre-Canvass cannot be opened if there is no eligible Purchase Request. Return to Purchase Requests and create or correct the PR first.

### 6.6 Record supplier quotations

On the Pre-Canvass page, select **Add quote**. Record one quote at a time.

Fields include:

- Pre-Canvass.
- Goods/services filter.
- Supplier.
- Quotation reference.
- Quoted amount.
- Delivery days.
- Compliance: Compliant or Non-compliant.
- Supplier representative.
- Acknowledged date.
- Received by.
- Notes.

The amount must be greater than zero. Delivery days cannot be negative.

Repeat the action until the package contains at least three quotations from legitimate supplier records. The comparison table displays the count as `n/3 SUPPLIERS` and highlights the lowest compliant quote.

> **Comparison rule:** Only compliant quotations are eligible for the lowest-compliant recommendation. A cheaper non-compliant quote must not be selected as the recommendation.

### 6.7 Forward the Pre-Canvass package

When at least three supplier quotations are recorded:

1. Review the supplier names.
2. Review quotation references and amounts.
3. Check delivery days.
4. Verify compliance classification.
5. Check acknowledgement and received-by information.
6. Confirm the correct linked Purchase Request.
7. Select **Forward package**.

The package moves to **SUBMITTED** and becomes available to the Procurement Officer. The End-User should no longer expect to see controls for creating the Abstract, approving it, issuing the PO, recording delivery, or logging the PMR.

### 6.8 Respond to a correction request

A Procurement Officer may return a submitted Pre-Canvass for correction. The correction must contain written comments. When returned:

1. Read the correction comments carefully.
2. Correct only the requested fields or attachments.
3. Verify that the linked Purchase Request has not changed unintentionally.
4. Recheck the three-quotation requirement.
5. Resubmit the corrected package according to the available action.

Do not delete and recreate an authentic procurement record to hide a correction history. The return and resubmission are part of the audit trail.

### 6.9 Share the public tracking token

The PR creation success message copies a tracking token to the clipboard. Share the token only with the intended requesting office or authorized recipient.

Open `/track` or select the public tracking page. Enter the token and select **Track**.

The public page displays:

- PR number.
- Purpose.
- Current process status.
- A six-stage progress view:
  1. Draft package.
  2. Pre-Canvass.
  3. Procurement review.
  4. Administrative decision.
  5. Purchase Order.
  6. Delivery & PMR.
- Recent recorded milestones.

The public tracking page is intentionally limited. It does not disclose personal information, supplier information, or pricing.

---

## 7. Procurement Officer procedure

### 7.1 Review the incoming queue

Open **Overview**, **PPMP & Purchase Requests**, or **Pre-Canvass**. Look for records in `PROCUREMENT_REVIEW` or `SUBMITTED` status.

Verify:

- The request belongs to an authorized office.
- The PPMP link is present.
- The item schedule is complete.
- The budget and object-of-expenditure references are appropriate.
- The Pre-Canvass has at least three quotations.
- Supplier compliance classifications are supported by the recorded documents.
- The package is not a duplicate or an unauthorized test record.

### 7.2 Return a Pre-Canvass for correction

Use the **Return for correction** panel when the package cannot proceed.

1. Select the submitted Pre-Canvass.
2. Enter specific correction comments.
3. State the missing, inconsistent, or non-compliant information.
4. Use at least ten meaningful characters; vague comments such as “fix this” are insufficient.
5. Select **Return package**.

Good correction comment:

> “Supplier 2 quotation reference is missing and the delivery period does not match the recorded supplier document. Correct both fields and resubmit the package.”

### 7.3 Create the Abstract of Canvass

When the Pre-Canvass is complete:

1. Locate the submitted package.
2. Confirm the comparison table.
3. Confirm that the recommendation is based on the lowest **compliant** supplier.
4. Select **Create abstract**.

The system generates the Abstract of Canvass and records the recommendation reason. The Abstract can be downloaded as a CSV package or a package PDF.

The Abstract comparison includes:

- Supplier.
- Total quotation.
- Delivery days.
- Compliance.
- Lowest-compliant recommendation.

### 7.4 Use the MCDM recommendation

For a recommended Abstract, the Procurement Officer can select **Calculate MCDM**. The displayed MCDM model uses:

- 60% price.
- 20% delivery.
- 20% compliance.

The application reports the recommended supplier and score. Review the result against the recorded quotations and policy before creating the RFQ. The calculation is a transparent recommendation aid; it does not remove the requirement for authorized review and approval.

Select **Create RFQ** when the official RFQ record should be created from the recorded three-supplier quotation set.

### 7.5 Administrative decision handoff

After Abstract creation, the Administrative Approver sees the recommended Abstract. The Procurement Officer should not approve the officer's own recommendation unless the assigned role and institutional separation of duties explicitly permit it.

The officer may prepare the supporting document package and BAC transmittal while the Abstract awaits decision.

### 7.6 Issue the Purchase Order

After the Abstract is approved:

1. Open **Abstracts, PO & PMR**.
2. Locate the approved Abstract.
3. Verify the supplier and item schedule.
4. Confirm entity defaults, delivery details, payment terms, fund cluster, and accounting fields.
5. Select **Issue PO**.

The Purchase Order should retain traceability to the source package, supplier, quotation decision, and item schedule. Official Appendix 61 fields should remain blank when the data has not been entered rather than being invented.

### 7.7 Record delivery

When an issued Purchase Order has been fulfilled or partially fulfilled:

1. Select **Record delivery** beside the issued PO.
2. Select the Purchase Order.
3. Enter the receipt number.
4. Enter the person who received the delivery, if available.
5. Select the delivery status: Complete or Partial.
6. Enter a signature reference when the official receipt contains one.
7. Add accurate notes or supporting information.
8. Save the delivery record.

Do not mark a delivery complete before checking the receipt and delivered items.

### 7.8 Log the PMR

For a Purchase Order with **DELIVERED** status:

1. Select **Log PMR**.
2. Select the delivered Purchase Order.
3. Enter the PMR or monitoring details requested by the form.
4. Confirm the delivery and acceptance information.
5. Save the PMR.

A successful PMR log closes the Purchase Order and produces the `PMR_LOGGED` or closed workflow state, depending on the record representation.

### 7.9 Manage Letters of Notice

Open **Letters of Notice**.

Create a notice by entering:

- Notice type: Award, Disqualification, Clarification, or Other official notice.
- Optional linked Purchase Request.
- Optional recipient supplier.
- Subject.
- Notice body.
- Issue immediately, when authorized.

Select **Save Letter of Notice**. Use **Print** to open the controlled Batanes State College print layout.

Use official wording approved by the institution. Do not issue an official notice with placeholder text.

### 7.10 Manage BAC Transmittals

Open **BAC Transmittals**.

Enter:

- Optional linked Purchase Request.
- From office.
- To office.
- Subject.
- Remarks describing enclosed procurement documents and routing instructions.
- **Mark as sent** when the transmittal has actually been sent.

Select **Save transmittal**. A sent transmittal can be acknowledged by entering the recipient's name. Use **Print** for the controlled transmittal copy.

### 7.11 Supplier evaluation

Open **Supplier Evaluation Form** after a legitimate supplier performance event.

Record scores from 1 to 5 for:

- Quality.
- Delivery.
- Pricing.
- Compliance.

Optionally link the evaluation to a Purchase Order and enter evidence-based remarks. Do not rate a supplier without an actual performance record.

Existing evaluations can be edited by the authorized role. When editing, verify that the supplier and linked PO are still correct before saving.

### 7.12 Procurement Forecast

Open **Procurement Forecast** to review planning and recurring demand information. Use the forecast as a planning aid, not as a substitute for a formally approved PPMP or budget allotment.

---

## 8. Administrative Approver procedure

### 8.1 Review a recommended Abstract

Open **Abstracts, PO & PMR** and locate an Abstract with **RECOMMENDED** status.

Review:

- Linked Pre-Canvass and Purchase Request.
- Supplier quotations.
- Compliance classifications.
- Lowest-compliant recommendation.
- Recommendation reason.
- Budget and item schedule.
- Supporting documents.
- Required certification and signatory information.

### 8.2 Approve

Select **Approve** only after the recommendation and supporting records have been reviewed. Approval advances the package to the Procurement Officer for PO processing.

### 8.3 Reject

Select **Reject** only when the procurement decision cannot proceed. Confirm that the rejection reason or supporting record is captured according to institutional policy. A rejection is not a substitute for a correctable missing field.

### 8.4 Return for correction

Use **Return** when the package can proceed after a specific correction.

1. Select **Return** beside the recommended Abstract.
2. Enter comments identifying the exact field, document, signatory, amount, or condition that must be corrected.
3. Select **Return for correction**.

The comment becomes part of the workflow record. Procurement can then correct and resubmit the Abstract.

### 8.5 Review a Purchase Order

An Administrative Approver can return an issued PO for correction. Use this action when the PO has a material issue, such as an incorrect supplier, amount, signatory, delivery condition, fund reference, or supporting field.

The correction must be specific. Procurement can reissue a returned PO after addressing the comments.

### 8.6 Budget Control

Open **Budget Control** to review office-level and object-level utilization. Confirm that commitments are not treated as available funds and that the budget record covers the requested fiscal year.

---

## 9. Documents and official exports

### 9.1 Open Documents

Open **Documents** to attach or retrieve controlled supporting documents associated with records visible to your role.

Supported classifications include:

- Supporting document.
- Signed Purchase Request.
- Supplier quotation.
- Canvass acknowledgement.
- Abstract of Canvass.
- Purchase Order.
- Delivery receipt.
- PMR attachment.

Supported file types include PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, and XLSX. The upload limit is 10 MB.

### 9.2 Attach a document

1. Select the procurement record.
2. Select the document classification.
3. Choose the file.
4. Confirm the file name and size.
5. Select **Attach document**.
6. Wait for the success message.

The file is stored through the document-storage integration while metadata remains linked to the procurement record. Do not upload passwords, private keys, unrelated personal files, or a document to the wrong transaction.

### 9.3 View an attached document

The **Available documents** table shows documents accessible to the current role. Select **View** beside the document. If the document is not listed, verify:

- You are signed in as the correct role.
- You selected the correct record.
- The upload completed successfully.
- The document is linked to the record you can access.

### 9.4 Preview and download official forms

Select a record, then use the official-form controls:

- **Preview before printing**.
- **Download official PDF**.
- **Preview Annex E** for a Pre-Canvass.
- **Download Annex E** for a Pre-Canvass.

The application supports controlled copies for:

- Appendix 60 Purchase Request.
- Annex D Request for Price Quotation.
- Annex E acknowledgement.
- Annex F Abstract of Quotation.
- Appendix 61 Purchase Order.
- PPMP planning exports.
- Abstract package CSV/PDF.

Always preview before printing. Confirm that the entity, record number, dates, supplier, item schedule, totals, signatories, and certification fields correspond to the selected record.

### 9.5 Print-only institutional branding

The print layouts include Batanes State College header/footer assets for controlled output. The editing screens may use compact branding while the print-only layout adds official page treatment. Do not judge print fidelity solely from the editing screen.

### 9.6 Blank fields

Blank fields are meaningful. They indicate that the corresponding value has not been recorded or supplied. Do not type “N/A,” “TBD,” or a guessed name unless the institution's approved procedure explicitly requires that value.

---

## 10. Status reference

### 10.1 Purchase Request statuses

| Status | Meaning | Typical next action |
|---|---|---|
| `draft` | The End-User is still preparing the request. | Complete and submit the PR. |
| `procurement_review` | The request has been forwarded to Procurement. | Procurement Officer reviews it. |
| `approval_review` | The request is in an approval stage. | Authorized approver reviews it. |
| `approved` | The request or selection has received approval. | Continue to canvass, issue PO, or perform the configured next step. |
| `rejected` | The request or decision was rejected. | Follow institutional corrective or restart procedure. |
| `returned` | The record was sent back with correction comments. | Responsible role corrects and resubmits. |
| `po_issued` / `po` | A Purchase Order has been issued. | Record delivery when received. |
| `delivered` | Delivery has been recorded. | Log the PMR. |
| `pmr_logged` | PMR has been recorded. | Review closed record and audit history. |
| `closed` | The procurement package is complete/closed. | Retain records and monitor reporting. |
| `budget_review` | Budget validation is pending. | Authorized budget review. |
| `supply_review` | Supply/procurement review is pending. | Procurement action. |
| `bac_review` | BAC-related review is pending. | BAC or authorized officer action. |
| `rfq` | The official RFQ stage is active. | Continue quotation workflow. |

### 10.2 Pre-Canvass statuses

| Status | Meaning |
|---|---|
| **DRAFT** | The package is being created and quotes are still being recorded. |
| **SUBMITTED** | The End-User forwarded it to Procurement. |
| **RETURNED** | Procurement returned it with correction comments. |
| **ABSTRACT READY / RECOMMENDED** | The Abstract has been generated and a recommendation exists. |
| **APPROVED** | The Administrative Approver accepted the recommendation. |
| **REJECTED** | The recommendation was rejected. |
| **CLOSED** | The downstream execution has completed or the record is closed. |

The exact display can vary because the UI converts stored status values to uppercase labels and replaces underscores with spaces.

### 10.3 Quote statuses and decision terms

- **Compliant:** the quotation satisfies the recorded requirements and may be considered for lowest-compliant selection.
- **Non-compliant:** the quotation is recorded but must not be selected as the lowest-compliant recommendation.
- **Lowest compliant:** the lowest amount among compliant quotations.
- **MCDM recommendation:** a weighted recommendation using price, delivery, and compliance factors.

---

## 11. Notifications, audit trail, and accountability

### 11.1 Notifications

The notification bell in the header displays unread notifications. Open **Notifications** to review workflow messages. Read notifications when an action is complete, then follow the linked record or route if provided.

If a notification seems stale:

1. Open the linked page directly.
2. Refresh the page.
3. Confirm the record status in the register.
4. Do not perform an action twice merely because a notification did not update.

### 11.2 Audit Trail

Authorized Procurement Officers, Administrative Approvers, and Admins can open **Audit Trail**. Use it to confirm:

- Who created a record.
- Who submitted or forwarded it.
- Who returned it and why.
- Who approved or rejected it.
- When a PO was issued.
- When delivery and PMR were recorded.

The audit trail is an accountability record, not an editing interface. If an incorrect event exists, follow the approved correction procedure rather than deleting the audit history.

---

## 12. Troubleshooting guide

### 12.1 “No eligible Purchase Request is available yet”

**Likely cause:** No draft or eligible PR exists for the user.

**Fix:**

1. Open **PPMP & Purchase Requests**.
2. Confirm that a PPMP entry exists.
3. Create the PR with a purpose, office, object, and item line.
4. Save the PR.
5. Return to **Pre-Canvass**.

### 12.2 Office or expenditure dropdown is empty

**Likely cause:** The Admin has not configured reference data.

**Fix:** Ask an Admin to add at least one requesting office and one object of expenditure in **System setup**. Do not type arbitrary IDs or attempt to bypass the disabled form.

### 12.3 “Forward package” is disabled

**Likely causes:**

- Fewer than three supplier quotes exist.
- No draft Pre-Canvass exists.
- The package is already submitted or returned.
- Supplier records are not available.

**Fix:** Check the quote count, supplier registry, and package status. Add the missing legitimate quotes, then retry.

### 12.4 A supplier does not appear in the quote selector

**Likely causes:**

- The supplier is not registered.
- The goods/services tag filter hides it.
- The supplier record is not visible to the signed-in role.
- The registry query has not refreshed.

**Fix:** Set the filter to **All suppliers**, check **Suppliers**, and refresh. If the supplier is still absent, ask an authorized officer to verify the supplier record.

### 12.5 The lowest quote is not recommended

**Likely cause:** The lowest quote is marked non-compliant, or another compliant quote has a lower numeric total.

**Fix:** Review each quote's compliance flag and amount. The correct rule is lowest among compliant quotations, not lowest amount regardless of compliance.

### 12.6 “Database is unavailable”

**Likely cause:** The server does not have a working database connection or the environment variables are missing/mismatched.

**User action:** Do not repeatedly submit forms. Capture the screen message and report it to the Admin/deployment owner.

**Administrator checks:**

- `DATABASE_URL` or `SUPABASE_DATABASE_URL` exists in the deployment environment.
- The database belongs to the same Supabase project as the Auth URL.
- The `procurewise` schema exists.
- The deployment was rebuilt after environment-variable changes.
- The connection pooler and SSL settings are correct.

### 12.7 “Supabase sign-in succeeded, but ProcureWise could not load your workspace profile”

**Likely cause:** Supabase Auth accepted the credentials, but the server could not connect to the profile database or could not match the email to an internal user.

**Administrator checks:**

1. Confirm `VITE_SUPABASE_URL` points to the intended tenant.
2. Confirm the database URL points to the same tenant.
3. Confirm the service-role key is server-only and belongs to the same tenant.
4. Confirm the user profile exists or that provisioning is enabled.
5. Redeploy after changing environment variables.
6. Check redacted server diagnostics without exposing secrets.

### 12.8 A change made by another user is not visible

**Likely cause:** Supabase Realtime is unavailable or the screen has stale query data.

**Fix:** Look at the live-update indicator. If it says **MANUAL**, refresh the page. Confirm the record status in the relevant register.

### 12.9 Official PDF is missing values

**Likely causes:**

- The value was never recorded.
- The selected record is not the intended record.
- A linked Purchase Request or supplier record is incomplete.
- The data query is still loading.

**Fix:** Confirm the selected record, wait for linked data to load, and correct the source record. Do not edit the PDF manually to invent missing institutional data.

### 12.10 Upload fails

Check:

- File type is supported.
- File size is no more than 10 MB.
- A record is selected.
- A document classification is selected.
- The user has access to the record.
- The browser network is stable.

If the upload was interrupted, verify the document register before trying again to avoid duplicate attachments.

### 12.11 Public tracking says no record was found

Check:

- The entire token was copied.
- Leading/trailing spaces were removed.
- The token belongs to the intended PR.
- The PR was created successfully.
- The browser did not block clipboard copying.

Never expose the token publicly beyond the intended recipient.

---

## 13. Defense demonstration script

Use a controlled, clearly labelled demonstration scenario. Prepare the scenario in advance, but do not create fabricated records in a production database without the team's approved demo procedure.

### 13.1 Preparation

- Use a clean browser session.
- Verify the deployed Access page loads.
- Verify the demonstration accounts before the presentation.
- Confirm at least one configured office, object, budget, signatory set, and three demo suppliers.
- Prepare two or three sample catalog items.
- Prepare a sample purpose, quantities, estimated costs, and three quotation values.
- Keep an offline copy of the scenario and expected outcomes.
- Record the final deployment commit and database target.
- Keep passwords out of slides and public notes.

### 13.2 End-User demonstration

1. Open the Access page.
2. Sign in as End-User.
3. Show that the sidebar is limited to the End-User workspace.
4. Open Catalog.
5. Search for two sample items.
6. Select the items and change one quantity.
7. Add the saved selection to a new PR.
8. Select the PPMP entry, office, expenditure object, purpose, and signatories.
9. Verify item lines and estimated total.
10. Save the PR and point out the PR number and tracking token.
11. Open Pre-Canvass.
12. Enter the budget ceiling, deadline, delivery period, and evaluation basis.
13. Add three supplier quotations.
14. Show the `3/3 SUPPLIERS` indicator.
15. Point out the lowest compliant recommendation.
16. Forward the package.
17. Show that End-User post-review controls are not available.

### 13.3 Procurement Officer demonstration

1. Sign out and sign in as Procurement Officer.
2. Open the submitted Pre-Canvass.
3. Review supplier amounts, delivery, compliance, and acknowledgement data.
4. Create the Abstract.
5. Download or preview the Abstract package.
6. Calculate the MCDM recommendation if required.
7. Create the RFQ if required by the demonstration scenario.
8. Show the role-specific officer menu.
9. Optionally create a Letter of Notice or BAC Transmittal.

### 13.4 Administrative Approver demonstration

1. Sign out and sign in as Administrative Approver.
2. Open Abstracts, PO & PMR.
3. Review the recommended Abstract.
4. Explain the choice between Approve, Reject, and Return for correction.
5. Approve the controlled demo record.

### 13.5 Return-for-correction demonstration

If the panel asks about error handling:

1. Return an Abstract with a precise correction comment.
2. Sign in as Procurement Officer.
3. Show the returned record and comments.
4. Correct the source information.
5. Resubmit the Abstract.
6. Explain that the correction is traceable and not silently overwritten.

### 13.6 Execution demonstration

1. Sign in as Procurement Officer.
2. Issue the PO after approval.
3. Show the Appendix 61 detail hierarchy.
4. Record delivery.
5. Log the PMR.
6. Show the final status and audit history.

### 13.7 Questions to ask during a usability demonstration

Ask the participant:

1. What did you expect to happen when you opened this page?
2. Which part was easiest to understand?
3. Where did you hesitate?
4. Which label or field was unclear?
5. Does the form resemble the paper form used by the office?
6. Is any government field missing or moved?
7. Is the catalog-to-PR handoff clear?
8. Can you tell which records are submitted, returned, approved, or in progress?
9. What information is missing from the dashboard?
10. What is the single most important change before adoption?

Classify findings as:

- **Blocking:** prevents sign-in, required workflow action, data retention, correct role assignment, or usable official output.
- **High:** creates repeated workflow confusion, traceability risk, or material form inaccuracy.
- **Medium:** has a reliable workaround but reduces clarity or speed.
- **Low:** cosmetic or outside the defense scope.

---

## 14. No-AI operating and debugging procedure

When a panel asks the team to diagnose a problem without AI, use this sequence.

### 14.1 Identify the layer

Ask whether the failure is in:

1. Browser/UI rendering.
2. Client state or query data.
3. tRPC request or validation.
4. Server authorization.
5. Database query or migration.
6. Supabase Auth, Realtime, or storage.
7. Deployment configuration.
8. PDF/export generation.

### 14.2 Reproduce safely

Write down:

- User role.
- URL.
- Record number.
- Exact button or form action.
- Exact message.
- Whether the record was saved.
- Whether another role sees the same result.
- Browser and deployment URL.

Never retry a mutation blindly if it may have already created a record.

### 14.3 Inspect the browser

Use browser DevTools:

- **Console:** JavaScript exceptions and UI errors.
- **Network:** request URL, HTTP status, request payload, response error, and timing.
- **Application/Storage:** Supabase session and catalog-selection storage.
- **Accessibility tree:** labels and button names.

For a tRPC failure, inspect the response message and identify whether it is validation, unauthorized, forbidden, not found, or internal server error.

### 14.4 Inspect the repository

Useful commands:

```bash
pnpm check
pnpm vitest run
pnpm build
```

For the offline CI-equivalent tests:

```bash
pnpm vitest run \
  --exclude server/supabaseConnection.test.ts \
  --exclude server/supabaseRuntime.test.ts \
  --exclude server/supabaseRealtime.test.ts \
  --exclude server/supabaseRealtimeCredentials.test.ts
```

For a focused test:

```bash
pnpm vitest run server/procurementWorkflow.test.ts
```

Search the source:

```bash
rg -n "purchaseRequests|preCanvasses|issuePurchaseOrder|recordDelivery|logPmr" client server shared
```

Check the working tree:

```bash
git status --short
git log --oneline -10
```

### 14.5 Interpret test results correctly

The repository separates deterministic/offline tests from live Supabase integration tests. A local environment without database and Supabase variables may fail integration tests even when the core business-rule tests pass.

The correct explanation is:

> “The deterministic suite validates workflow rules and UI contracts locally. The integration suite requires configured Supabase PostgreSQL and Realtime credentials, so those tests must be run in the configured CI or deployment environment. We do not treat missing credentials as proof that the workflow code is correct or incorrect.”

### 14.6 Server-side authorization principle

If a button is missing, that is a UI clue, not a permission guarantee. The server must still validate:

- Authenticated user.
- Internal profile.
- Assigned role.
- Record ownership or visibility.
- Current state.
- Required prerequisites.

When debugging an authorization issue, inspect both the client visibility condition and the corresponding tRPC procedure or server helper.

---

## 15. Data-protection and operational rules

1. Never expose `DATABASE_URL`, database passwords, JWT secrets, Supabase service-role keys, or OAuth secrets in browser code, screenshots, issue comments, or presentation slides.
2. Browser-visible Supabase settings may use the publishable/anonymous credential only.
3. Treat public tracking tokens as sensitive workflow references; share them only with the intended recipient.
4. Upload only documents that belong to the selected procurement record.
5. Do not delete authentic records to reset a demonstration.
6. Use test-record safeguards and an isolated environment for demonstrations.
7. Use real signatory names only when authorized.
8. Do not fabricate quotes, supplier evaluations, approvals, deliveries, or audit events.
9. Sign out between role demonstrations.
10. Rotate or delete temporary demonstration accounts after the defense.

---

## 16. Defense acceptance checklist

### Access and roles

- [ ] Clean browser can open the deployed Access page.
- [ ] End-User registration/sign-in works with a verified account.
- [ ] Authenticated profile loads without a workspace-profile error.
- [ ] End-User sees only the intended End-User navigation.
- [ ] Procurement Officer sees officer workflow controls.
- [ ] Administrative Approver sees decision controls.
- [ ] Admin sees setup and administration controls.

### End-User workflow

- [ ] Catalog search works.
- [ ] Catalog filtering and quantity editing work.
- [ ] Saved catalog selection reaches a new PR.
- [ ] PPMP entry can be selected.
- [ ] Office and expenditure object dropdowns contain configured values.
- [ ] PR item lines and totals are correct.
- [ ] PR receives a number and tracking token.
- [ ] Pre-Canvass can be opened.
- [ ] Three supplier quotations can be recorded.
- [ ] Lowest compliant supplier is correctly identified.
- [ ] Forward package works only after the three-quote requirement is met.

### Officer and approval workflow

- [ ] Procurement Officer can see submitted package.
- [ ] Correction comments are required and visible.
- [ ] Abstract can be created.
- [ ] Abstract comparison and recommendation are traceable.
- [ ] Administrative Approver can approve, reject, or return.
- [ ] Procurement can resubmit a returned Abstract.
- [ ] Approved Abstract can produce a PO.
- [ ] Returned PO can be reissued after correction.

### Execution and documents

- [ ] Delivery can be recorded against an issued PO.
- [ ] PMR can be logged against a delivered PO.
- [ ] Documents can be attached under 10 MB.
- [ ] Authorized users can view linked documents.
- [ ] Official PDFs preview and download.
- [ ] Appendix 60, Annex D/E/F, and Appendix 61 structure is preserved.
- [ ] Print-only Batanes State College branding appears correctly.
- [ ] Audit events and public tracking milestones are visible at the correct scope.

### Deployment and security

- [ ] Final deployment commit is recorded.
- [ ] Production environment variables point to the intended Supabase tenant.
- [ ] Server-only secrets are not exposed in the client bundle.
- [ ] Temporary demo credentials are rotated after the defense.
- [ ] No real personal data or real procurement records are used in the presentation.

---

## 17. Reference map for maintainers

The following source files are useful when a maintainer needs to connect a user action to its implementation:

| User area | Main source locations |
|---|---|
| Routing | `client/src/App.tsx` |
| Role navigation and layout | `client/src/components/DashboardLayout.tsx` |
| Authentication | `client/src/pages/Access.tsx`, `server/supabaseAuth.ts`, `server/_core/context.ts` |
| Dashboard | `client/src/pages/Dashboard.tsx` |
| Catalog | `client/src/pages/Catalog.tsx` |
| PPMP and Purchase Requests | `client/src/pages/Workspace.tsx` |
| Pre-Canvass | `client/src/pages/WorkflowPages.tsx` |
| Abstract, approval, PO, delivery, PMR | `client/src/pages/WorkflowPages.tsx` |
| Admin setup | `client/src/pages/Setup.tsx` |
| Suppliers, plans, budgets, analytics, audit | `client/src/pages/ManagementPages.tsx`, `client/src/pages/Workspace.tsx` |
| Documents and official exports | `client/src/pages/Documents.tsx`, `client/src/lib/procurementPdf.ts`, `client/src/lib/procurementExports.ts` |
| Public tracking | `client/src/pages/PublicTracking.tsx` |
| Officer notices/transmittals/evaluations | `client/src/pages/OfficerPages.tsx` |
| Roles and state transitions | `shared/procurementRules.ts` |
| Database and application data access | `server/db.ts`, `drizzle/schema.ts`, `server/routers.ts` |
| Supabase runtime diagnostics | `server/_core/configCheck.ts`, `server/supabaseRealtime.ts` |
| Regression tests | `server/*.test.ts` |

---

## 18. Final user reminder

ProcureWise is designed to make each procurement action visible, attributable, and role-appropriate. The safest operating habit is to complete the record in the order required by the workflow, verify each status before moving forward, preserve correction history, and never use a shortcut that bypasses authorization or invents missing institutional data.

For the final defense, demonstrate not only the successful path but also one controlled validation rule, one role-gated action, one correction/resubmission path, one official document preview, and the public tracking boundary. Those demonstrations show that ProcureWise is a workflow system rather than only a collection of screens.

---

## References

- [ProcureWise repository](https://github.com/vinaaamariee/procurewise)
- [ProcureWise repository README](https://github.com/vinaaamariee/procurewise/blob/main/README.md)
- [ProcureWise Access page](https://procurewise-a5x2.vercel.app/access)
- [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
- [Supabase Realtime Broadcast documentation](https://supabase.com/docs/guides/realtime/broadcast)
- [Vercel deployment documentation](https://vercel.com/docs/deployments)

*Prepared for ProcureWise operational use and the 29 September 2026 final defense.*

---

## Appendix A — One-page End-User checklist

1. Sign in.
2. Open PPMP Planning.
3. Confirm a PPMP entry exists.
4. Open Catalog and select authorized items.
5. Set quantities.
6. Add selection to a new PR.
7. Complete purpose, office, expenditure object, PPMP, item costs, and authorized signatories.
8. Save the PR.
9. Confirm the PR number and tracking token.
10. Open Pre-Canvass.
11. Enter budget ceiling, deadline, delivery period, and evaluation basis.
12. Add three legitimate supplier quotations.
13. Verify compliance and delivery fields.
14. Confirm `3/3 SUPPLIERS`.
15. Forward the package.
16. Keep the PR number and tracking token for follow-up.

## Appendix B — One-page Officer checklist

1. Open the submitted package.
2. Verify PPMP/PR link and item schedule.
3. Verify three quotations.
4. Check compliance classifications.
5. Return with precise comments if incomplete.
6. Create the Abstract when complete.
7. Review lowest-compliant recommendation.
8. Calculate MCDM if required.
9. Prepare RFQ, notice, and transmittal records as authorized.
10. Wait for Administrative Approver decision.
11. Issue PO after approval.
12. Record delivery against the correct PO.
13. Log PMR after delivery.
14. Download or archive official documents.
15. Review audit history.

## Appendix C — One-page Administrator checklist

1. Configure entity and PO defaults.
2. Add offices.
3. Add objects of expenditure.
4. Record current-year budgets.
5. Add authorized Purchase Request signatories.
6. Register at least three legitimate suppliers.
7. Add supplier tags/offerings where needed.
8. Assign roles using least privilege.
9. Verify the deployment and Supabase configuration.
10. Test with isolated records.
11. Confirm official PDF output.
12. Record the final build and database target.
13. Rotate temporary credentials after the defense.

## Appendix D — Minimal incident record

When reporting a problem, include:

```text
Date/time:
Deployment URL:
User role:
User action:
Route:
Record number:
Expected result:
Actual result:
Exact error text:
Was a record created or changed?:
Browser:
Screenshot or console/network evidence:
Steps already tried:
```

Do not include passwords, access tokens, service-role keys, database passwords, or other secrets in the incident record.

## Appendix E — Demonstration scenario template

| Field | Demonstration value |
|---|---|
| Requesting office | Approved demo office |
| Object of expenditure | Approved demo object |
| PPMP purpose | Clearly labelled synthetic demonstration purpose |
| Item 1 | Synthetic catalog item |
| Item 2 | Synthetic catalog item |
| Quantity | Positive integer |
| Estimated unit cost | Synthetic planning estimate |
| Supplier 1 | Demo supplier record |
| Supplier 2 | Demo supplier record |
| Supplier 3 | Demo supplier record |
| Quote compliance | Two or three explicitly labelled demo outcomes |
| Delivery days | Positive or zero value according to scenario |
| Tracking token | Copy from the created demo PR; do not publish it |
| Cleanup | Follow Admin-approved test-record procedure; do not delete authentic records |

The scenario must be approved by the team before use and must not be confused with a real institutional procurement transaction.

---

**End of guide.**
