import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

describe("Supabase Realtime browser credentials", () => {
  it("accepts the configured project URL and anon key for a minimal public API request", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    expect(url).toBeTruthy();
    expect(anonKey).toBeTruthy();
    const response = await fetch(`${url}/rest/v1/offices?select=id&limit=1`, { headers: { apikey: anonKey! } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.any(Array));
  }, 20_000);

  it("accepts the server-only service-role key for a minimal broadcast-service API request", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();
    const response = await fetch(`${url}/rest/v1/offices?select=id&limit=1`, { headers: { apikey: serviceRoleKey! } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.any(Array));
  }, 20_000);

  it("delivers a metadata-only workflow broadcast from the server credential to the browser credential", async () => {
    const url = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const topic = `procurewise:credential-validation:${Date.now()}`;
    const listener = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const publisher = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    let listenerChannel: ReturnType<typeof listener.channel> | null = null;
    const received = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for Supabase Realtime broadcast.")), 10_000);
      listenerChannel = listener.channel(topic, { config: { broadcast: { self: false } } }).on("broadcast", { event: "record_changed" }, ({ payload }) => { clearTimeout(timer); resolve(payload); });
      listenerChannel.subscribe((status) => { if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timer); reject(new Error(`Browser Realtime subscription failed: ${status}`)); } });
    });
    const publisherChannel = publisher.channel(topic, { config: { broadcast: { ack: true, self: false } } });
    await new Promise<void>((resolve, reject) => publisherChannel.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`Server Realtime subscription failed: ${status}`)); }));
    expect(await publisherChannel.send({ type: "broadcast", event: "record_changed", payload: { recordType: "pre_canvass", occurredAt: new Date().toISOString() } })).toBe("ok");
    expect(await received).toMatchObject({ recordType: "pre_canvass" });
    await publisher.removeChannel(publisherChannel);
    if (listenerChannel) await listener.removeChannel(listenerChannel);
  }, 20_000);
});
