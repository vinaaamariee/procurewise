import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("print preview and media styles verification", () => {
  const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
  const printPages = readFileSync(new URL("../client/src/pages/PrintPages.tsx", import.meta.url), "utf8");
  const dashboardLayout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");

  it("does not have 'body * { visibility: hidden' which caused blank print preview", () => {
    expect(css).not.toContain("body * { visibility: hidden");
  });

  it("formats page to standard A4 size in portrait with zero page margins for pinned headers/footers", () => {
    expect(css).toMatch(/@page\s*\{\s*size:\s*A4\s+portrait;\s*margin:\s*0;\s*\}/);
  });

  it("preserves background graphics and colors via -webkit-print-color-adjust and print-color-adjust", () => {
    expect(css).toContain("-webkit-print-color-adjust: exact !important;");
    expect(css).toContain("print-color-adjust: exact !important;");
  });

  it("hides elements outside the printable sheet via display: none", () => {
    expect(css).toContain(".no-print");
    expect(css).toContain(".print-hidden");
    expect(css).toContain("display: none !important;");
    expect(dashboardLayout).toContain("print:hidden no-print");
  });

  it("pins official header and footer images to top and bottom of the printed page", () => {
    expect(css).toContain(".print-bsc-header");
    expect(css).toContain(".print-bsc-footer");
    expect(css).toContain("position: fixed !important;");
    expect(css).toContain("top: 0 !important;");
    expect(css).toContain("bottom: 0 !important;");
    expect(css).toContain("width: 100% !important;");
  });

  it("uses official header.png and footer.png images that exist in client/public", () => {
    expect(printPages).toContain('"/header.png"');
    expect(printPages).toContain('"/footer.png"');
    expect(existsSync(new URL("../client/public/header.png", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../client/public/footer.png", import.meta.url))).toBe(true);
  });

  it("formats document canvas and printable sheets to standard A4 size (210mm)", () => {
    expect(css).toContain("width: 210mm !important;");
    expect(css).toContain("min-height: 297mm !important;");
  });
});
