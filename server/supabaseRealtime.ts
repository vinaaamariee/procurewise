import { createClient } from "@supabase/supabase-js";

export type ProcurementRealtimeRecordType = "pre_canvass" | "abstract_of_canvass";

const REALTIME_TOPIC = "procurewise:workflow";

export function getSupabaseRealtimePublicConfig() {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}

export function buildProcurementRealtimePayload(recordType: ProcurementRealtimeRecordType) {
  return { recordType, occurredAt: new Date().toISOString() };
}

export async function publishProcurementRealtimeUpdate(recordType: ProcurementRealtimeRecordType) {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return { published: false, reason: "not_configured" as const };

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const channel = client.channel(REALTIME_TOPIC, { config: { broadcast: { ack: true, self: false } } });
  try {
    const subscribed = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2_500);
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") { clearTimeout(timeout); resolve(true); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { clearTimeout(timeout); resolve(false); }
      });
    });
    if (!subscribed) return { published: false, reason: "unavailable" as const };
    const response = await channel.send({ type: "broadcast", event: "record_changed", payload: buildProcurementRealtimePayload(recordType) });
    return { published: response === "ok", reason: response === "ok" ? "published" as const : "unavailable" as const };
  } finally {
    await client.removeChannel(channel);
  }
}
