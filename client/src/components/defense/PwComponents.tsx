// Procwise Defense — Flat UI component primitives
// Used exclusively on defense routes (/demo/*).
// No gradients, shadows, glass effects, or decorative radius.

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

// =============================================================================
// SyntheticDataLabel
// =============================================================================

export function SyntheticDataLabel({ className = "" }: { className?: string }) {
  return (
    <span
      data-testid="synthetic-data-label"
      className={`inline-flex items-center gap-1.5 rounded-[var(--pw-radius-md)] border border-[var(--pw-border)] bg-[var(--pw-surface-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--pw-text-muted)] ${className}`}
      aria-label="This workspace contains synthetic demo data only"
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pw-brand-500)", display: "inline-block", flexShrink: 0 }}
      />
      Synthetic demo data
    </span>
  );
}

// =============================================================================
// PwButton
// =============================================================================

type ButtonVariant = "primary" | "secondary" | "text" | "danger";

interface PwButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--pw-radius-md)] px-4 text-sm font-semibold leading-none border transition-colors focus-visible:outline-[length:var(--pw-focus-width)] focus-visible:outline-[var(--pw-focus)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--pw-brand-500)] text-[#062F36] border-[#18A8B8] hover:bg-[#18B8C8] active:bg-[#14A0AF] disabled:bg-[var(--pw-disabled-surface)] disabled:text-[var(--pw-disabled-text)] disabled:border-[var(--pw-border)]",
  secondary:
    "bg-[var(--pw-surface)] text-[var(--pw-brand-900)] border-[var(--pw-border-strong)] hover:bg-[var(--pw-surface-subtle)] active:bg-[var(--pw-surface-strong)] disabled:bg-[var(--pw-disabled-surface)] disabled:text-[var(--pw-disabled-text)] disabled:border-[var(--pw-border)]",
  text:
    "bg-transparent text-[var(--pw-brand-800)] border-transparent hover:bg-[var(--pw-surface-strong)] active:bg-[var(--pw-border)] disabled:text-[var(--pw-disabled-text)]",
  danger:
    "bg-[var(--pw-surface)] text-[var(--pw-danger-text)] border-[var(--pw-danger-text)] hover:bg-[var(--pw-danger-surface)] active:bg-[#FEE4E2] disabled:bg-[var(--pw-disabled-surface)] disabled:text-[var(--pw-disabled-text)] disabled:border-[var(--pw-border)]",
};

export const PwButton = forwardRef<HTMLButtonElement, PwButtonProps>(
  ({ variant = "primary", loading = false, disabled, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${buttonBase} ${variantStyles[variant]} ${className}`}
        style={{ minHeight: 40, minWidth: loading ? undefined : undefined }}
        {...props}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                display: "inline-block",
                animation: "pw-spin 0.6s linear infinite",
              }}
            />
            <span>Loading…</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
PwButton.displayName = "PwButton";

// =============================================================================
// PwStatusBadge
// =============================================================================

type BadgeVariant =
  | "neutral"
  | "review"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "missing-evidence"
  | "synthetic"
  | "prototype"
  | "simulated"
  | "planned";

const badgeStyles: Record<BadgeVariant, { bg: string; text: string; border: string; label: string }> = {
  neutral: { bg: "var(--pw-surface-strong)", text: "var(--pw-text-muted)", border: "var(--pw-border)", label: "Neutral" },
  review: { bg: "var(--pw-warning-surface)", text: "var(--pw-warning-text)", border: "#FBBF24", label: "Needs review" },
  "pending-approval": { bg: "var(--pw-info-surface)", text: "var(--pw-info-text)", border: "#93C5FD", label: "Pending approval" },
  approved: { bg: "var(--pw-success-surface)", text: "var(--pw-success-text)", border: "#6EE7B7", label: "Approved" },
  rejected: { bg: "var(--pw-danger-surface)", text: "var(--pw-danger-text)", border: "#FCA5A5", label: "Rejected" },
  "missing-evidence": { bg: "var(--pw-danger-surface)", text: "var(--pw-danger-text)", border: "#FCA5A5", label: "Missing evidence" },
  synthetic: { bg: "var(--pw-surface-strong)", text: "var(--pw-text-muted)", border: "var(--pw-border-strong)", label: "Synthetic" },
  prototype: { bg: "var(--pw-surface-strong)", text: "var(--pw-text-muted)", border: "var(--pw-border-strong)", label: "Prototype" },
  simulated: { bg: "var(--pw-brand-100)", text: "var(--pw-brand-900)", border: "var(--pw-brand-500)", label: "Simulated" },
  planned: { bg: "var(--pw-surface-strong)", text: "var(--pw-text-muted)", border: "var(--pw-border)", label: "Planned" },
};

// Icon glyphs (text-only, accessible via aria-hidden + text content)
const badgeIcons: Partial<Record<BadgeVariant, string>> = {
  review: "⚠",
  "missing-evidence": "⚠",
  approved: "✓",
  rejected: "✕",
};

export function PwStatusBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children?: ReactNode;
}) {
  const s = badgeStyles[variant];
  const icon = badgeIcons[variant];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--pw-radius-md)] border px-2 py-0.5 text-[12px] font-semibold leading-5"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {icon && <span aria-hidden="true" style={{ fontSize: 10 }}>{icon}</span>}
      {children ?? s.label}
    </span>
  );
}

// =============================================================================
// PwAlert
// =============================================================================

type AlertVariant = "info" | "success" | "warning" | "error";

const alertConfig: Record<AlertVariant, { bg: string; border: string; accent: string; text: string; title: string }> = {
  info: { bg: "var(--pw-info-surface)", border: "var(--pw-border)", accent: "var(--pw-info-text)", text: "var(--pw-info-text)", title: "Information" },
  success: { bg: "var(--pw-success-surface)", border: "var(--pw-border)", accent: "var(--pw-success-text)", text: "var(--pw-success-text)", title: "Success" },
  warning: { bg: "var(--pw-warning-surface)", border: "#FBBF24", accent: "var(--pw-warning-text)", text: "var(--pw-warning-text)", title: "Warning" },
  error: { bg: "var(--pw-danger-surface)", border: "var(--pw-danger-text)", accent: "var(--pw-danger-text)", text: "var(--pw-danger-text)", title: "Error" },
};

export function PwAlert({
  variant = "info",
  title,
  message,
  action,
}: {
  variant?: AlertVariant;
  title?: string;
  message: ReactNode;
  action?: ReactNode;
}) {
  const c = alertConfig[variant];
  return (
    <div
      role="alert"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.accent}`,
        borderRadius: "var(--pw-radius-md)",
        padding: "var(--pw-space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--pw-space-2)",
      }}
    >
      {title && (
        <p style={{ margin: 0, fontWeight: "var(--pw-font-semibold)" as React.CSSProperties["fontWeight"], fontSize: "var(--pw-font-size-sm)", color: c.text }}>
          {title}
        </p>
      )}
      <p style={{ margin: 0, fontSize: "var(--pw-font-size-sm)", lineHeight: "var(--pw-line-height-body)", color: c.text }}>
        {message}
      </p>
      {action && <div style={{ marginTop: "var(--pw-space-1)" }}>{action}</div>}
    </div>
  );
}

