import { describe, expect, it, beforeEach } from "vitest";
import { demoProcurementRepository } from "../client/src/features/demo/data/demoProcurementRepository";
import { EXPECTED_DEMO_OUTCOME, SEEDED_REQUEST } from "../client/src/features/demo/data/procurement.seed";

describe("Procwise defense — synthetic procurement seed", () => {
  beforeEach(async () => {
    await demoProcurementRepository.reset();
  });

  it("contains exactly one seeded request", async () => {
    const requests = await demoProcurementRepository.listRequests();
    expect(requests).toHaveLength(1);
  });

  it("the request ID is REQ-2026-0929", async () => {
    const requests = await demoProcurementRepository.listRequests();
    expect(requests[0].id).toBe("REQ-2026-0929");
  });

  it("the request is marked synthetic", async () => {
    const requests = await demoProcurementRepository.listRequests();
    expect(requests[0].synthetic).toBe(true);
  });

  it("there are exactly three quotations", async () => {
    const requests = await demoProcurementRepository.listRequests();
    expect(requests[0].quotes).toHaveLength(3);
  });

  it("Supplier B total is £10,880", async () => {
    const requests = await demoProcurementRepository.listRequests();
    const quoteB = requests[0].quotes.find((q: { supplierId: string; }) => q.supplierId === "SUP-B");
    expect(quoteB).toBeDefined();
    expect(quoteB!.total).toBe(10880);
    expect(quoteB!.currency).toBe("GBP");
  });

  it("Supplier C has missing mandatory due-diligence evidence", async () => {
    const requests = await demoProcurementRepository.listRequests();
    const quoteC = requests[0].quotes.find((q) => q.supplierId === "SUP-C");
    expect(quoteC).toBeDefined();
    const ddCheck = quoteC!.complianceChecks.find((c) => c.id === "CC-C-DD");
    expect(ddCheck).toBeDefined();
    expect(ddCheck!.mandatory).toBe(true);
    expect(ddCheck!.state).toBe("missing");
    const missingEvidence = quoteC!.evidence.find((e) => e.id === "EVID-DD-C");
    expect(missingEvidence).toBeDefined();
    expect(missingEvidence!.state).toBe("missing");
    expect(missingEvidence!.synthetic).toBe(true);
  });

  it("reset restores the original request data", async () => {
    // Verify initial state
    const initial = await demoProcurementRepository.listRequests();
    expect(initial).toHaveLength(1);
    // Reset and verify identical
    await demoProcurementRepository.reset();
    const afterReset = await demoProcurementRepository.listRequests();
    expect(afterReset).toHaveLength(1);
    expect(afterReset[0].id).toBe("REQ-2026-0929");
    expect(afterReset[0].quotes).toHaveLength(3);
  });

  it("getRequestById returns the seeded request", async () => {
    const request = await demoProcurementRepository.getRequestById("REQ-2026-0929");
    expect(request).not.toBeNull();
    expect(request!.id).toBe("REQ-2026-0929");
  });

  it("getRequestById returns null for unknown IDs", async () => {
    const result = await demoProcurementRepository.getRequestById("DOES-NOT-EXIST");
    expect(result).toBeNull();
  });

  it("no customer name or production record appears in the fixture", () => {
    const raw = JSON.stringify(SEEDED_REQUEST);
    // Should not contain real company names, PII, or production identifiers
    const forbidden = [
      "Acme", "Ltd", "Inc", "Corporation", "customer",
      "@gmail", "@yahoo", "@hotmail", "password", "secret",
    ];
    for (const term of forbidden) {
      expect(raw.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it("all evidence objects set synthetic: true", async () => {
    const requests = await demoProcurementRepository.listRequests();
    const allEvidence = requests[0].quotes.flatMap((q) => q.evidence);
    expect(allEvidence.length).toBeGreaterThan(0);
    expect(allEvidence.every((e) => e.synthetic === true)).toBe(true);
  });

  it("expected demo outcome references match seed supplier IDs", () => {
    const supplierIds = SEEDED_REQUEST.quotes.map((q) => q.supplierId);
    expect(supplierIds).toContain(EXPECTED_DEMO_OUTCOME.recommendedSupplierId);
    expect(supplierIds).toContain(EXPECTED_DEMO_OUTCOME.comparisonSupplierId);
    expect(supplierIds).toContain(EXPECTED_DEMO_OUTCOME.blockedSupplierId);
    expect(EXPECTED_DEMO_OUTCOME.savingsAmount).toBe(720);
    expect(EXPECTED_DEMO_OUTCOME.savingsPercent).toBe(6.2);
  });
});
