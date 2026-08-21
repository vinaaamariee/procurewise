import { Client } from "pg";
import { describe, expect, it } from "vitest";

describe("Supabase PostgreSQL migration connection", () => {
  it("connects to the configured Supabase PostgreSQL database with a lightweight read-only query", async () => {
    const password = process.env.SUPABASE_DB_PASSWORD;
    expect(password).toBeTruthy();
    const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password!)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
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
