// Procwise Defense — Application shell layout
// Sidebar + top bar for all /demo/* routes.
// No authentication required. Uses --pw-* tokens only.

import { SyntheticDataLabel } from "@/components/defense/PwComponents";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Overview", path: "/demo/overview" },
  { label: "Requests", path: "/demo/requests" },
  { label: "Approvals", path: "/demo/approvals" },
  { label: "Audit log", path: "/demo/audit" },
  { label: "Validation", path: "/demo/validation" },
  { label: "Governance", path: "/demo/governance" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="17" y2="6" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="14" x2="17" y2="14" />
        </>
      )}
    </svg>
  );
}

export default function DefenseShell({ children, pageTitle }: { children: React.ReactNode; pageTitle: string }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="pw-shell" style={{ display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header className="pw-topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--pw-space-3)" }}>
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              border: "1px solid var(--pw-border)",
              borderRadius: "var(--pw-radius-md)",
              background: "var(--pw-surface)",
              color: "var(--pw-text)",
              cursor: "pointer",
            }}
            className="pw-mobile-menu-btn"
          >
            <MenuIcon open={mobileOpen} />
          </button>

          {/* Logo mark */}
          <Link href="/demo" style={{ textDecoration: "none" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--pw-space-2)",
                fontWeight: "var(--pw-font-bold)" as React.CSSProperties["fontWeight"],
                fontSize: "var(--pw-font-size-md)",
                color: "var(--pw-text)",
                letterSpacing: "-0.01em",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  background: "var(--pw-brand-900)",
                  borderRadius: "var(--pw-radius-sm)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ color: "var(--pw-brand-500)", fontSize: 11, fontWeight: 800 }}>PW</span>
              </span>
              Procwise
            </span>
          </Link>

          {/* Page title */}
          <span
            aria-hidden="true"
            style={{
              color: "var(--pw-border-strong)",
              fontSize: "var(--pw-font-size-md)",
              margin: "0 var(--pw-space-1)",
            }}
          >
            /
          </span>
          <span
            style={{
              fontSize: "var(--pw-font-size-sm)",
              fontWeight: "var(--pw-font-semibold)" as React.CSSProperties["fontWeight"],
              color: "var(--pw-text)",
            }}
          >
            {pageTitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--pw-space-4)" }}>
          <SyntheticDataLabel />
          {/* Reset demo — Day 4 */}
          <span
            style={{
              fontSize: "var(--pw-font-size-xs)",
              color: "var(--pw-text-muted)",
              fontStyle: "italic",
            }}
            title="Reset will be available on Day 4"
          >
            Reset demo — available Day 4
          </span>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <nav
          aria-label="Defense workspace navigation"
          className="pw-sidebar"
          style={{
            padding: "var(--pw-space-6) 0",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <p
            style={{
              margin: "0 0 var(--pw-space-3) 0",
              padding: "0 var(--pw-space-4)",
              fontSize: "var(--pw-font-size-xs)",
              fontWeight: "var(--pw-font-semibold)" as React.CSSProperties["fontWeight"],
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Defense workspace
          </p>

          {navItems.map((item) => {
            const active = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--pw-space-3)",
                  padding: "10px var(--pw-space-4)",
                  fontSize: "var(--pw-font-size-sm)",
                  fontWeight: active
                    ? ("var(--pw-font-semibold)" as React.CSSProperties["fontWeight"])
                    : ("var(--pw-font-regular)" as React.CSSProperties["fontWeight"]),
                  color: active ? "var(--pw-text-on-dark)" : "rgba(255,255,255,0.7)",
                  background: active ? "var(--pw-brand-800)" : "transparent",
                  borderLeft: active ? "3px solid var(--pw-brand-500)" : "3px solid transparent",
                  textDecoration: "none",
                  transition: "background 120ms, color 120ms",
                }}
              >
                {item.label}
              </Link>
            );
          })}

          <div
            style={{
              marginTop: "auto",
              padding: "var(--pw-space-4)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: "var(--pw-font-size-xs)",
                color: "rgba(255,255,255,0.45)",
                textDecoration: "none",
              }}
            >
              ← Back to main app
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <main className="pw-content" style={{ overflowX: "hidden" }}>
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      <style>{`
        @media (max-width: 1023px) {
          .pw-mobile-menu-btn { display: flex !important; }
          .pw-sidebar {
            position: fixed !important;
            inset: 64px 0 0 0 !important;
            width: 100% !important;
            z-index: 30 !important;
            transform: translateX(${mobileOpen ? "0" : "-100%"});
            transition: transform 120ms ease;
          }
        }
      `}</style>
    </div>
  );
}
