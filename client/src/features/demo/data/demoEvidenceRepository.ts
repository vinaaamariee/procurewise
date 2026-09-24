import { SEEDED_REQUEST } from "./procurement.seed";
import { buildInitialGovernance, evaluateQuotes, getRecommendation, type AuditEvent, type GovernanceSnapshot } from "../domain/governance";
import type { EvidenceAction, EvidenceHistoryEvent, EvidenceSnapshot, EvidenceSubmission, DemoEvidenceRepository } from "../domain/evidence.types";
import type { PurchaseRequest } from "../domain/procurement.types";

const DEADLINE = "2026-09-25T17:00:00Z";
const ACTOR = "Procurement Officer" as const;
const NOW = "2026-09-23T09:00:00Z";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function initialSubmission(): EvidenceSubmission {
  return {
    id: "EVID-SUB-C-DD",
    supplierId: "SUP-C",
    evidenceType: "supplier_due_diligence",
    label: "Supplier C due-diligence record",
    status: "missing",
    requestedAt: null,
    receivedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    dueAt: null,
    fileName: null,
    notes: "",
    synthetic: true,
  };
}

function withAcceptedCompliance(request: PurchaseRequest): PurchaseRequest {
  const updated = clone(request);
  const supplier = updated.quotes.find((quote) => quote.supplierId === "SUP-C");
  if (!supplier) throw new Error("Supplier C is not present in the synthetic fixture.");
  supplier.complianceChecks = supplier.complianceChecks.map((check) =>
    check.id === "CC-C-DD" ? { ...check, state: "pass" as const } : check,
  );
  supplier.evidence = supplier.evidence.map((evidence) =>
    evidence.id === "EVID-DD-C" ? { ...evidence, state: "available" as const } : evidence,
  );
  return updated;
}

function buildGovernance(request: PurchaseRequest, audit: EvidenceHistoryEvent[]): GovernanceSnapshot {
  const base = buildInitialGovernance(request);
  const recommendation = getRecommendation(evaluateQuotes(request));
  const auditEvents: AuditEvent[] = audit.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    actor: event.actor,
    action: event.action,
    detail: event.detail,
    immutable: true,
  }));
  return {
    ...base,
    recommendedSupplierId: recommendation?.quote.supplierId ?? null,
    audit: [...base.audit, ...auditEvents],
  };
}

let requestState = clone(SEEDED_REQUEST);
let submissionState = initialSubmission();
let historyState: EvidenceHistoryEvent[] = [];
let governanceState = buildGovernance(requestState, historyState);

function snapshot(): EvidenceSnapshot {
  return clone({ submission: submissionState, history: historyState, governance: governanceState });
}

function append(action: EvidenceAction, detail: string): void {
  const event: EvidenceHistoryEvent = {
    id: `EVID-AUD-${String(historyState.length + 1).padStart(3, "0")}`,
    action,
    actor: ACTOR,
    timestamp: NOW,
    detail,
    immutable: true,
  };
  historyState = [...historyState, event];
  governanceState = buildGovernance(requestState, historyState);
}

function requireReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 10) throw new Error("A meaningful evidence instruction of at least 10 characters is required.");
  return trimmed;
}

function requireStatus(...allowed: EvidenceSubmission["status"][]): void {
  if (!allowed.includes(submissionState.status)) {
    throw new Error(`This action is not available while evidence is ${submissionState.status.replaceAll("_", " ")}.`);
  }
}

export const demoEvidenceRepository: DemoEvidenceRepository = {
  async getSnapshot() {
    return snapshot();
  },

  async requestEvidence(reason) {
    const instruction = requireReason(reason);
    requireStatus("missing", "correction_required");
    submissionState = { ...submissionState, status: "requested", requestedAt: NOW, dueAt: DEADLINE, notes: instruction };
    append("request_evidence", `Evidence requested from Supplier C; submission due by ${DEADLINE}. Instruction: ${instruction}`);
    return snapshot();
  },

  async recordEvidenceReceived(input) {
    requireStatus("requested");
    const fileName = input.fileName.trim();
    if (!fileName) throw new Error("Enter a synthetic file name before recording receipt.");
    submissionState = { ...submissionState, status: "received", receivedAt: NOW, fileName, notes: input.notes?.trim() ?? submissionState.notes };
    append("record_received", `Synthetic evidence received: ${fileName}.`);
    return snapshot();
  },

  async startEvidenceReview() {
    requireStatus("received");
    submissionState = { ...submissionState, status: "under_review", reviewedBy: ACTOR };
    append("start_review", "Procurement Officer started review of the submitted synthetic evidence.");
    return snapshot();
  },

  async acceptEvidence(notes = "") {
    requireStatus("under_review");
    requestState = withAcceptedCompliance(requestState);
    submissionState = { ...submissionState, status: "accepted", reviewedAt: NOW, reviewedBy: ACTOR, notes: notes.trim() || submissionState.notes };
    append("accept_evidence", "Supplier C due-diligence evidence accepted; compliance and recommendation recalculated.");
    return snapshot();
  },

  async returnForCorrection(reason) {
    const correction = requireReason(reason);
    requireStatus("received", "under_review");
    submissionState = { ...submissionState, status: "correction_required", notes: correction };
    append("return_for_correction", `Evidence returned for correction: ${correction}`);
    return snapshot();
  },

  async reset() {
    requestState = clone(SEEDED_REQUEST);
    submissionState = initialSubmission();
    historyState = [];
    governanceState = buildGovernance(requestState, historyState);
  },
};

export { DEADLINE };
