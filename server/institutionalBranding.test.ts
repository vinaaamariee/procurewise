import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("institutional branding", () => {
  it("uses the supplied Batanes State College seal in the shared ProcureWise brand component", () => {
    const logo = readFileSync(new URL("../client/src/components/ProcureWiseLogo.tsx", import.meta.url), "utf8");
    expect(logo).toContain("/bsc-logo.jpg");
    expect(logo).toContain('alt="Batanes State College"');
    expect(logo).toContain("Batanes State College");
  });
});
