import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first Purchase Request action", () => {
  it("supports an in-page empty-state action and uses it to open the Purchase Request form", () => {
    const emptyWorkspace = readFileSync(new URL("../client/src/components/EmptyWorkspace.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
    expect(emptyWorkspace).toContain("actionOnClick?: () => void");
    expect(emptyWorkspace).toContain("onClick={actionOnClick}");
    expect(workspace).toContain('actionLabel="Create your first PR" actionOnClick={() => setIsCreating(true)}');
    expect(workspace).not.toContain('actionLabel="Create your first PR" actionHref="/purchase-requests"');
  });
});
