import type { GovernanceSnapshot } from "./governance";

export type EvidenceStatus =
  | "missing"
  | "requested"
  | "received"
  | "under_review"
  | "accepted"
  | "correction_required";

export type EvidenceAction =
  | "request_evidence"
  | "record_received"
  | "start_review"
  | "accept_evidence"
  | "return_for_correction";

export type EvidenceSubmission = {
  id: string;
  supplierId: string;
  evidenceType: "supplier_due_diligence";
  label: string;
  status: EvidenceStatus;
  requestedAt: string | null;
  receivedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  dueAt: string | null;
  fileName: string | null;
  notes: string;
  synthetic: true;
};

export type EvidenceHistoryEvent = {
  id: string;
  action: EvidenceAction;
  actor: "Procurement Officer" | "System validation";
  timestamp: string;
  detail: string;
  immutable: true;
};

export type EvidenceSnapshot = {
  submission: EvidenceSubmission;
  history: EvidenceHistoryEvent[];
  governance: GovernanceSnapshot;
};

export interface DemoEvidenceRepository {
  getSnapshot(): Promise<EvidenceSnapshot>;
  requestEvidence(reason: string): Promise<EvidenceSnapshot>;
  recordEvidenceReceived(input: { fileName: string; notes?: string }): Promise<EvidenceSnapshot>;
  startEvidenceReview(): Promise<EvidenceSnapshot>;
  acceptEvidence(notes?: string): Promise<EvidenceSnapshot>;
  returnForCorrection(reason: string): Promise<EvidenceSnapshot>;
  reset(): Promise<void>;
}
