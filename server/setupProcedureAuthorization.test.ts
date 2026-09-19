import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: AuthenticatedUser["role"]): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `setup-${role}`,
    email: "setup@example.com",
    name: "Setup Test User",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("procurement.setup.users authorization", () => {
  it("allows the persisted admin role to load the protected user directory", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.procurement.setup.users()).resolves.toEqual(expect.any(Array));
  });

  it("rejects an End-User from loading the protected user directory", async () => {
    const caller = appRouter.createCaller(createContext("end_user"));

    await expect(caller.procurement.setup.users()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This procurement action is not permitted for your assigned role.",
    });
  });
});
