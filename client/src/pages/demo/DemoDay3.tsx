import { useCallback, useEffect, useState } from "react";
import DefenseShell from "@/components/defense/DefenseShell";
import { PwAlert, PwButton, PwPanel, PwStatusBadge, SyntheticDataLabel } from "@/components/defense/PwComponents";
import { demoEvidenceRepository, DEADLINE } from "@/features/demo/data/demoEvidenceRepository";
import type { EvidenceSnapshot } from "@/features/demo/domain/evidence.types";

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export function DemoValidationPage() {
  const [snapshot, setSnapshot] = useState<EvidenceSnapshot | null>(null);
  const [reason, setReason] = useState("Please submit the current supplier due-diligence record and accreditation evidence.");
  const [fileName, setFileName] = useState("supplier-c-due-diligence-demo.pdf");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ variant: "success" | "error"; text: string } | null>(null);
  const refresh = useCallback(() => { void demoEvidenceRepository.getSnapshot().then(setSnapshot); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function run(action: () => Promise<EvidenceSnapshot>) {
    setMessage(null);
    try { setSnapshot(await action()); setMessage({ variant: "success", text: "Evidence action recorded in the append-only audit history." }); }
    catch (error) { setMessage({ variant: "error", text: error instanceof Error ? error.message : "The evidence action could not be completed." }); }
  }

  if (!snapshot) return <DefenseShell pageTitle="Validation"><PwPanel variant="subtle"><p className="pw-supporting-text">Loading evidence workflow…</p></PwPanel></DefenseShell>;
  const evaluation = snapshot.governance.evaluations.find((item) => item.quote.supplierId === "SUP-C");
  const status = snapshot.submission.status;
  const accepted = status === "accepted";
  return <DefenseShell pageTitle="Validation">
    <div style={{ marginBottom: "var(--pw-space-6)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "var(--pw-space-4)", alignItems: "flex-start", flexWrap: "wrap" }}><div><h1 className="pw-page-title" style={{ marginBottom: "var(--pw-space-2)" }}>Evidence intake and review</h1><p className="pw-supporting-text">Procurement Officer workspace for receiving and validating supplier evidence. Suppliers submit outside ProcureWise; official acceptance remains with the officer.</p></div><SyntheticDataLabel /></div></div>
    {message && <div style={{ marginBottom: "var(--pw-space-4)" }}><PwAlert variant={message.variant} title={message.variant === "success" ? "Action recorded" : "Action not completed"} message={message.text} /></div>}
    <PwAlert variant="info" title="Synthetic evidence workflow" message="Supplier C is not rejected. It is pending evidence and remains visible. Only accepted mandatory evidence makes it eligible for the current recommendation." />
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, .85fr)", gap: "var(--pw-space-6)", alignItems: "start", marginTop: "var(--pw-space-6)" }}>
      <PwPanel variant={accepted ? "selected" : "warning"}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><p className="pw-eyebrow">REQ-2026-0929 · Supplier C</p><h2 className="pw-section-title" style={{ marginTop: 8 }}>Supplier due-diligence record</h2><p className="pw-supporting-text" style={{ marginTop: 6 }}>Current score: <strong>{evaluation?.score.toFixed(1)}</strong> · Current eligibility: <strong>{evaluation?.eligible ? "Eligible" : "Pending evidence"}</strong></p></div><PwStatusBadge variant={accepted ? "approved" : status === "correction_required" ? "missing-evidence" : "review"}>{status.replaceAll("_", " ")}</PwStatusBadge></div>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "10px 20px", margin: "var(--pw-space-6) 0 0", fontSize: "var(--pw-font-size-sm)" }}><dt style={{ color: "var(--pw-text-muted)" }}>Required by</dt><dd style={{ margin: 0 }}>Supplier due-diligence and accreditation evidence</dd><dt style={{ color: "var(--pw-text-muted)" }}>Deadline</dt><dd style={{ margin: 0 }}>{dateTime(snapshot.submission.dueAt ?? DEADLINE)}</dd><dt style={{ color: "var(--pw-text-muted)" }}>File</dt><dd style={{ margin: 0 }}>{snapshot.submission.fileName ?? "Not received"}</dd><dt style={{ color: "var(--pw-text-muted)" }}>Reviewer</dt><dd style={{ margin: 0 }}>{snapshot.submission.reviewedBy ?? "Not assigned"}</dd><dt style={{ color: "var(--pw-text-muted)" }}>Synthetic label</dt><dd style={{ margin: 0 }}>Synthetic demo evidence — no production document uploaded</dd></dl>
        <div style={{ marginTop: "var(--pw-space-6)" }}><h3 className="pw-panel-title">Evidence history</h3>{snapshot.history.length === 0 ? <p className="pw-supporting-text">No officer action recorded yet.</p> : <ol style={{ paddingLeft: 20, marginBottom: 0 }}>{snapshot.history.map((event) => <li key={event.id} style={{ marginTop: 8 }}><strong>{event.action.replaceAll("_", " ")}</strong> — {event.detail}<br /><span className="pw-supporting-text">{event.actor} · {dateTime(event.timestamp)} · Immutable</span></li>)}</ol>}</div>
      </PwPanel>
      <PwPanel variant="subtle"><h2 className="pw-section-title">Procurement Officer actions</h2><p className="pw-supporting-text" style={{ marginTop: 6 }}>Each action changes the evidence state and appends an audit event. Invalid transitions are rejected without changing the record.</p>
        {status === "missing" || status === "correction_required" ? <><label htmlFor="evidence-reason" style={labelStyle}>Instruction or correction reason</label><textarea id="evidence-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} style={inputStyle} /><PwButton type="button" style={{ width: "100%", marginTop: 12 }} onClick={() => run(() => demoEvidenceRepository.requestEvidence(reason))}>Request evidence</PwButton></> : null}
        {status === "requested" ? <><label htmlFor="evidence-file" style={labelStyle}>Synthetic file name</label><input id="evidence-file" value={fileName} onChange={(event) => setFileName(event.target.value)} style={inputStyle} /><label htmlFor="evidence-notes" style={labelStyle}>Receipt notes</label><textarea id="evidence-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} style={inputStyle} /><PwButton type="button" style={{ width: "100%", marginTop: 12 }} onClick={() => run(() => demoEvidenceRepository.recordEvidenceReceived({ fileName, notes }))}>Record evidence received</PwButton></> : null}
        {status === "received" ? <><PwButton type="button" style={{ width: "100%" }} onClick={() => run(() => demoEvidenceRepository.startEvidenceReview())}>Start review</PwButton><PwButton type="button" variant="secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => run(() => demoEvidenceRepository.returnForCorrection(reason))}>Return for correction</PwButton></> : null}
        {status === "under_review" ? <><label htmlFor="accept-notes" style={labelStyle}>Review notes</label><textarea id="accept-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} style={inputStyle} /><PwButton type="button" style={{ width: "100%" }} onClick={() => run(() => demoEvidenceRepository.acceptEvidence(notes))}>Accept evidence</PwButton><PwButton type="button" variant="secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => run(() => demoEvidenceRepository.returnForCorrection(reason))}>Return for correction</PwButton></> : null}
        {status === "accepted" ? <PwAlert variant="success" title="Evidence accepted" message="Supplier C's mandatory compliance evidence is complete. The supplier is now included in the eligibility recalculation." /> : null}
        <PwButton type="button" variant="text" style={{ width: "100%", marginTop: 18 }} onClick={() => run(async () => { await demoEvidenceRepository.reset(); return demoEvidenceRepository.getSnapshot(); })}>Reset evidence workflow</PwButton>
      </PwPanel>
    </div>
  </DefenseShell>;
}

const labelStyle: React.CSSProperties = { display: "block", marginTop: "var(--pw-space-5)", fontSize: "var(--pw-font-size-sm)", fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: "100%", marginTop: 6, padding: 10, border: "1px solid var(--pw-border-strong)", borderRadius: "var(--pw-radius-md)", background: "var(--pw-surface)", color: "var(--pw-text)", font: "inherit" };
