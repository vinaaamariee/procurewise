// Procwise Defense — Overview page
// Route: /demo/overview

import DefenseShell from "@/components/defense/DefenseShell";
import { PwAlert, PwPanel, PwStatusBadge } from "@/components/defense/PwComponents";
import { demoProcurementRepository } from "@/features/demo/data/demoProcurementRepository";
import { type PurchaseRequest } from "@/features/demo/domain/procurement.types";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function MetricCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        padding: "var(--pw-space-6)",
        borderRight: "1px solid var(--pw-border)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--pw-space-1)",
      }}
    >
      <p style={{ margin: 0, fontSize: "var(--pw-font-size-xs)", fontWeight: 600, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "var(--pw-font-size-xl)", fontWeight: 700, color: "var(--pw-text)", lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: "var(--pw-font-size-xs)", color: "var(--pw-text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: PurchaseRequest }) {
  return (
    <tr
      data-testid={`request-row-${request.id}`}
      style={{ borderBottom: "1px solid var(--pw-border)" }}
    >
      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-brand-900)", whiteSpace: "nowrap" }}>
        {request.id}
      </td>
      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>
        {request.title}
      </td>
      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", whiteSpace: "nowrap" }}>
        {request.department}
      </td>
      <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)", whiteSpace: "nowrap" }}>
        {formatGBP(request.budget)}
      </td>
      <td style={{ padding: "14px 16px" }}>
        <PwStatusBadge variant="review" />
      </td>
      <td style={{ padding: "14px 16px" }}>
        <PwStatusBadge variant="neutral">{request.risk.charAt(0).toUpperCase() + request.risk.slice(1)} risk</PwStatusBadge>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <Link
          href={`/demo/requests/${request.id}`}
          style={{
            fontSize: "var(--pw-font-size-sm)",
            color: "var(--pw-brand-800)",
            fontWeight: 600,
            textDecoration: "none",
            padding: "6px 12px",
            border: "1px solid var(--pw-border-strong)",
            borderRadius: "var(--pw-radius-md)",
            display: "inline-block",
          }}
        >
          View request →
        </Link>
      </td>
    </tr>
  );
}

export default function DemoOverviewPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    demoProcurementRepository.listRequests().then(setRequests);
  }, []);

  return (
    <DefenseShell pageTitle="Overview">
      {/* Page heading */}
      <div style={{ marginBottom: "var(--pw-space-8)" }}>
        <h1 className="pw-page-title">Procurement overview</h1>
        <p className="pw-supporting-text" style={{ marginTop: "var(--pw-space-2)" }}>
          Review synthetic requests that need evidence or human approval.
        </p>
      </div>

      {/* Metrics band */}
      <PwPanel
        variant="default"
        style={{ padding: 0, marginBottom: "var(--pw-space-8)", overflow: "hidden" }}
      >
        <div
          data-testid="overview-metrics"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          <MetricCell label="Open requests" value={1} />
          <MetricCell label="Needs review" value={1} />
          <MetricCell label="Pending approval" value={0} />
          <MetricCell
            label="Estimated opportunity"
            value="£720"
            sub="Supplier B vs A — see detail"
          />
        </div>
        <div style={{ borderTop: "1px solid var(--pw-border)", padding: "var(--pw-space-3) var(--pw-space-6)" }}>
          <p style={{ margin: 0, fontSize: "var(--pw-font-size-xs)", color: "var(--pw-text-muted)" }}>
            Opportunity value is based on the synthetic comparison between Supplier A (£11,600) and Supplier B (£10,880) for request REQ-2026-0929.
          </p>
        </div>
      </PwPanel>

      {/* Needs review section */}
      <div style={{ marginBottom: "var(--pw-space-4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 className="pw-section-title">Needs review</h2>
        <PwStatusBadge variant="review">{requests.length} request{requests.length !== 1 ? "s" : ""}</PwStatusBadge>
      </div>

      {requests.some((r) => r.quotes.some((q) => q.complianceChecks.some((c) => c.state === "missing"))) && (
        <div style={{ marginBottom: "var(--pw-space-4)" }}>
          <PwAlert
            variant="warning"
            title="Missing evidence detected"
            message="Supplier C has the lowest quote, but required supplier due-diligence evidence is missing. Procwise cannot recommend this quote until the evidence is reviewed."
          />
        </div>
      )}

      {/* Request table */}
      <PwPanel variant="default" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                {["Request ID", "Title", "Department", "Budget", "Status", "Risk", "Action"].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "var(--pw-font-size-xs)",
                      fontWeight: 600,
                      color: "var(--pw-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--pw-text-muted)", fontSize: "var(--pw-font-size-sm)" }}>
                    Loading…
                  </td>
                </tr>
              ) : (
                requests.map((r) => <RequestRow key={r.id} request={r} />)
              )}
            </tbody>
          </table>
        </div>
      </PwPanel>
    </DefenseShell>
  );
}
