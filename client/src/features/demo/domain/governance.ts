import type { ComplianceCheck, EvidenceRef, PurchaseRequest, Quote } from "./procurement.types";

export const DECISION_WEIGHTS = {
  price: 0.4,
  compliance: 0.25,
  delivery: 0.2,
  warranty: 0.15,
} as const;

export type ValidationSeverity = "error" | "warning" | "pass";

export type ValidationFinding = {
  id: string;
  supplierId?: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  evidenceIds: string[];
};

export type QuoteEvaluation = {
  quote: Quote;
  eligible: boolean;
  score: number;
  findings: ValidationFinding[];
  factors: {
    price: number;
    compliance: number;
    delivery: number;
    warranty: number;
  };
};

export type GovernanceStatus = "pending" | "approved" | "modified" | "rejected" | "evidence_requested";
export type GovernanceDecision = "approve" | "modify" | "reject" | "request_evidence";

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: "System validation" | "Procurement Officer" | "Administrative Approver";
  action: string;
  detail: string;
  immutable: true;
};

export type GovernanceSnapshot = {
  status: GovernanceStatus;
  recommendedSupplierId: string | null;
  decision: { action: GovernanceDecision; reason: string; actor: string; timestamp: string } | null;
  evaluations: QuoteEvaluation[];
  audit: AuditEvent[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function mandatoryEvidence(quote: Quote): EvidenceRef[] {
  return quote.evidence.filter((evidence) => evidence.state === "missing");
}

function mandatoryFailures(quote: Quote): ComplianceCheck[] {
  return quote.complianceChecks.filter((check) => check.mandatory && check.state !== "pass");
}

export function validateQuote(request: PurchaseRequest, quote: Quote): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const failedChecks = mandatoryFailures(quote);
  const missingEvidence = mandatoryEvidence(quote);

  for (const check of failedChecks) {
    findings.push({
      id: `${quote.id}-${check.id}`,
      supplierId: quote.supplierId,
      severity: "error",
      title: `${check.label} is incomplete`,
      message: `${quote.supplierName} cannot be recommended until the mandatory ${check.label.toLowerCase()} check passes.`,
      evidenceIds: check.evidenceRefIds,
    });
  }
  for (const evidence of missingEvidence) {
    findings.push({
      id: `${quote.id}-${evidence.id}`,
      supplierId: quote.supplierId,
      severity: "error",
      title: `${evidence.label} is missing`,
      message: `Required evidence is missing for ${quote.supplierName}. The quote is blocked regardless of price or score.`,
      evidenceIds: [evidence.id],
    });
  }
  if (quote.total > request.budget) {
    findings.push({
      id: `${quote.id}-over-budget`,
      supplierId: quote.supplierId,
      severity: "warning",
      title: "Quote exceeds the request budget",
      message: `${quote.supplierName}'s quote is above the £${request.budget.toLocaleString("en-GB")} budget ceiling.`,
      evidenceIds: [],
    });
  }
  if (!findings.some((finding) => finding.severity === "error")) {
    findings.push({
      id: `${quote.id}-valid`,
      supplierId: quote.supplierId,
      severity: "pass",
      title: "Mandatory checks passed",
      message: `${quote.supplierName} has the evidence required for recommendation review.`,
      evidenceIds: quote.complianceChecks.flatMap((check) => check.evidenceRefIds),
    });
  }
  return findings;
}

function normalizeLowerBetter(value: number, lowest: number): number {
  if (lowest === 0) return 0;
  return clamp((lowest / value) * 100);
}

function normalizeHigherBetter(value: number, highest: number): number {
  if (highest === 0) return 0;
  return clamp((value / highest) * 100);
}

export function evaluateQuotes(request: PurchaseRequest): QuoteEvaluation[] {
  const totals = request.quotes.map((quote) => quote.total);
  const deliveries = request.quotes.map((quote) => quote.deliveryDays);
  const warranties = request.quotes.map((quote) => quote.warrantyYears);
  const lowestTotal = Math.min(...totals);
  const lowestDelivery = Math.min(...deliveries);
  const highestWarranty = Math.max(...warranties);

  return request.quotes.map((quote) => {
    const findings = validateQuote(request, quote);
    const factors = {
      price: normalizeLowerBetter(quote.total, lowestTotal),
      compliance: findings.some((finding) => finding.severity === "error") ? 0 : 100,
      delivery: normalizeLowerBetter(quote.deliveryDays, lowestDelivery),
      warranty: normalizeHigherBetter(quote.warrantyYears, highestWarranty),
    };
    const score = Number((factors.price * DECISION_WEIGHTS.price + factors.compliance * DECISION_WEIGHTS.compliance + factors.delivery * DECISION_WEIGHTS.delivery + factors.warranty * DECISION_WEIGHTS.warranty).toFixed(1));
    return { quote, eligible: factors.compliance === 100 && quote.total <= request.budget, score, findings, factors };
  });
}

export function getRecommendation(evaluations: QuoteEvaluation[]): QuoteEvaluation | null {
  return evaluations.filter((evaluation) => evaluation.eligible).sort((a, b) => b.score - a.score || a.quote.total - b.quote.total)[0] ?? null;
}

export function buildInitialGovernance(request: PurchaseRequest): GovernanceSnapshot {
  const evaluations = evaluateQuotes(request);
  const recommendation = getRecommendation(evaluations);
  const timestamp = "2026-09-21T09:05:00Z";
  return {
    status: "pending",
    recommendedSupplierId: recommendation?.quote.supplierId ?? null,
    decision: null,
    evaluations,
    audit: [
      { id: "AUD-001", timestamp: request.updatedAt, actor: "System validation", action: "request_loaded", detail: `${request.id} loaded from the synthetic defense fixture.`, immutable: true },
      { id: "AUD-002", timestamp, actor: "System validation", action: "validation_completed", detail: `${evaluations.filter((evaluation) => evaluation.eligible).length} of ${evaluations.length} supplier quotes passed mandatory validation.`, immutable: true },
      ...(recommendation ? [{ id: "AUD-003", timestamp: "2026-09-21T09:06:00Z", actor: "System validation" as const, action: "recommendation_generated", detail: `${recommendation.quote.supplierName} is the highest-scoring eligible supplier at ${recommendation.score}.`, immutable: true as const }] : []),
    ],
  };
}

export function applyDecision(snapshot: GovernanceSnapshot, action: GovernanceDecision, reason: string, actor = "Administrative Approver"): GovernanceSnapshot {
  const trimmedReason = reason.trim();
  if (action !== "approve" && trimmedReason.length < 10) throw new Error("A decision reason of at least 10 characters is required.");
  if (action === "approve" && !snapshot.recommendedSupplierId) throw new Error("Approval is blocked because no eligible supplier recommendation exists.");
  const timestamp = "2026-09-22T09:30:00Z";
  const status: GovernanceStatus = action === "approve" ? "approved" : action === "modify" ? "modified" : action === "reject" ? "rejected" : "evidence_requested";
  const detail = action === "approve" ? `Approved recommendation for ${snapshot.recommendedSupplierId}.` : `${action.replace("_", " ")} recorded: ${trimmedReason}`;
  const event: AuditEvent = { id: `AUD-${snapshot.audit.length + 1}`.padStart(7, "0"), timestamp, actor: actor as AuditEvent["actor"], action: `human_${action}`, detail, immutable: true };
  return { ...snapshot, status, decision: { action, reason: trimmedReason, actor, timestamp }, audit: [...snapshot.audit, event] };
}
