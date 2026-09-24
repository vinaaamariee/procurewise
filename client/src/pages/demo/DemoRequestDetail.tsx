// Procwise Defense — Request detail shell
// Route: /demo/requests/:id

import DefenseShell from "@/components/defense/DefenseShell";
import { PwAlert, PwPanel, PwStatusBadge } from "@/components/defense/PwComponents";
import { demoProcurementRepository } from "@/features/demo/data/demoProcurementRepository";
import { type PurchaseRequest } from "@/features/demo/domain/procurement.types";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "var(--pw-space-4)", padding: "var(--pw-space-3) 0", borderBottom: "1px solid var(--pw-border)" }}>
      <dt style={{ width: 160, flexShrink: 0, fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-text-muted)" }}>{label}</dt>
      <dd style={{ flex: 1, margin: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{value}</dd>
    </div>
  );
}

export default function DemoRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    demoProcurementRepository.getRequestById(params.id).then((r) => {
      if (r) setRequest(r);
      else setNotFound(true);
    });
  }, [params.id]);

  if (notFound) {
    return (
      <DefenseShell pageTitle="Request not found">
        <PwAlert variant="error" title="Request not found" message={`No demo request found with ID: ${params.id}`} />
        <Link href="/demo/requests" style={{ marginTop: "var(--pw-space-4)", display: "inline-block", color: "var(--pw-brand-800)", fontWeight: 600, textDecoration: "none" }}>
          ← Back to requests
        </Link>
      </DefenseShell>
    );
  }

  if (!request) {
    return (
      <DefenseShell pageTitle="Loading…">
        <p style={{ color: "var(--pw-text-muted)", fontSize: "var(--pw-font-size-sm)" }}>Loading request…</p>
      </DefenseShell>
    );
  }

  return (
    <DefenseShell pageTitle={request.id}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: "var(--pw-space-4)" }}>
        <ol style={{ display: "flex", gap: "var(--pw-space-2)", listStyle: "none", margin: 0, padding: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)" }}>
          <li><Link href="/demo/overview" style={{ color: "var(--pw-brand-800)", textDecoration: "none" }}>Overview</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/demo/requests" style={{ color: "var(--pw-brand-800)", textDecoration: "none" }}>Requests</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" style={{ color: "var(--pw-text)" }}>{request.id}</li>
        </ol>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: "var(--pw-space-6)", display: "flex", gap: "var(--pw-space-3)", flexWrap: "wrap", alignItems: "flex-start" }}>
        <h1 className="pw-page-title" style={{ flex: 1 }}>{request.title}</h1>
        <PwStatusBadge variant="review" />
        <PwStatusBadge variant="synthetic" />
      </div>

      {/* Request metadata */}
      <PwPanel variant="default" style={{ marginBottom: "var(--pw-space-6)" }}>
        <h2 className="pw-panel-title" style={{ marginBottom: "var(--pw-space-4)" }}>Request details</h2>
        <dl style={{ margin: 0 }}>
          <DetailRow label="Request ID" value={<code style={{ fontFamily: "monospace", fontSize: "var(--pw-font-size-sm)" }}>{request.id}</code>} />
          <DetailRow label="Department" value={request.department} />
          <DetailRow label="Category" value={request.category} />
          <DetailRow label="Quantity" value={`${request.quantity} units`} />
          <DetailRow label="Budget" value={<strong>{formatGBP(request.budget)}</strong>} />
          <DetailRow label="Required by" value={new Date(request.requiredBy).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} />
          <DetailRow label="Owner" value={request.owner} />
          <DetailRow label="Risk level" value={<PwStatusBadge variant="neutral">{request.risk.charAt(0).toUpperCase() + request.risk.slice(1)} risk</PwStatusBadge>} />
          <DetailRow label="Data" value={<PwStatusBadge variant="synthetic" />} />
        </dl>
      </PwPanel>

      {/* Comparison placeholder */}
      <PwPanel variant="subtle" style={{ marginBottom: "var(--pw-space-6)" }}>
        <div style={{ display: "flex", gap: "var(--pw-space-3)", alignItems: "flex-start", marginBottom: "var(--pw-space-3)", flexWrap: "wrap" }}>
          <h2 className="pw-panel-title">Supplier comparison &amp; recommendation</h2>
          <PwStatusBadge variant="prototype">Prototype — September 22</PwStatusBadge>
        </div>
        <p style={{ margin: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", lineHeight: "var(--pw-line-height-body)" }}>
          This panel will compare supplier quotations, policy checks, and evidence for request {request.id}.
          It will show weighted scores, a plain-language recommendation, and the compliance flag for Supplier C.
          Implementation is scheduled for September 22.
        </p>
        <div style={{ marginTop: "var(--pw-space-4)" }}>
          <PwAlert
            variant="warning"
            title="Missing evidence — preview"
            message="Supplier C has the lowest quote, but required supplier due-diligence evidence is missing. Procwise cannot recommend this quote until the evidence is reviewed."
          />
        </div>
      </PwPanel>

      {/* Quotes summary */}
      <PwPanel variant="default" style={{ marginBottom: "var(--pw-space-6)" }}>
        <h2 className="pw-panel-title" style={{ marginBottom: "var(--pw-space-4)" }}>Quotations ({request.quotes.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                {["Supplier", "Quote ID", "Total", "Delivery", "Warranty", "Compliance"].map((col) => (
                  <th key={col} style={{ padding: "10px 14px", textAlign: "left", fontSize: "var(--pw-font-size-xs)", fontWeight: 600, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {request.quotes.map((q) => {
                const allPass = q.complianceChecks.every((c) => c.state === "pass");
                const anyMissing = q.complianceChecks.some((c) => c.state === "missing");
                return (
                  <tr key={q.id} style={{ borderBottom: "1px solid var(--pw-border)" }}>
                    <td style={{ padding: "12px 14px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-text)" }}>{q.supplierName}</td>
                    <td style={{ padding: "12px 14px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", fontFamily: "monospace" }}>{q.id}</td>
                    <td style={{ padding: "12px 14px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-text)" }}>{formatGBP(q.total)}</td>
                    <td style={{ padding: "12px 14px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{q.deliveryDays} days</td>
                    <td style={{ padding: "12px 14px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{q.warrantyYears} years</td>
                    <td style={{ padding: "12px 14px" }}>
                      {anyMissing ? (
                        <PwStatusBadge variant="missing-evidence" />
                      ) : allPass ? (
                        <PwStatusBadge variant="approved">Complete</PwStatusBadge>
                      ) : (
                        <PwStatusBadge variant="neutral">Partial</PwStatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PwPanel>

      {/* Governance placeholder */}
      <PwPanel variant="subtle">
        <div style={{ display: "flex", gap: "var(--pw-space-3)", alignItems: "flex-start", marginBottom: "var(--pw-space-3)", flexWrap: "wrap" }}>
          <h2 className="pw-panel-title">Decision actions</h2>
          <PwStatusBadge variant="prototype">Prototype — September 23</PwStatusBadge>
        </div>
        <p style={{ margin: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", lineHeight: "var(--pw-line-height-body)" }}>
          Approve, modify, reject, or request additional evidence. Human decisions will be recorded in the audit log.
          Implementation is scheduled for September 23.
        </p>
      </PwPanel>
    </DefenseShell>
  );
}
