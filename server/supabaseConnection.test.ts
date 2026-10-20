import { Client } from "pg";
import { describe, expect, it } from "vitest";

describe("Supabase PostgreSQL migration connection", () => {
  it("connects to the configured Supabase PostgreSQL database with a lightweight read-only query", async () => {
    const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    expect(connectionString).toBeTruthy();
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const result = await client.query<{ database_name: string }>("select current_database() as database_name");
      expect(result.rows[0]?.database_name).toBeTruthy();
    } finally {
      await client.end();
    }
  }, 20_000);
});
