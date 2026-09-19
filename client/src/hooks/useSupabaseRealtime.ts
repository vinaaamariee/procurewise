import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export type ProcurementRealtimeRecordType = "pre_canvass" | "abstract_of_canvass";
export type RealtimeConnectionState = "connecting" | "live" | "unavailable";

type RealtimeSignal = { recordType?: ProcurementRealtimeRecordType; occurredAt?: string };

let realtimeClient: ReturnType<typeof createClient> | null = null;
let realtimeClientKey = "";

function getRealtimeClient(url: string | undefined, anonKey: string | undefined) {
  if (!url || !anonKey) return null;
  const key = `${url}:${anonKey}`;
  if (!realtimeClient || realtimeClientKey !== key) { realtimeClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } }); realtimeClientKey = key; }
  return realtimeClient;
}

export function useSupabaseRealtime({ recordTypes, onRecordChanged }: { recordTypes: ProcurementRealtimeRecordType[]; onRecordChanged: () => void | Promise<unknown> }) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const realtimeConfig = trpc.procurement.realtime.config.useQuery(undefined, { retry: false, staleTime: Infinity });
  const latestHandler = useRef(onRecordChanged);
  latestHandler.current = onRecordChanged;
  const recordTypeKey = [...recordTypes].sort().join("|");
  const configKey = realtimeConfig.data?.isConfigured ? `${realtimeConfig.data.url}:${realtimeConfig.data.anonKey}` : "";

  useEffect(() => {
    if (realtimeConfig.isLoading) { setConnectionState("connecting"); return; }
    const client = getRealtimeClient(realtimeConfig.data?.url, realtimeConfig.data?.anonKey);
    if (!client) { setConnectionState("unavailable"); return; }
    let active = true;
    const acceptedRecordTypes = new Set(recordTypeKey.split("|") as ProcurementRealtimeRecordType[]);
    const channel = client
      .channel("procurewise:workflow", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "record_changed" }, ({ payload }) => {
        const signal = payload as RealtimeSignal;
        if (!signal.recordType || !acceptedRecordTypes.has(signal.recordType)) return;
        if (active) setLastUpdatedAt(signal.occurredAt || new Date().toISOString());
        void latestHandler.current();
      })
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") setConnectionState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnectionState("unavailable");
      });

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [configKey, realtimeConfig.isLoading, recordTypeKey]);

  return { connectionState, lastUpdatedAt };
}
