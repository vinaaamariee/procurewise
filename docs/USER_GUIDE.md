# ProcureWise Comprehensive User Guide
## Batanes State College Automated Procurement Management System
### Standard Operating Manual for RA 12009 (NGPA) & BSC Institutional Procedures 5.1 – 5.15

---

## Table of Contents
1. [Introduction & Architectural Framework](#1-introduction--architectural-framework)
2. [User Roles & Access Permissions Matrix](#2-user-roles--access-permissions-matrix)
3. [System Access & Authentication](#3-system-access--authentication)
4. [Step-by-Step Procurement Workflow](#4-step-by-step-procurement-workflow)
   - [Phase 1: PPMP Upload & Purchase Request (End-User)](#phase-1-ppmp-upload--purchase-request-end-user)
   - [Phase 2: Requisition Verification (Procurement Officer II)](#phase-2-requisition-verification-procurement-officer-ii)
   - [Phase 3: PMR Logging & Tracking Slip (Procurement Staff)](#phase-3-pmr-logging--tracking-slip-procurement-staff)
   - [Phase 4: BAC Resolution & RFQ Preparation (BAC & Staff)](#phase-4-bac-resolution--rfq-preparation-bac--staff)
   - [Phase 5: Canvassing, PhilGEPS Posting & Retrieval (Officer I)](#phase-5-canvassing-philgeps-posting--retrieval-officer-i)
   - [Phase 6: Abstract of Quotations & MEARB Evaluation (BAC Secretariat)](#phase-6-abstract-of-quotations--mearb-evaluation-bac-secretariat)
   - [Phase 7: Award Recommendation & Letter of Notice (BAC, Staff, HoPE, Officer I)](#phase-7-award-recommendation--letter-of-notice-bac-staff-hope-officer-i)
   - [Phase 8: Purchase Order, Budget Obligation & Signing (Staff, Budget, HoPE, Officer I)](#phase-8-purchase-order-budget-obligation--signing-staff-budget-hope-officer-i)
   - [Phase 9: Delivery, Inspection (IAR) & PMR Archiving (Officer II & Inspector)](#phase-9-delivery-inspection-iar--pmr-archiving-officer-ii--inspector)
5. [Key System Features & Tools](#5-key-system-features--tools)
   - [Public Tracking Slip Portal](#public-tracking-slip-portal)
   - [Document Attachment & Archive Engine](#document-attachment--archive-engine)
   - [Official PDF Form Generation](#official-pdf-form-generation)
   - [RA 12009 Anti-Splitting & Ceiling Safeguards](#ra-12009-anti-splitting--ceiling-safeguards)
6. [Administrator Controls & Master Data Maintenance](#6-administrator-controls--master-data-maintenance)
7. [Troubleshooting, Error Resolution & FAQ](#7-troubleshooting-error-resolution--faq)

---

## 1. Introduction & Architectural Framework

**ProcureWise** is the official digital procurement management system of **Batanes State College (BSC)**. It digitizes, automates, and provides strict accountability controls across the entire procurement lifecycle—from annual planning to project archiving.

### Regulatory & Institutional Foundations:
1. **Republic Act No. 12009 (New Government Procurement Act / NGPA)**: Enforces open contracting, digital transparency, multi-criteria decision making (MCDM / MEARB), and strict prohibitions against the artificial splitting of requisitions (Section 5.1.1).
2. **BSC Institutional Procedures 5.1 through 5.15**: Dictates the exact division of responsibilities across nine specialized procurement roles.
3. **Commission on Audit (COA) Circulars**: Mandates documentary completeness (Appendix 60 PR, Quotations, Abstract of Canvass, Purchase Orders, and Inspection & Acceptance Reports).

---

## 2. User Roles & Access Permissions Matrix

ProcureWise enforces strict **Role-Based Access Control (RBAC)** on both the client interface and server API.

| Role Code | Institutional Title | Primary Operational Responsibility | Allowed System Actions |
|---|---|---|---|
| `end_user` | **Requesting Unit / Department Faculty & Staff** | Identifies procurement needs, uploads department PPMP, conducts preliminary market scans, and submits Purchase Requests. | Upload PPMP document; Draft PR; PhilGEPS catalog lookup; Appendix 60 canvas; Submit PR. |
| `procurement_officer_ii` / `procurement_officer` | **Procurement Officer II** | Receiving & Verification Gatekeeper under Procedure 5.1; Delivery Monitoring under Procedure 5.15. | Verify PR & PPMP alignment; Return for revision with comments; Verify & endorse; Monitor physical delivery. |
| `procurement_staff` | **Procurement Staff** | Requisition logging, Procurement Monitoring Report (PMR) custody, and document preparation (RFQ, Notice of Award, PO). | Log PR into PMR (5.2); Generate Tracking Slip; Draft and forward Letter of Notice to HoPE for approval (5.9); Draft RFQ (5.4) and PO (5.11). |
| `procurement_officer_i` | **Procurement Officer I** | External market transmittal, PhilGEPS posting, and document serving. | Post RFQ to PhilGEPS (5.6); Distribute & retrieve RFQs (5.5); Serve Notice of Award (5.10); Release PO to Supplier (5.13). |
| `bac_secretariat` / `bac_member` | **BAC Secretariat / Committee** | Resolution formulation, quotation opening, Abstract of Quotations, and supplier evaluation. | Prepare Mode of Procurement Resolution (5.3); Encode supplier quotations; Review the Abstract and recommend award to the HoPE for the Single or Lowest Calculated and Responsive Quotation (5.8). |
| `budget_officer` | **Budget Officer** | Fund availability certification and statutory obligation. | Review PO against appropriations; Assign BURS / ALOBS tracking number; Certify fund availability (5.12). |
| `hope` / `administrative_approver` | **Head of the Procuring Entity (HoPE) / College President** | Executive governance, award decisions, and contract execution. | Review and decide on the BAC award recommendation (5.8); Approve the Letter of Notice and enter into contract with the selected supplier (5.9); Sign Official Purchase Order & Contract (5.12). |
| `admin` | **System Administrator** | Master data management, user role provisioning, supplier accreditation, and system audit log review. | Manage Users & Roles; Configure Offices & Expenditure Codes; Maintain Supplier Registry; Inspect Audit Trail. |

---

## 3. System Access & Authentication

### 3.1 Sign In (Registered Users)
1. Open the ProcureWise portal in your browser by navigating to `/access` on your deployed application URL (e.g., `https://<your-project>.vercel.app/access`).
2. Enter your institutional email address (e.g., `user@bsc.edu.ph` or pre-provisioned demo account).
3. Enter your password (minimum 6 characters).
4. Click **"Sign in securely"**.
5. The system verifies credentials via Supabase Auth and loads your role-specific dashboard.

### 3.2 End-User Self-Registration
1. On the access page, toggle to **"Register"** (or open `/access?mode=register`).
2. Enter your Full Name, Department / College Office, and institutional password.
3. Enter your email address.
   > **Note:** End-User registration strictly requires an authorized institutional domain (`@bsc.edu.ph`). Non-institutional domains are rejected.
4. Click **"Create Account"**. Upon successful verification, your account is immediately activated with the `end_user` role.

---

## 4. Step-by-Step Procurement Workflow

```
   [End-User]                     [Procurement Officer II]            [Procurement Staff]
1. Upload/Select PPMP        -->  2. Verify PR & PPMP Alignment   --> 3. Log into PMR
   Draft & Submit PR                 (Procedure 5.1)                      Generate Tracking Slip
                                                                          (Procedure 5.2)
                                                                                  │
   [Procurement Officer I]        [BAC Secretariat / Committee]                   ▼
5. Post RFQ to PhilGEPS      <--  4. Open Quotes, Compile Abstract  <-- 4. Draft Mode Resolution
   Distribute & Retrieve RFQ         & Run MEARB Scoring                   & RFQ Package
   (Procedures 5.5 - 5.6)            (Procedures 5.7 - 5.8)                (Procedures 5.3 - 5.4)
           │
           ▼
   [HoPE / President]             [Procurement Staff & Officer I]     [Budget Officer]
6. Approve BAC Resolution    -->  7. Prepare & Serve Notice of Award --> 8. Certify Funds (BURS)
   (Procedure 5.8)                   (Procedures 5.9 - 5.10)              & Obligate Budget
                                                                          (Procedure 5.12)
                                                                                  │
   [Inspector & Officer II]       [Procurement Officer I]                         ▼
10. Inspect Goods (IAR)       <-- 9. Release Signed PO to Supplier   <-- 9. HoPE Signs PO Contract
    Close PMR (5.14 - 5.15)          (Procedure 5.13)                      (Procedure 5.12)
```

---

### Phase 1: PPMP Upload & Purchase Request (End-User)

Under RA 12009 and BSC Institutional Policy, **no Purchase Request can be initiated without a verified Project Procurement Management Plan (PPMP)**. ProcureWise enforces this through a 2-Step requisition wizard:

#### Step 1: PPMP Prerequisite Gate
1. Navigate to **Requisitions** $\rightarrow$ Click **"+ New Purchase Request"** (or click **"Upload Department PPMP"** in the top action bar).
2. Choose your PPMP Mode:
   - **Upload Own Department PPMP (Recommended for new projects)**:
     - Drag & drop or browse your PPMP file (`.pdf`, `.xlsx`, `.xls`, `.docx`, or scan image up to 14MB).
     - Enter the **Project Title** (e.g., *"Procurement of Laboratory Equipment for College of Engineering"*).
     - Select your **Department / Office** (e.g., *College of Engineering*).
     - Enter the **Fiscal Year** (e.g., *2026*).
     - Select the **Object of Expenditure** (e.g., *5-02-03-010 Office Supplies Expense*).
     - Enter the **Planned PPMP Budget Ceiling (₱)** (e.g., *₱250,000.00*).
   - **Select Registered PPMP**:
     - Choose from previously approved PPMP entries already registered in the system for your department.
3. Click **"Confirm PPMP & Proceed to Purchase Request →"**.
4. The system locks in your verified PPMP baseline and advances you to Step 2.

#### Step 2: PR Formulation Bound to PPMP
1. **Active Verified PPMP Banner**:
   - The top banner displays the verified PPMP Title, Office, Fiscal Year, and Budget Ceiling.
   - If you need to make changes, click `[Change / Re-upload PPMP]`.
2. **Item Specification & Canvas (Appendix 60)**:
   - Use the **PhilGEPS Virtual Store Search** bar to check standard government descriptions and price reference ceilings.
   - Enter **Item Description**, **Unit of Measure** (e.g., *pcs, reams, units*), **Quantity**, and **Estimated Unit Cost**.
   - The system automatically calculates total estimated cost and runs the **Budget Ceiling Safeguard**:
     - *If PR Total > PPMP Ceiling*: A prominent warning appears preventing budget overruns.
3. **Section 5.1.1 Anti-Splitting Segregation Check**:
   - The system warns you if items from different procurement categories are bundled inappropriately.
4. **Signatories & Supporting Documents**:
   - Select your Recommending Approver and Head of Office.
   - Attach your preliminary market scan or pre-canvass quotation files if already conducted.
5. Click **"Submit Purchase Request for Verification"**.
6. The system generates a unique **PR Tracking Token** (e.g., `PR-2026-ENG-0012`) and transmits the package to Procurement Officer II.

---

### Phase 2: Requisition Verification (Procurement Officer II)
*Governing Rule: BSC Procedure 5.1*

1. Sign in as **Procurement Officer II**.
2. Open the **"Requisition Verification Queue"**.
3. Select an incoming PR to open the **Verification Dossier**:
   - **PPMP Completeness**: Verifies if the attached PPMP document is legible and officially endorsed.
   - **Budget Ceiling Check**: Verifies that the PR total does not exceed the allotted PPMP allocation.
   - **Item Specifications**: Verifies that specifications are generic and do not reference proprietary brand names (strictly prohibited under RA 12009).
4. **Action Selection**:
   - **Verify & Endorse**: Enter verification findings and click **"Approve & Endorse to Procurement Staff"**. The PR status transitions to `verified`.
   - **Return for Revision**: Provide clear, specific corrective instructions in the remarks box and click **"Return to End-User"**. The PR is returned to the End-User for adjustment with all remarks logged in the audit trail.

---

### Phase 3: PMR Logging & Tracking Slip (Procurement Staff)
*Governing Rule: BSC Procedure 5.2*

1. Sign in as **Procurement Staff**.
2. Open the **"PMR Log & Tracking Slip Registry"**.
3. Select the verified PR.
4. System automatically fills:
   - PR Number, Requesting Department, Approved Budget for the Contract (ABC), and Expenditure Code.
5. Click **"Generate Procurement Tracking Slip"**:
   - Assigns the official BSC physical tracking slip number.
   - Enters the milestone into the **Procurement Monitoring Report (PMR)** table.
6. Print the generated **Procurement Tracking Slip** (with QR / Tracking Token) and attach it to the physical procurement folder.

---

### Phase 4: BAC Resolution & RFQ Preparation (BAC & Staff)
*Governing Rules: BSC Procedures 5.3 & 5.4*

1. **BAC Secretariat / BAC**:
   - Reviews the ABC threshold and nature of procurement.
   - Selects the appropriate procurement modality under RA 12009:
     - *Small Value Procurement (Section 53.9)*
     - *Shopping (Section 52.1)*
     - *Direct Contracting / Agency-to-Agency*
     - *Competitive Public Bidding*
   - Clicks **"Generate BAC Mode Resolution"** and signs off.
2. **Procurement Staff**:
   - Opens the approved PR and clicks **"Prepare Request for Quotation (RFQ)"**.
   - Sets the RFQ submission deadline, technical specifications, and delivery terms.
   - Generates official RFQ documents for supplier issuance.

---

### Phase 5: Canvassing, PhilGEPS Posting & Retrieval (Officer I)
*Governing Rules: BSC Procedures 5.5 & 5.6*

1. Sign in as **Procurement Officer I**.
2. **PhilGEPS Posting (for requisitions exceeding statutory threshold)**:
   - Click **"Record PhilGEPS Posting"**.
   - Input the **PhilGEPS Reference Number**, date posted, and closing date.
3. **RFQ Distribution**:
   - Issue RFQs to at least three (3) accredited, technically eligible suppliers from the Supplier Registry.
   - Record distribution dates and confirmation receipts.
4. **Retrieval**:
   - Upon deadline expiration, collect sealed/submitted quotations and endorse the unopened folder to the BAC Secretariat under Procedure 5.7.

---

### Phase 6: Abstract of Quotations & MEARB Evaluation (BAC Secretariat)
*Governing Rules: BSC Procedures 5.7 & 5.8 (RA 12009)*

1. Sign in as **BAC Secretariat** or **BAC Member**.
2. Open **"Abstract of Quotations"** for the project.
3. Click **"Encode Supplier Bids / Quotations"**:
   - Select the supplier from the accredited registry (or register a new supplier with PhilGEPS #, Tax Clearance, and Mayor's Permit).
   - Input offered unit prices per item line.
   - Mark compliance checkboxes: *Technical Specifications Met*, *Delivery Schedule Compliant*, *Tax Documents Valid*.
4. **Run MEARB / MCDM Best-Value Scoring (RA 12009)**:
   - For goods and consulting requiring best-value evaluation, the system executes Multi-Criteria Decision Making:
     $$\text{Score} = w_{\text{financial}} \times \text{FinancialScore} + w_{\text{technical}} \times \text{TechnicalScore} + w_{\text{delivery}} \times \text{DeliveryScore}$$
   - The system highlights the **Most Economically Advantageous Responsive Bid (MEARB)** or **Lowest Calculated Responsive Bid (LCRB)**.
5. Click **"Generate Abstract of Quotations (AOQ)"** to produce the official comparative matrix PDF.
6. The BAC signs the **BAC Resolution Recommending Award**.

---

### Phase 7: Award Recommendation & Letter of Notice (BAC, Staff, HoPE, Officer I)
*Governing Rules: BSC Procedures 5.8, 5.9 & 5.10*

1. **Procurement Staff**:
   - Prepares the Letter of Notice from the approved BAC award recommendation and submits it to the HoPE for approval.
   - The award notice remains pending and cannot be issued or served before HoPE approval.
2. **HoPE / Administrative Approver**:
   - Reviews and approves the Letter of Notice.
   - Upon approval, immediately enters into contract with the selected supplier; the subsequent PO, budget obligation, signing, and release steps document and formalize the transaction.
3. **Procurement Officer I**:
   - Delivers/serves the Notice of Award to the winning supplier.
   - Records the date served and attaches the signed acknowledgment copy.

---

### Phase 8: Purchase Order, Budget Obligation & Signing (Staff, Budget, HoPE, Officer I)
*Governing Rules: BSC Procedures 5.11, 5.12 & 5.13*

1. **Procurement Staff (Procedure 5.11)**:
   - Clicks **"Generate Official Purchase Order"**.
   - Sets payment terms, delivery period (calendar days), and delivery venue (BSC Main Campus).
2. **Budget Officer (Procedure 5.12)**:
   - Signs in and accesses the **Budget Obligation Desk**.
   - Verifies the availability of funds against the current General Appropriations Act (GAA) or Income Fund.
   - Inputs the official **ALOBS / BURS Number** (Budget Utilization Request and Status).
   - Clicks **"Certify Funds Available"**.
3. **HoPE / President (Procedure 5.12)**:
   - Reviews the Obligated PO and executes the final signature.
4. **Procurement Officer I (Procedure 5.13)**:
   - Releases the approved PO to the winning supplier.
   - Records the supplier's signed conformity date (starts the official delivery countdown).

---

### Phase 9: Delivery, Inspection (IAR) & PMR Archiving (Officer II & Inspector)
*Governing Rules: BSC Procedures 5.14 & 5.15*

1. **Supplier Delivery**: Goods arrive at the BSC Supply and Property Office.
2. **Procurement Officer II & Property Inspector**:
   - Access **"Delivery Monitoring & Inspection"**.
   - Compare physical items against the PO specifications.
   - Record delivery date, delivery receipt (DR) number, and sales invoice number.
   - Complete the **Inspection and Acceptance Report (IAR)**:
     - *Verified Complete & Accepted*, or
     - *Partial / Rejected with Deficiency Notice*.
3. **Supplier Performance Rating**:
   - Rate the supplier (1 to 5 stars) on Quality, On-time Delivery, and Customer Service.
4. **PMR Closure & Archive**:
   - Procurement Staff marks the transaction as **"Completed"**.
   - The entire document package (PPMP, PR, Tracking Slip, RFQ, Quotes, AOQ, Resolution, Notice, PO, BURS, IAR) is locked into the digital archive for COA audit compliance.

---

## 5. Key System Features & Tools

### Public Tracking Slip Portal
- Accessible from the main navigation without requiring a user login: `/tracking`.
- Anyone with a valid **PR Tracking Token** or **Tracking Slip Number** can inspect real-time progress:
  - Current workflow milestone
  - Responsible office handling the folder
  - Time elapsed at current stage
  - Public audit logs (confidential financial quotes remain protected)

### Document Attachment & Archive Engine
- Accepts `.pdf`, `.xlsx`, `.xls`, `.docx`, and scanned images up to 14MB.
- File attachments are encrypted and linked directly to their respective transaction entities (`app_ppmp_entry`, `purchase_request`, `purchase_order`, `inspection_report`).

### Official PDF Form Generation
ProcureWise includes built-in, COA-standard layout engines for one-click PDF generation:
- **Appendix 60 Purchase Request (PR)**
- **Abstract of Quotations / Canvass (AOQ)**
- **Purchase Order (PO)**
- **BAC Resolution of Award**
- **Inspection & Acceptance Report (IAR)**

### RA 12009 Anti-Splitting & Ceiling Safeguards
- **PPMP Budget Ceiling Barrier**: Automatically prevents submitting PRs whose total sum exceeds the authorized department PPMP budget ceiling.
- **Section 5.1.1 Splitting Heuristic**: Flags multiple requisitions created within short intervals for identical object codes to prevent circumventing public bidding thresholds.

---

## 6. Administrator Controls & Master Data Maintenance

Administrators (`admin`) manage system-wide parameters via the **Admin Console**:
1. **User Role Management**: Change user roles, assign departments, and unlock accounts.
2. **Department / Office Directory**: Add academic departments, administrative divisions, and research centers.
3. **Expenditure Objects**: Maintain standard COA accounts (e.g., 5-02-03-010 Office Supplies, 5-02-03-080 Medical Supplies).
4. **Supplier Registry**: Accredit vendors, record PhilGEPS registration numbers, and flag blacklisted or non-performing vendors.
5. **System Audit Trail**: Inspect immutable system logs recording every status change, document upload, and user login timestamp.

---

## 7. Troubleshooting, Error Resolution & FAQ

### Q1: Why is the "Confirm PPMP & Proceed to Purchase Request" button disabled?
- **Cause**: Either you have not attached a PPMP file or you have left one of the mandatory fields blank (Project Title, Department, Fiscal Year, Expenditure Object, or Budget Ceiling).
- **Fix**: Fill in all required fields and ensure the uploaded file has finished loading (shows the green badge).

### Q2: Why does the system say "PR Total Exceeds PPMP Budget Ceiling"?
- **Cause**: The combined item quantities and estimated costs in Step 2 exceed the budget ceiling specified in Step 1.
- **Fix**: Adjust item quantities, reduce estimated unit prices, or click `[Change / Re-upload PPMP]` if your approved PPMP has a higher ceiling.

### Q3: Why am I getting an "Invalid Institutional Email Domain" error during signup?
- **Cause**: Self-registration is restricted to verified college faculty and personnel with an authorized `@bsc.edu.ph` address.
- **Fix**: Register using your official Batanes State College email address, or contact the System Administrator for pre-provisioned access.

### Q4: I uploaded an Excel file for my PPMP, but I need to replace it. How do I do that?
- **Fix**: In Step 2 of the requisition wizard, click the red **`[Change / Re-upload PPMP]`** button at the top right of the Active Verified PPMP Banner. This takes you back to Step 1 where you can upload a new file.

### Q5: How do I export documents for Commission on Audit (COA) inspection?
- **Fix**: Authorized roles (Officer II, Staff, BAC, Admin) can click the **"Export PDF"** button on any completed PR, Abstract, or Purchase Order screen to download the official print-ready document.

---

*Manual prepared for Batanes State College ProcureWise System Deployment.*  
*Compliant with RA 12009 (NGPA) & BSC Institutional Operating Procedures.*
