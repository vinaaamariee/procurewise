import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "sample-supabase-user",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "supabase",
      role: "end_user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("acknowledges the client-managed Supabase Auth sign-out handoff", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
  });
});
