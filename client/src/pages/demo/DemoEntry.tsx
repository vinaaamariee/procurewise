// Procwise Defense — Demo entry page
// Route: /demo — no authentication required

import { PwButton, SyntheticDataLabel } from "@/components/defense/PwComponents";
import { useLocation } from "wouter";

export default function DemoEntryPage() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="pw-shell"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "var(--pw-space-8)",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--pw-space-3)", marginBottom: "var(--pw-space-8)" }}>
          <img
            src="/bsc-logo.jpg"
            alt="Batanes State College"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              objectFit: "contain",
              border: "2px solid var(--pw-brand-500)",
              backgroundColor: "#fff",
            }}
          />
          <div>
            <span
              style={{
                display: "block",
                fontSize: "var(--pw-font-size-lg)",
                fontWeight: "var(--pw-font-bold)" as React.CSSProperties["fontWeight"],
                color: "var(--pw-text)",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Procwise
            </span>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--pw-brand-600)",
              }}
            >
              Batanes State College
            </span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="pw-page-title" style={{ marginBottom: "var(--pw-space-4)" }}>
          Defense workspace
        </h1>

        {/* Supporting text */}
        <p
          style={{
            fontSize: "var(--pw-font-size-md)",
            lineHeight: "var(--pw-line-height-body)",
            color: "var(--pw-text-muted)",
            marginBottom: "var(--pw-space-6)",
          }}
        >
          Explore a synthetic procurement scenario designed to demonstrate explainable
          recommendations, human approval, and an auditable decision history.
        </p>

        {/* Data notice */}
        <div
          role="note"
          style={{
            border: "1px solid var(--pw-border)",
            borderLeft: "4px solid var(--pw-brand-500)",
            borderRadius: "var(--pw-radius-md)",
            background: "var(--pw-brand-100)",
            padding: "var(--pw-space-4)",
            marginBottom: "var(--pw-space-8)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--pw-font-size-sm)",
              color: "var(--pw-brand-900)",
              lineHeight: "var(--pw-line-height-body)",
            }}
          >
            This workspace uses synthetic demo data. It does not contain customer records or
            production decisions.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--pw-border)", marginBottom: "var(--pw-space-6)" }} />

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--pw-space-3)" }}>
          <PwButton
            variant="primary"
            data-testid="open-demo-workspace"
            onClick={() => setLocation("/demo/overview")}
            style={{ width: "100%", height: 48, fontSize: "var(--pw-font-size-md)" }}
          >
            Open demo workspace
          </PwButton>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SyntheticDataLabel />
          </div>
        </div>
      </div>
    </div>
  );
}
