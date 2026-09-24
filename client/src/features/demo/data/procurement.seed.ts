// Procwise Defense — Synthetic seed data
// All data in this file is synthetic demo data. It does not contain
// customer records, real supplier names, or production decisions.

import type { EvidenceRef, PurchaseRequest } from "../domain/procurement.types";

// ---------------------------------------------------------------------------
// Evidence references (shared across quotes)
// ---------------------------------------------------------------------------

const evidenceQuoteA: EvidenceRef = {
  id: "EVID-Q-A",
  label: "Supplier A quotation",
  type: "quote",
  state: "available",
  synthetic: true,
};

const evidenceQuoteB: EvidenceRef = {
  id: "EVID-Q-B",
  label: "Supplier B quotation",
  type: "quote",
  state: "available",
  synthetic: true,
};

const evidenceQuoteC: EvidenceRef = {
  id: "EVID-Q-C",
  label: "Supplier C quotation",
  type: "quote",
  state: "available",
  synthetic: true,
};

const evidencePolicy: EvidenceRef = {
  id: "EVID-POL-001",
  label: "Supplier due-diligence policy",
  type: "policy",
  state: "available",
  synthetic: true,
};

const evidenceDdA: EvidenceRef = {
  id: "EVID-DD-A",
  label: "Supplier A due-diligence record",
  type: "supplier-document",
  state: "available",
  synthetic: true,
};

const evidenceDdB: EvidenceRef = {
  id: "EVID-DD-B",
  label: "Supplier B due-diligence record",
  type: "supplier-document",
  state: "available",
  synthetic: true,
};

const evidenceDdC: EvidenceRef = {
  id: "EVID-DD-C",
  label: "Supplier C due-diligence record",
  type: "supplier-document",
  state: "missing", // ← key ineligibility condition
  synthetic: true,
};

// ---------------------------------------------------------------------------
// Seeded purchase request
// ---------------------------------------------------------------------------

export const SEEDED_REQUEST: PurchaseRequest = {
  id: "REQ-2026-0929",
  title: "Ergonomic office chair procurement",
  department: "Operations",
  category: "Workplace equipment",
  quantity: 40,
  budget: 12000,
  currency: "GBP",
  requiredBy: "2026-10-30",
  status: "review",
  risk: "medium",
  owner: "Procurement team",
  updatedAt: "2026-09-21T09:00:00Z",
  synthetic: true,
  quotes: [
    {
      id: "Q-A-001",
      supplierId: "SUP-A",
      supplierName: "Supplier A",
      total: 11600,
      currency: "GBP",
      deliveryDays: 21,
      warrantyYears: 3,
      complianceChecks: [
        {
          id: "CC-A-DD",
          label: "Supplier due-diligence",
          state: "pass",
          mandatory: true,
          evidenceRefIds: ["EVID-DD-A", "EVID-POL-001"],
        },
        {
          id: "CC-A-QUOTE",
          label: "Quotation received",
          state: "pass",
          mandatory: true,
          evidenceRefIds: ["EVID-Q-A"],
        },
      ],
      evidence: [evidenceQuoteA, evidencePolicy, evidenceDdA],
    },
    {
      id: "Q-B-001",
      supplierId: "SUP-B",
      supplierName: "Supplier B",
      total: 10880,
      currency: "GBP",
      deliveryDays: 14,
      warrantyYears: 5,
      complianceChecks: [
        {
          id: "CC-B-DD",
          label: "Supplier due-diligence",
          state: "pass",
          mandatory: true,
          evidenceRefIds: ["EVID-DD-B", "EVID-POL-001"],
        },
        {
          id: "CC-B-QUOTE",
          label: "Quotation received",
          state: "pass",
          mandatory: true,
          evidenceRefIds: ["EVID-Q-B"],
        },
      ],
      evidence: [evidenceQuoteB, evidencePolicy, evidenceDdB],
    },
    {
      id: "Q-C-001",
      supplierId: "SUP-C",
      supplierName: "Supplier C",
      total: 9920,
      currency: "GBP",
      deliveryDays: 18,
      warrantyYears: 2,
      complianceChecks: [
        {
          id: "CC-C-DD",
          label: "Supplier due-diligence",
          state: "missing", // ← ineligible
          mandatory: true,
          evidenceRefIds: ["EVID-DD-C", "EVID-POL-001"],
        },
        {
          id: "CC-C-QUOTE",
          label: "Quotation received",
          state: "pass",
          mandatory: true,
          evidenceRefIds: ["EVID-Q-C"],
        },
      ],
      evidence: [evidenceQuoteC, evidencePolicy, evidenceDdC],
    },
  ],
};

// ---------------------------------------------------------------------------
// Expected demo outcome (for tests and demo-metadata only)
// DO NOT import this into presentation components.
// ---------------------------------------------------------------------------

export const EXPECTED_DEMO_OUTCOME = {
  recommendedSupplierId: "SUP-B" as const,
  comparisonSupplierId: "SUP-A" as const,
  savingsAmount: 720 as const,
  savingsPercent: 6.2 as const,
  blockedSupplierId: "SUP-C" as const,
  blockedReason:
    "Supplier C has the lowest quote, but required supplier due-diligence evidence is missing. Procwise cannot recommend this quote until the evidence is reviewed.",
};
