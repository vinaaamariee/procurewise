import type { Express, Request, Response } from "express";
import { createContext } from "../_core/context";
import { createProcurementDocument, createPurchaseRequest } from "../db";
import {
  PPMP_FILE_REJECTION_MESSAGE,
  sendPrSubmissionNotifications,
  validatePpmpFileUpload,
  type PrSubmissionEmailPayload,
} from "./emailService";

/**
 * Registers REST endpoints for Purchase Request PPMP validation & submission
 * alongside the existing tRPC mutations (`trpc.procurement.purchaseRequests.create`).
 */
export function registerPurchaseRequestRoutes(app: Express): void {
  /**
   * POST /api/purchase-requests/validate-ppmp
   * Server-side pre-flight check for Step 1 PPMP uploads (.pdf, .xlsx, .xls <= 10MB).
   */
  app.post("/api/purchase-requests/validate-ppmp", (req: Request, res: Response) => {
    const { originalFileName, mimeType, byteLength } = req.body ?? {};
    const validation = validatePpmpFileUpload({
      originalFileName: String(originalFileName || ""),
      mimeType: String(mimeType || ""),
      byteLength: Number(byteLength || 0),
    });

    if (!validation.valid) {
      res.status(400).json({
        ok: false,
        error: validation.error || PPMP_FILE_REJECTION_MESSAGE,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Official PPMP document verified (.pdf, .xlsx, or .xls within 10MB).",
    });
  });

  /**
   * POST /api/purchase-requests
   * Express controller handling PPMP file upload validation, Purchase Request persistence,
   * and non-blocking automated email dispatch to the End-User and Procurement Office.
   */
  app.post("/api/purchase-requests", async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res, info: {} as never });
      if (!ctx.user) {
        res.status(401).json({ ok: false, error: "Authentication required to submit a Purchase Request." });
        return;
      }

      const {
        purpose,
        category,
        officeId,
        objectOfExpenditureId,
        fundSource,
        fundCluster,
        responsibilityCenterCode,
        requestedSignatoryId,
        approvedSignatoryId,
        ppmpEntryId,
        items,
        ppmpFile,
      } = req.body ?? {};

      // 1. Strict Server-Side PPMP File Validation Catch (.pdf, .xlsx, .xls <= 10MB)
      if (ppmpFile) {
        const rawBytes = ppmpFile.dataBase64
          ? Buffer.from(String(ppmpFile.dataBase64), "base64").length
          : Number(ppmpFile.size || 0);

        const ppmpValidation = validatePpmpFileUpload({
          originalFileName: String(ppmpFile.name || ""),
          mimeType: String(ppmpFile.type || ""),
          byteLength: rawBytes,
        });

        if (!ppmpValidation.valid) {
          res.status(400).json({
            ok: false,
            error: ppmpValidation.error || PPMP_FILE_REJECTION_MESSAGE,
          });
          return;
        }
      }

      // 2. Persist Purchase Request (which also triggers non-blocking email dispatch & audit logging)
      const created = await createPurchaseRequest(
        {
          purpose: String(purpose || "").trim(),
          category: category ? String(category) : "Office Supplies",
          ppmpFileName: ppmpFile?.name ? String(ppmpFile.name) : "Approved Department PPMP",
          officeId: Number(officeId),
          objectOfExpenditureId: Number(objectOfExpenditureId),
          fundSource: fundSource ? String(fundSource) : undefined,
          fundCluster: fundCluster ? String(fundCluster) : undefined,
          responsibilityCenterCode: responsibilityCenterCode ? String(responsibilityCenterCode) : undefined,
          requestedSignatoryId: requestedSignatoryId ? Number(requestedSignatoryId) : undefined,
          approvedSignatoryId: approvedSignatoryId ? Number(approvedSignatoryId) : undefined,
          ppmpEntryId: ppmpEntryId ? Number(ppmpEntryId) : undefined,
          items: Array.isArray(items) ? items : [],
        },
        ctx.user
      );

      // 3. Attach validated PPMP document if base64 payload was included
      if (ppmpFile?.dataBase64) {
        await createProcurementDocument(
          {
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Project Procurement Management Plan (PPMP)",
            originalFileName: String(ppmpFile.name),
            mimeType: String(ppmpFile.type || "application/pdf"),
            dataBase64: String(ppmpFile.dataBase64),
          },
          ctx.user
        );
      }

      res.status(201).json({
        ok: true,
        purchaseRequest: created,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit Purchase Request.";
      res.status(400).json({ ok: false, error: message });
    }
  });

  /**
   * POST /api/purchase-requests/notify
   * Standalone endpoint to trigger or re-send PR submission email notifications.
   */
  app.post("/api/purchase-requests/notify", async (req: Request, res: Response) => {
    const payload = req.body as PrSubmissionEmailPayload;
    if (!payload?.prTrackingNumber || !payload?.recipientEmail) {
      res.status(400).json({ ok: false, error: "Missing prTrackingNumber or recipientEmail." });
      return;
    }
    const result = await sendPrSubmissionNotifications(payload);
    res.status(200).json({ ok: result.status === "SENT", ...result });
  });
}

