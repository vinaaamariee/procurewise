// Procwise Defense — All remaining route shells and UI kit
// Routes: /demo/approvals, /demo/audit, /demo/validation, /demo/governance, /demo/ui-kit

import { DefenseRouteShell } from "./DefenseRouteShell";
import DefenseShell from "@/components/defense/DefenseShell";
import {
  PwAlert,
  PwButton,
  PwEmptyState,
  PwLoadingRows,
  PwPanel,
  PwStatusBadge,
  SyntheticDataLabel,
} from "@/components/defense/PwComponents";

// =============================================================================
// /demo/approvals
// =============================================================================
export function DemoApprovalsPage() {
  return (
    <DefenseRouteShell
      pageTitle="Approvals"
      heading="Approval queue"
      purpose="Review and act on recommendations awaiting human decision."
      scheduledDay="Day 3"
      scheduledDate="September 23"
      willImplement="This page will list pending recommendations for REQ-2026-0929, allow the approver to select Approve, Modify, Reject, or Request Evidence, and record each action in the audit log."
    />
  );
}

// =============================================================================
// /demo/audit
// =============================================================================
export function DemoAuditPage() {
  return (
    <DefenseRouteShell
      pageTitle="Audit log"
      heading="Audit log"
      purpose="Every human and system event recorded with timestamps and actor identity."
      scheduledDay="Day 3"
      scheduledDate="September 23"
      willImplement="This page will show the persistent event history for REQ-2026-0929: submission, supplier quotes received, compliance issue flagged, recommendation generated, and final human decision."
    />
  );
}

// =============================================================================
// /demo/validation
// =============================================================================
export function DemoValidationPage() {
  return (
    <DefenseRouteShell
      pageTitle="Validation"
      heading="Validation evidence"
      purpose="Links measured test results to defense claims about scoring accuracy and compliance detection."
      scheduledDay="Day 4"
      scheduledDate="September 25"
      willImplement="This page will cite the vitest test suite results for the scoring function, seed data contract, compliance detection, and recommendation determinism. Claims will be traceable to specific test file and test name."
    />
  );
}

// =============================================================================
// /demo/governance
// =============================================================================
export function DemoGovernancePage() {
  return (
    <DefenseShell pageTitle="Governance">
      <div style={{ maxWidth: 680 }}>
        <h1 className="pw-page-title" style={{ marginBottom: "var(--pw-space-4)" }}>AI and governance controls</h1>
        <p className="pw-supporting-text" style={{ marginBottom: "var(--pw-space-6)" }}>
          How Procwise keeps humans in control of procurement decisions.
        </p>

        {[
          {
            heading: "Human authority is preserved",
            maturity: "implemented" as const,
            description:
              "Every recommendation is advisory. A human approver must explicitly approve, modify, or reject. No procurement commitment can be made without a recorded human decision.",
          },
          {
            heading: "Recommendations are deterministic",
            maturity: "implemented" as const,
            description:
              "Scores are computed by a transparent weighted function — no stochastic generation. The same inputs always produce the same output. The function is tested and its weights are declared.",
          },
          {
            heading: "Compliance blocks take precedence",
            maturity: "implemented" as const,
            description:
              "A missing mandatory evidence item disqualifies a quote regardless of its score. The reason is shown explicitly, not inferred.",
          },
          {
            heading: "AI-unavailable fallback",
            maturity: "planned" as const,
            description:
              "If the recommendation engine is unavailable, the system presents the raw comparison data and allows the human to decide without AI input. Planned for Day 4.",
          },
          {
            heading: "Audit trail is write-once",
            maturity: "planned" as const,
            description:
              "Every system and human event is appended to an immutable log. No decision event can be edited or deleted. Planned for Day 3.",
          },
          {
            heading: "Synthetic data is always labeled",
            maturity: "implemented" as const,
            description:
              'Every defense route shows the "Synthetic demo data" label. No customer record or production decision appears in the defense workspace.',
          },
        ].map((item) => (
          <PwPanel key={item.heading} variant="default" style={{ marginBottom: "var(--pw-space-4)" }}>
            <div style={{ display: "flex", gap: "var(--pw-space-3)", alignItems: "flex-start", marginBottom: "var(--pw-space-2)", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "var(--pw-font-size-md)", fontWeight: 600, color: "var(--pw-text)", flex: 1 }}>
                {item.heading}
              </h2>
              <PwStatusBadge variant={item.maturity === "implemented" ? "approved" : "planned"}>
                {item.maturity === "implemented" ? "Implemented" : "Planned"}
              </PwStatusBadge>
            </div>
            <p style={{ margin: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", lineHeight: "var(--pw-line-height-body)" }}>
              {item.description}
            </p>
          </PwPanel>
        ))}
      </div>
    </DefenseShell>
  );
}

// =============================================================================
// /demo/ui-kit — Internal visual QA (not in primary navigation)
// =============================================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--pw-space-12)" }}>
      <h2 className="pw-section-title" style={{ marginBottom: "var(--pw-space-6)", paddingBottom: "var(--pw-space-3)", borderBottom: "1px solid var(--pw-border)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--pw-space-4)", alignItems: "flex-start", marginBottom: "var(--pw-space-4)" }}>
      {children}
    </div>
  );
}

