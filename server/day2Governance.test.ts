import { beforeEach, describe, expect, it } from "vitest";
import { SEEDED_REQUEST } from "../client/src/features/demo/data/procurement.seed";
import { demoGovernanceRepository } from "../client/src/features/demo/data/demoGovernanceRepository";
import { applyDecision, evaluateQuotes, getRecommendation, validateQuote } from "../client/src/features/demo/domain/governance";

describe("Procwise Day 2 validation and governance", () => {
  beforeEach(async () => {
    await demoGovernanceRepository.reset();
  });

  it("flags Supplier C's mandatory due-diligence evidence as blocking", () => {
    const supplierC = SEEDED_REQUEST.quotes.find((quote) => quote.supplierId === "SUP-C")!;
    const findings = validateQuote(SEEDED_REQUEST, supplierC);
    expect(findings.some((finding) => finding.severity === "error")).toBe(true);
    expect(findings.map((finding) => finding.title).join(" ")).toContain("missing");
  });

  it("keeps Supplier C ineligible despite having the lowest price", () => {
    const evaluations = evaluateQuotes(SEEDED_REQUEST);
    const supplierC = evaluations.find((evaluation) => evaluation.quote.supplierId === "SUP-C")!;
    expect(supplierC.quote.total).toBe(9920);
    expect(supplierC.eligible).toBe(false);
    expect(getRecommendation(evaluations)?.quote.supplierId).toBe("SUP-B");
  });

  it("produces the expected deterministic recommendation and score ordering", () => {
    const evaluations = evaluateQuotes(SEEDED_REQUEST);
    expect(evaluations.find((evaluation) => evaluation.quote.supplierId === "SUP-A")?.score).toBe(81.5);
    expect(evaluations.find((evaluation) => evaluation.quote.supplierId === "SUP-B")?.score).toBe(96.5);
    expect(evaluations.find((evaluation) => evaluation.quote.supplierId === "SUP-C")?.score).toBe(61.6);
    expect(getRecommendation(evaluations)?.quote.supplierId).toBe("SUP-B");
  });

  it("requires a meaningful reason for non-approval decisions", async () => {
    const snapshot = await demoGovernanceRepository.getSnapshot();
    expect(() => applyDecision(snapshot, "reject", "no")).toThrow(/at least 10 characters/);
    expect(() => applyDecision(snapshot, "request_evidence", "missing supplier due diligence evidence")).not.toThrow();
  });

  it("requires an eligible recommendation before approval", () => {
    const snapshot = { ...buildSnapshotForTest(), recommendedSupplierId: null };
    expect(() => applyDecision(snapshot, "approve", "")).toThrow(/no eligible supplier/);
  });

  it("appends an immutable human decision to the audit trail", async () => {
    const before = await demoGovernanceRepository.getSnapshot();
    const after = await demoGovernanceRepository.decide("approve", "Reviewed quotations and mandatory evidence.");
    expect(after.status).toBe("approved");
    expect(after.audit).toHaveLength(before.audit.length + 1);
    expect(after.audit.at(-1)?.action).toBe("human_approve");
    expect(after.audit.at(-1)?.immutable).toBe(true);
    expect(after.decision?.actor).toBe("Administrative Approver");
  });
});

function buildSnapshotForTest() {
  return {
    status: "pending" as const,
    recommendedSupplierId: "SUP-B",
    decision: null,
    evaluations: evaluateQuotes(SEEDED_REQUEST),
    audit: [],
  };
}
