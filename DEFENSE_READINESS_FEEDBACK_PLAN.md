# ProcureWise Defense-Readiness Feedback Plan

**Project:** ProcureWise — Batanes State College Procurement Management System  
**End-user session:** Monday, September 21, 2026  
**Final defense:** Tuesday, September 29, 2026  
**Production access:** [ProcureWise Access Page](https://procurewise-a5x2.vercel.app/access)

## Purpose

The Monday session should validate whether ProcureWise is understandable and usable for its intended end users. It should be a guided, realistic task rather than a general product demonstration. Each participant should complete a short procurement scenario while the team records hesitation, errors, missing information, and questions about the official forms.

After the session, accept only changes that improve a required workflow, correct a government-form fidelity issue, or remove a blocking usability problem. Cosmetic requests should be recorded for later unless they can be implemented and safely retested before the defense.

## Current verification status

The production Access page is reachable. An unauthenticated request to `auth.me` correctly returns `null`. That result is expected before sign-in; the remaining live check is to sign in with a verified account and confirm that the authenticated profile bridge reaches the correct workspace.

The full local integration suite currently includes tests that require live Supabase PostgreSQL and Realtime connectivity. Those tests fail in the sandbox when the configured Supabase tenant cannot be reached, so they must not be treated as a complete production sign-in verification. The defense checklist therefore separates deterministic local checks from live Vercel/Supabase checks.

## Session preparation

Use a fresh browser session for every participant. Confirm that the deployed URL opens, the Access page loads, and a test account can sign in before beginning the walkthrough. Do not use real procurement records, real supplier quotations, or personal data during the demonstration.

Prepare one clearly labelled demonstration request with two or three catalog items, a realistic purpose, a sample budget, and three sample supplier quotations. Keep an offline copy of the scenario and expected outcomes in case the network connection is unstable.

### Demonstration accounts

| Role | Email | Password | Session purpose |
|---|---|---|---|
| End-User | `demo.enduser@procurewise.test` | Verify a temporary password before Monday | Create PPMP, select catalog items, create PR, and prepare Pre-Canvass |
| Procurement Officer | `demo.officer@procurewise.test` | `ProcureWiseDemo!2026` | Review packages, compare quotations, and create the Abstract |
| Admin | `demo.admin@procurewise.test` | `ProcureWiseDemo!2026` | Demonstrate role-gated administration and approval controls |

Before Monday, verify the End-User credential on the exact deployment URL. If it is unknown, reset it or create a fresh temporary account. Do not distribute a password that has not been tested.

## Guided end-user walkthrough

### 1. Access and workspace

Ask the participant to open the Access page and sign in. Ask what they expect to happen after pressing **Sign in**.

**Expected result:** The participant reaches the dashboard and sees navigation appropriate to the assigned role. No profile-bridge or workspace-loading error appears.

### 2. Catalog and saved selection

Ask the participant to open **Catalog** from the sidebar, search for two sample items, apply a category filter if needed, select both items, change one quantity, and review the saved selection. Ask whether editing and clearing the selection are clear.

**Expected result:** Selected items and quantities remain visible and can be handed off to a new Purchase Request.

### 3. PPMP and Purchase Request

Ask the participant to enter the sample purpose, office, fund cluster, planned items, and quantities. Then ask them to create a Purchase Request from the catalog selection. Ask whether the Appendix 60 structure matches the paper form and whether any required field is missing or unclear.

**Expected result:** The PR contains the selected items, editable fields, purpose, signatory fields, and the required government-form structure without changing the official meaning or order of fields.

### 4. Pre-Canvass and quotations

Ask the participant to prepare a Pre-Canvass package with three demonstration suppliers. Ask them to identify where each quotation is entered and how they know the package is ready for Procurement Officer review.

**Expected result:** Three quotations can be entered and the package can be submitted without guessing the next step.

### 5. Officer review and Abstract

Using the Officer account, ask the participant to open the submitted package, compare the quotations, identify the lowest compliant supplier, and review or generate the Abstract of Canvass.

**Expected result:** The Officer can trace the Abstract to the request and quotations and can identify the next required action.

### 6. Approval and Purchase Order

Using the Admin or Approver account, ask the participant to review and approve or return the package for correction. If approved, use the Officer account to demonstrate Purchase Order preparation using the Appendix 61 structure.

**Expected result:** Approval is role-gated, visible, and traceable. The Purchase Order retains the official structure and does not expose unauthorized controls.

## Feedback questions

Ask these questions immediately after each task and record exact wording where possible:

1. What did you expect to happen when you opened this page?
2. What part was easiest to understand?
3. Where did you hesitate or feel unsure about the next step?
4. Which label, field, button, or instruction was unclear?
5. Did the form look like the paper form currently used by your office?
6. Did any required government field appear to be missing, moved, or renamed?
7. Was the catalog-to-PR process faster or slower than the current process?
8. Could you tell which records were submitted, returned, approved, or still in progress?
9. What information would you need on the dashboard that is not shown now?
10. What is the single most important change you request before adoption?

## Observation record

| Participant or office | Task | Observation or exact quote | Severity | Suggested change | Decision |
|---|---|---|---|---|---|
|  |  |  | Blocking / High / Medium / Low |  |  |
|  |  |  | Blocking / High / Medium / Low |  |  |
|  |  |  | Blocking / High / Medium / Low |  |  |
|  |  |  | Blocking / High / Medium / Low |  |  |
|  |  |  | Blocking / High / Medium / Low |  |  |

## Change decision rubric

A **Blocking** issue prevents sign-in, prevents a required workflow action, loses entered data, assigns the wrong role, or produces an unusable official form. It must be fixed before the defense build is frozen.

A **High** issue causes repeated confusion in a required workflow, creates a serious traceability problem, or makes a government form materially inaccurate. Fix it if it can be tested safely before September 29.

A **Medium** issue improves clarity or speed but has a reliable workaround. Address it only after Blocking and High issues are closed.

A **Low** issue is cosmetic or outside the defense scope. Record it without allowing it to destabilize the build.

Every accepted change must have a corresponding test or manual verification step. Changes to authentication, database schema, role permissions, or official print layouts require a complete regression check before deployment.

## Defense build acceptance checklist

- [ ] Production Access page loads from a clean browser session.
- [ ] End-User registration or sign-in works with a verified account.
- [ ] Authenticated users reach the correct workspace without the profile-bridge error.
- [ ] Role-based navigation and server-side permissions match the assigned role.
- [ ] Catalog search, filtering, multi-selection, quantity editing, and saved selection work.
- [ ] Catalog selections hand off correctly into a new Purchase Request.
- [ ] PPMP, Purchase Request, Pre-Canvass, Abstract, approval, and Purchase Order flows can be demonstrated with sample data.
- [ ] Appendix 60, Annex D, and Appendix 61 print layouts preserve the supplied government structure.
- [ ] Print-only Batanes State College branding appears on printed or PDF output without distorting the editing form.
- [ ] Return-for-correction and resubmission status are understandable and traceable.
- [ ] No real personal data, real passwords, or real procurement records are used in the demonstration.
- [ ] The final deployed commit, environment variables, and database target are recorded.

## Timeline and change freeze

**September 19–20:** verify the deployment, demo credentials, profile bridge, database target, and deterministic build checks.  
**September 21:** run the end-user walkthrough and capture feedback.  
**September 22–24:** implement and test Blocking and High-priority changes.  
**September 25:** stop accepting non-critical feature requests.  
**September 26–27:** run the complete workflow regression and correct only confirmed defects.  
**September 28:** perform the final clean-browser acceptance checklist and capture evidence for the defense.  
**September 29:** present the frozen, evidence-supported build.

## References

[1]: https://procurewise-a5x2.vercel.app/access "ProcureWise production Access page"
[2]: https://supabase.com/docs/guides/auth "Supabase Auth documentation"
[3]: https://vercel.com/docs/deployments "Vercel deployment documentation"

The session uses the deployed ProcureWise application [1]. Authentication and deployment verification should follow the relevant platform documentation [2] [3].

**Prepared by:** Manus AI  
**Last updated:** September 19, 2026

## Security note

The demo credentials in this document are temporary testing credentials. Do not reuse them for real records. After the defense, rotate or delete them and review the Supabase Auth user list.

**Defense readiness principle:** stabilize first, observe real use, fix blockers, retest completely, and freeze the evidence-supported build.
