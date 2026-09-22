import { beforeEach, describe, expect, it } from "vitest";
import { demoEvidenceRepository } from "../client/src/features/demo/data/demoEvidenceRepository";

describe("ProcureWise Day 3 evidence workflow", () => {
  beforeEach(async () => { await demoEvidenceRepository.reset(); });

  it("starts Supplier C in missing evidence state", async () => {
    const snapshot = await demoEvidenceRepository.getSnapshot();
    expect(snapshot.submission.status).toBe("missing");
    expect(snapshot.submission.synthetic).toBe(true);
    expect(snapshot.governance.recommendedSupplierId).toBe("SUP-B");
  });

  it("requests evidence with a deterministic deadline", async () => {
    const snapshot = await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    expect(snapshot.submission.status).toBe("requested");
    expect(snapshot.submission.dueAt).toBe("2026-09-25T17:00:00Z");
    expect(snapshot.history.at(-1)?.action).toBe("request_evidence");
  });

  it("requires a meaningful request reason", async () => {
    await expect(demoEvidenceRepository.requestEvidence("short")).rejects.toThrow(/10 characters/);
  });

  it("records a synthetic submission", async () => {
    await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    const snapshot = await demoEvidenceRepository.recordEvidenceReceived({ fileName: "supplier-c-due-diligence-demo.pdf" });
    expect(snapshot.submission.status).toBe("received");
    expect(snapshot.submission.fileName).toContain("demo.pdf");
  });

  it("rejects invalid transitions without mutating state", async () => {
    await expect(demoEvidenceRepository.acceptEvidence()).rejects.toThrow(/not available/);
    const snapshot = await demoEvidenceRepository.getSnapshot();
    expect(snapshot.submission.status).toBe("missing");
    expect(snapshot.history).toHaveLength(0);
  });

  it("supports received, review, and accepted transitions", async () => {
    await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    await demoEvidenceRepository.recordEvidenceReceived({ fileName: "supplier-c-due-diligence-demo.pdf" });
    await demoEvidenceRepository.startEvidenceReview();
    const accepted = await demoEvidenceRepository.acceptEvidence("Reviewed synthetic evidence.");
    expect(accepted.submission.status).toBe("accepted");
    expect(accepted.submission.reviewedBy).toBe("Procurement Officer");
    expect(accepted.governance.evaluations.find((item) => item.quote.supplierId === "SUP-C")?.eligible).toBe(true);
    expect(accepted.governance.audit.at(-1)?.action).toBe("accept_evidence");
  });

  it("supports correction and re-request", async () => {
    await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    await demoEvidenceRepository.recordEvidenceReceived({ fileName: "incorrect-evidence-demo.pdf" });
    const corrected = await demoEvidenceRepository.returnForCorrection("The accreditation page is missing.");
    expect(corrected.submission.status).toBe("correction_required");
    expect(corrected.submission.fileName).toBe("incorrect-evidence-demo.pdf");
    const requested = await demoEvidenceRepository.requestEvidence("Please resubmit the complete accreditation record.");
    expect(requested.submission.status).toBe("requested");
    expect(requested.history).toHaveLength(4);
  });

  it("requires a reason to return evidence for correction", async () => {
    await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    await demoEvidenceRepository.recordEvidenceReceived({ fileName: "evidence-demo.pdf" });
    await expect(demoEvidenceRepository.returnForCorrection("no")).rejects.toThrow(/10 characters/);
  });

  it("reset restores the initial pending-evidence workflow", async () => {
    await demoEvidenceRepository.requestEvidence("Please submit current due diligence evidence.");
    await demoEvidenceRepository.recordEvidenceReceived({ fileName: "evidence-demo.pdf" });
    await demoEvidenceRepository.reset();
    const reset = await demoEvidenceRepository.getSnapshot();
    expect(reset.submission.status).toBe("missing");
    expect(reset.submission.fileName).toBeNull();
    expect(reset.history).toHaveLength(0);
  });
});
