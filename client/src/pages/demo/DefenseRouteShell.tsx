// Procwise Defense — Route shell helper
// Used for Day 1 placeholder routes that are not yet implemented.

import DefenseShell from "@/components/defense/DefenseShell";
import { PwPanel, PwStatusBadge } from "@/components/defense/PwComponents";
import { Link } from "wouter";

interface RouteShellProps {
  pageTitle: string;
  heading: string;
  purpose: string;
  scheduledDay: string;
  scheduledDate: string;
  willImplement: string;
}

export function DefenseRouteShell({
  pageTitle,
  heading,
  purpose,
  scheduledDay,
  scheduledDate,
  willImplement,
}: RouteShellProps) {
  return (
    <DefenseShell pageTitle={pageTitle}>
      <div style={{ maxWidth: 640 }}>
        {/* Heading + badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--pw-space-3)", marginBottom: "var(--pw-space-4)", flexWrap: "wrap" }}>
          <h1 className="pw-page-title">{heading}</h1>
          <PwStatusBadge variant="prototype">Prototype</PwStatusBadge>
        </div>

        <p className="pw-supporting-text" style={{ marginBottom: "var(--pw-space-6)" }}>
          {purpose}
        </p>

        <PwPanel variant="subtle" style={{ marginBottom: "var(--pw-space-6)" }}>
          <p
            style={{
              margin: 0,
              fontSize: "var(--pw-font-size-sm)",
              fontWeight: 600,
              color: "var(--pw-text)",
              marginBottom: "var(--pw-space-2)",
            }}
          >
            Prototype — scheduled for {scheduledDate} ({scheduledDay})
          </p>
          <p style={{ margin: 0, fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)", lineHeight: "var(--pw-line-height-body)" }}>
            {willImplement}
          </p>
        </PwPanel>

        <Link
          href="/demo/overview"
          style={{
            fontSize: "var(--pw-font-size-sm)",
            color: "var(--pw-brand-800)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Back to Overview
        </Link>
      </div>
    </DefenseShell>
  );
}
