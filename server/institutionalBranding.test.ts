import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("institutional branding", () => {
  it("uses the supplied Batanes State College seal in the shared ProcureWise brand component", () => {
    const logo = readFileSync(new URL("../client/src/components/ProcureWiseLogo.tsx", import.meta.url), "utf8");
    expect(logo).toContain("/manus-storage/batanes-state-college-seal_d2569153.png");
    expect(logo).toContain('alt="Batanes State College seal"');
    expect(logo).toContain("Batanes State College");
  });
});
