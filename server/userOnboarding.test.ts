import { describe, expect, it } from "vitest";
import { upsertUser } from "./db";

describe("ProcureWise first-time account onboarding", () => {
  it("provisions a new non-owner authenticated account as an End-User without forcing that role on later updates", async () => {
    let insertedValues: Record<string, unknown> | undefined;
    let updateSet: Record<string, unknown> | undefined;
    const db = {
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          insertedValues = values;
          return { onConflictDoUpdate: async ({ set }: { set: Record<string, unknown> }) => { updateSet = set; } };
        },
      }),
    };

    await upsertUser({ openId: "first-time-end-user", name: "New End-User" }, { db: db as never });

    expect(insertedValues).toMatchObject({ openId: "first-time-end-user", role: "end_user" });
    expect(updateSet).not.toHaveProperty("role");
  });
});
