// Procwise Defense — Request list page
// Route: /demo/requests

import DefenseShell from "@/components/defense/DefenseShell";
import { PwPanel, PwStatusBadge } from "@/components/defense/PwComponents";
import { demoProcurementRepository } from "@/features/demo/data/demoProcurementRepository";
import { type PurchaseRequest } from "@/features/demo/domain/procurement.types";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    demoProcurementRepository.listRequests().then(setRequests);
  }, []);

  return (
    <DefenseShell pageTitle="Requests">
      <div style={{ marginBottom: "var(--pw-space-8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--pw-space-3)", marginBottom: "var(--pw-space-2)", flexWrap: "wrap" }}>
          <h1 className="pw-page-title">Purchase requests</h1>
          <PwStatusBadge variant="prototype">Prototype — search and filters Day 2</PwStatusBadge>
        </div>
        <p className="pw-supporting-text">
          Review and act on open procurement requests. Search, filter, and export will be enabled on September 22.
        </p>
      </div>

      <PwPanel variant="default" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--pw-surface-subtle)", borderBottom: "1px solid var(--pw-border)" }}>
                {["Request ID", "Title", "Department", "Budget", "Status", "Risk", "Owner", "Updated", "Action"].map((col) => (
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
              {requests.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid var(--pw-border)" }}
                >
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", fontWeight: 600, color: "var(--pw-brand-900)", whiteSpace: "nowrap" }}>{r.id}</td>
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)" }}>{r.title}</td>
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", whiteSpace: "nowrap" }}>{r.department}</td>
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text)", whiteSpace: "nowrap" }}>{formatGBP(r.budget)}</td>
                  <td style={{ padding: "14px 16px" }}><PwStatusBadge variant="review" /></td>
                  <td style={{ padding: "14px 16px" }}><PwStatusBadge variant="neutral">{r.risk.charAt(0).toUpperCase() + r.risk.slice(1)} risk</PwStatusBadge></td>
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", whiteSpace: "nowrap" }}>{r.owner}</td>
                  <td style={{ padding: "14px 16px", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Link
                      href={`/demo/requests/${r.id}`}
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
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PwPanel>
    </DefenseShell>
  );
}
