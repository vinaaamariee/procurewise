// Procwise Defense — Typed procurement domain contract
// All values in this module are synthetic demo data.

export type ISODateString = string;

export type ProcurementStatus = "review" | "approval" | "approved" | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type FeatureMaturity =
  | "implemented"
  | "prototype"
  | "simulated"
  | "planned";

export type ComplianceState = "pass" | "fail" | "missing";

export type EvidenceRef = {
  id: string;
  label: string;
  type: "quote" | "policy" | "supplier-document";
  state: "available" | "missing";
  synthetic: true;
};

export type ComplianceCheck = {
  id: string;
  label: string;
  state: ComplianceState;
  mandatory: boolean;
  evidenceRefIds: string[];
};

export type ScoreFactor = {
  key: "price" | "compliance" | "delivery" | "warranty";
  label: string;
  weight: number;
  normalizedScore: number | null;
  weightedScore: number | null;
  explanation: string;
};

export type Quote = {
  id: string;
  supplierId: string;
  supplierName: string;
  total: number;
  currency: "GBP";
  deliveryDays: number;
  warrantyYears: number;
  complianceChecks: ComplianceCheck[];
  evidence: EvidenceRef[];
};

export type PurchaseRequest = {
  id: "REQ-2026-0929";
  title: string;
  department: string;
  category: string;
  quantity: number;
  budget: number;
  currency: "GBP";
  requiredBy: ISODateString;
  status: ProcurementStatus;
  risk: RiskLevel;
  owner: string;
  updatedAt: ISODateString;
  synthetic: true;
  quotes: Quote[];
};

export type ExpectedDemoOutcome = {
  recommendedSupplierId: "SUP-B";
  comparisonSupplierId: "SUP-A";
  savingsAmount: 720;
  savingsPercent: 6.2;
  blockedSupplierId: "SUP-C";
  blockedReason: string;
};

export interface DemoProcurementRepository {
  listRequests(): Promise<PurchaseRequest[]>;
  getRequestById(id: string): Promise<PurchaseRequest | null>;
  reset(): Promise<void>;
}