// =============================================================================
// PwPanel
// =============================================================================

type PanelVariant = "default" | "subtle" | "selected" | "warning" | "error";

const panelConfig: Record<PanelVariant, React.CSSProperties> = {
  default: { background: "var(--pw-surface)", border: "1px solid var(--pw-border)", borderRadius: "var(--pw-radius-lg)" },
  subtle: { background: "var(--pw-surface-subtle)", border: "1px solid var(--pw-border)", borderRadius: "var(--pw-radius-lg)" },
  selected: { background: "var(--pw-surface)", border: "2px solid var(--pw-brand-500)", borderRadius: "var(--pw-radius-lg)" },
  warning: { background: "var(--pw-warning-surface)", border: "1px solid #FBBF24", borderRadius: "var(--pw-radius-lg)" },
  error: { background: "var(--pw-danger-surface)", border: "1px solid var(--pw-danger-text)", borderRadius: "var(--pw-radius-lg)" },
};

export function PwPanel({
  variant = "default",
  children,
  className = "",
  style,
}: {
  variant?: PanelVariant;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        ...panelConfig[variant],
        padding: "var(--pw-space-6)",
        boxShadow: "var(--pw-shadow-none)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// PwLoadingRows / PwEmptyState
// =============================================================================

export function PwLoadingRows({ columns = 5, rows = 4 }: { columns?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, ri) => (
        <tr key={ri}>
          {Array.from({ length: columns }, (_, ci) => (
            <td key={ci} style={{ padding: "14px 16px" }}>
              <div
                style={{
                  height: 14,
                  borderRadius: "var(--pw-radius-sm)",
                  background: "var(--pw-surface-strong)",
                  width: ci === 0 ? "80%" : ci === 1 ? "60%" : "50%",
                  animation: "pw-shimmer 1.4s ease-in-out infinite",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PwEmptyState({
  heading = "No items",
  description,
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={99} style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ margin: 0, fontWeight: "var(--pw-font-semibold)" as React.CSSProperties["fontWeight"], color: "var(--pw-text)", fontSize: "var(--pw-font-size-sm)" }}>
          {heading}
        </p>
        {description && (
          <p style={{ margin: "4px 0 0", fontSize: "var(--pw-font-size-sm)", color: "var(--pw-text-muted)" }}>
            {description}
          </p>
        )}
      </td>
    </tr>
  );
}

// Keyframe styles injected once
if (typeof document !== "undefined") {
  const styleId = "pw-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes pw-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pw-shimmer {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
  }
}