export function DemoUiKitPage() {
  return (
    <DefenseShell pageTitle="UI Kit">
      <div style={{ maxWidth: "var(--pw-content-max)" }}>
        <div style={{ marginBottom: "var(--pw-space-8)" }}>
          <h1 className="pw-page-title" style={{ marginBottom: "var(--pw-space-2)" }}>Defense UI Kit</h1>
          <p className="pw-supporting-text">
            Internal visual QA for all component states against the flat-UI theme. Not exposed in primary navigation.
          </p>
          <div style={{ marginTop: "var(--pw-space-4)" }}>
            <SyntheticDataLabel />
          </div>
        </div>

        {/* Buttons */}
        <Section title="Buttons">
          <Row>
            <PwButton variant="primary">Primary action</PwButton>
            <PwButton variant="secondary">Secondary</PwButton>
            <PwButton variant="text">Text / tertiary</PwButton>
            <PwButton variant="danger">Danger</PwButton>
          </Row>
          <Row>
            <PwButton variant="primary" disabled>Primary disabled</PwButton>
            <PwButton variant="secondary" disabled>Secondary disabled</PwButton>
            <PwButton variant="danger" disabled>Danger disabled</PwButton>
          </Row>
          <Row>
            <PwButton variant="primary" loading>Loading state</PwButton>
            <PwButton variant="secondary" loading>Loading secondary</PwButton>
          </Row>
        </Section>

        {/* Status badges */}
        <Section title="Status badges">
          <Row>
            <PwStatusBadge variant="neutral" />
            <PwStatusBadge variant="review" />
            <PwStatusBadge variant="pending-approval" />
            <PwStatusBadge variant="approved" />
            <PwStatusBadge variant="rejected" />
            <PwStatusBadge variant="missing-evidence" />
          </Row>
          <Row>
            <PwStatusBadge variant="synthetic" />
            <PwStatusBadge variant="prototype" />
            <PwStatusBadge variant="simulated" />
            <PwStatusBadge variant="planned" />
          </Row>
          <div style={{ marginTop: "var(--pw-space-2)" }}>
            <SyntheticDataLabel />
          </div>
        </Section>

        {/* Alerts */}
        <Section title="Alerts">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--pw-space-4)" }}>
            <PwAlert
              variant="info"
              title="Information"
              message="This is an informational alert with relevant context for the user."
            />
            <PwAlert
              variant="success"
              title="Success"
              message="The action completed successfully and was recorded in the audit log."
            />
            <PwAlert
              variant="warning"
              title="Missing evidence"
              message="Supplier C has the lowest quote, but required supplier due-diligence evidence is missing. Procwise cannot recommend this quote until the evidence is reviewed."
              action={<PwButton variant="secondary" style={{ marginTop: 4 }}>View evidence</PwButton>}
            />
            <PwAlert
              variant="error"
              title="Validation error"
              message="The approval could not be saved. Please check the required fields and try again."
            />
          </div>
        </Section>

        {/* Panels */}
        <Section title="Panels">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--pw-space-4)" }}>
            <PwPanel variant="default"><p style={{ margin: 0 }} className="pw-panel-title">Default panel</p><p className="pw-supporting-text" style={{ marginTop: 8 }}>One-pixel border, white surface, no shadow.</p></PwPanel>
            <PwPanel variant="subtle"><p style={{ margin: 0 }} className="pw-panel-title">Subtle panel</p><p className="pw-supporting-text" style={{ marginTop: 8 }}>Subtle surface tint for secondary content.</p></PwPanel>
            <PwPanel variant="selected"><p style={{ margin: 0 }} className="pw-panel-title">Selected panel</p><p className="pw-supporting-text" style={{ marginTop: 8 }}>Two-pixel aqua border for selected state.</p></PwPanel>
            <PwPanel variant="warning"><p style={{ margin: 0 }} className="pw-panel-title">Warning panel</p><p className="pw-supporting-text" style={{ marginTop: 8 }}>Warning surface for flagged content.</p></PwPanel>
            <PwPanel variant="error"><p style={{ margin: 0 }} className="pw-panel-title">Error panel</p><p className="pw-supporting-text" style={{ marginTop: 8 }}>Danger surface for errors.</p></PwPanel>
          </div>
        </Section>

        {/* Table — populated */}
        <Section title="Data table — populated">
          <PwPanel variant="default" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                    {["Supplier", "Price", "Delivery", "Warranty", "Compliance", "Score", "Evidence"].map((col) => (
                      <th key={col} style={{ padding: "12px 16px", textAlign: "left", fontSize: "var(--pw-font-size-xs)", fontWeight: 600, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Supplier A", price: "£11,600", delivery: "21 days", warranty: "3 years", compliance: <PwStatusBadge variant="approved">Complete</PwStatusBadge>, score: "81.5", evidence: <PwStatusBadge variant="approved">Available</PwStatusBadge> },
                    { name: "Supplier B", price: "£10,880", delivery: "14 days", warranty: "5 years", compliance: <PwStatusBadge variant="approved">Complete</PwStatusBadge>, score: "96.5", evidence: <PwStatusBadge variant="approved">Available</PwStatusBadge> },
                    { name: "Supplier C", price: "£9,920", delivery: "18 days", warranty: "2 years", compliance: <PwStatusBadge variant="missing-evidence" />, score: "61.6 ⚠", evidence: <PwStatusBadge variant="missing-evidence" /> },
                  ].map((row) => (
                    <tr key={row.name} style={{ borderBottom: "1px solid var(--pw-border)" }}>
                      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-text)" }}>{row.name}</td>
                      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{row.price}</td>
                      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{row.delivery}</td>
                      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{row.warranty}</td>
                      <td style={{ padding: "14px 16px" }}>{row.compliance}</td>
                      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-text)" }}>{row.score}</td>
                      <td style={{ padding: "14px 16px" }}>{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PwPanel>
        </Section>

        {/* Table — loading */}
        <Section title="Data table — loading state">
          <PwPanel variant="default" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                    {["Supplier", "Price", "Delivery", "Compliance", "Score"].map((col) => (
                      <th key={col} style={{ padding: "12px 16px", textAlign: "left", fontSize: "var(--pw-font-size-xs)", fontWeight: 600, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <PwLoadingRows columns={5} rows={3} />
                </tbody>
              </table>
            </div>
          </PwPanel>
        </Section>

        {/* Table — empty */}
        <Section title="Data table — empty state">
          <PwPanel variant="default" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                    {["Supplier", "Price", "Status"].map((col) => (
                      <th key={col} style={{ padding: "12px 16px", textAlign: "left", fontSize: "var(--pw-font-size-xs)", fontWeight: 600, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <PwEmptyState heading="No quotations received" description="Supplier quotes will appear here once submitted." />
                </tbody>
              </table>
            </div>
          </PwPanel>
        </Section>

        {/* Typography */}
        <Section title="Typography scale">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--pw-space-4)" }}>
            <p className="pw-page-title">Page title — 36px bold</p>
            <p className="pw-section-title">Section title — 28px semibold</p>
            <p className="pw-panel-title">Panel title — 20px semibold</p>
            <p className="pw-body-text">Body and controls — 16px regular. Used for main readable content, form inputs, and descriptive text that needs comfortable line spacing for reading.</p>
            <p className="pw-supporting-text">Supporting metadata — 14px, muted color. Never used for long paragraphs. Reserved for secondary info, timestamps, labels, and captions.</p>
            <p className="pw-label-text">Label text — 14px semibold. Used above form fields.</p>
          </div>
        </Section>

        {/* Focus example */}
        <Section title="Keyboard focus">
          <p className="pw-supporting-text" style={{ marginBottom: "var(--pw-space-4)" }}>
            Tab to each element to verify the 3px aqua focus ring. All interactive elements below must show the focus indicator.
          </p>
          <Row>
            <PwButton variant="primary">Tab to me</PwButton>
            <PwButton variant="secondary">And me</PwButton>
            <PwButton variant="text">And me</PwButton>
          </Row>
          <div style={{ marginTop: "var(--pw-space-4)" }}>
            <label htmlFor="kit-input" className="pw-label-text" style={{ display: "block", marginBottom: "var(--pw-space-2)" }}>
              Example text field
            </label>
            <input
              id="kit-input"
              type="text"
              placeholder="Tab to this field"
              style={{
                height: 44,
                width: 320,
                border: "1px solid var(--pw-border-strong)",
                borderRadius: "var(--pw-radius-md)",
                padding: "0 var(--pw-space-3)",
                fontSize: "var(--pw-font-size-md)",
                color: "var(--pw-text)",
                background: "var(--pw-surface)",
                display: "block",
              }}
            />
          </div>
        </Section>
      </div>
    </DefenseShell>
  );
}
