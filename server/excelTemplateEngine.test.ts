import { describe, expect, it } from "vitest";
import {
  SUPPORTED_FORM_TEMPLATES,
  createMasterExcelWorkbook,
  getSampleFormData,
  injectDataIntoExcelTemplate,
  parseExcelTemplate,
  type FormTemplateKey,
} from "./excelTemplateEngine";

describe("Excel-Driven Template Architecture", () => {
  const templateKeys: FormTemplateKey[] = [
    "purchase_request",
    "rfq",
    "abstract_of_quotations",
    "purchase_order",
    "acknowledgement_receipt",
  ];

  it("covers the five core procurement forms: PR, RFQ, AOQ, PO, and Acknowledgement Receipt", () => {
    expect(templateKeys).toHaveLength(5);
    templateKeys.forEach((key) => {
      const meta = SUPPORTED_FORM_TEMPLATES[key];
      expect(meta).toBeDefined();
      expect(meta.placeholders.length).toBeGreaterThan(5);
      expect(meta.sampleFileName.endsWith(".xlsx")).toBe(true);
    });
  });

  it("generates and parses master Excel workbooks with detected dynamic placeholders", async () => {
    for (const key of templateKeys) {
      const wb = await createMasterExcelWorkbook(key);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      expect(buffer.length).toBeGreaterThan(1000);

      const parsed = await parseExcelTemplate(buffer);
      expect(parsed.sheetName).toBeTruthy();
      expect(parsed.rowCount).toBeGreaterThan(5);
      expect(parsed.placeholdersDetected.length).toBeGreaterThan(0);
      expect(parsed.base64).toBeTruthy();
    }
  });

  it("injects runtime transaction data into dynamic placeholders and produces A4 HTML table with cell borders and font weights", async () => {
    for (const key of templateKeys) {
      const wb = await createMasterExcelWorkbook(key);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      const sampleData = getSampleFormData(key);

      const result = await injectDataIntoExcelTemplate(buffer, key, sampleData);
      expect(result.xlsxBuffer.length).toBeGreaterThan(1000);
      expect(result.xlsxBase64).toBeTruthy();
      expect(result.htmlTable).toContain("excel-rendered-table");
      expect(result.htmlTable).toContain("border");
      expect(result.meta.itemsCount).toBeGreaterThan(0);
      expect(result.meta.templateKey).toBe(key);

      // Verify specific data was injected into the HTML view
      if (key === "purchase_request") {
        expect(result.htmlTable).toContain("PR-2026-03-014");
        expect(result.htmlTable).toContain("ICT Unit");
        expect(result.htmlTable).toContain("Prof. Maria Santos");
      } else if (key === "purchase_order") {
        expect(result.htmlTable).toContain("PO-2026-03-019");
        expect(result.htmlTable).toContain("Ivatan Trading");
      }
    }
  });

  it("serves listSupportedForms, downloadMasterXlsx, and previewPopulatedTemplate via tRPC", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-admin",
        email: "admin@bsc.edu.ph",
        name: "Admin User",
        loginMethod: "test",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => undefined } as any,
    });

    const forms = await caller.procurement.templates.listSupportedForms();
    expect(forms).toHaveLength(5);
    expect(forms.map((f: any) => f.key)).toEqual(
      expect.arrayContaining(["purchase_request", "rfq", "abstract_of_quotations", "purchase_order", "acknowledgement_receipt"])
    );

    for (const key of templateKeys) {
      const download = await caller.procurement.templates.downloadMasterXlsx({ templateKey: key });
      expect(download.fileName.endsWith(".xlsx")).toBe(true);
      expect(download.base64).toBeTruthy();

      const preview = await caller.procurement.templates.previewPopulatedTemplate({ templateKey: key });
      expect(preview.htmlTable).toContain("excel-rendered-table");
      expect(preview.xlsxBase64).toBeTruthy();
      expect(preview.meta.injectedTokensCount).toBeGreaterThan(0);
    }
  });
});

