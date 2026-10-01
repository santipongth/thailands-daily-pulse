import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeCompleteness, type RegistryRow, type RunRow } from "./completeness";

export const bkkToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

/** Source registry + live completeness per source. */
export const registryQuery = queryOptions({
  queryKey: ["source-registry"],
  queryFn: async () => {
    const since = new Date(Date.now() - 120 * 86400e3).toISOString().slice(0, 10);
    const [reg, runs, obs, ev] = await Promise.all([
      supabase.from("source_registry").select("*").order("sort"),
      supabase.from("source_runs").select("source,ok,ran_at,last_ok_at,error"),
      supabase.from("observations").select("metric_id,observed_on").eq("is_demo", false).gte("observed_on", since).order("observed_on", { ascending: false }).limit(1000),
      supabase.from("raw_evidence").select("source,fetched_at").order("fetched_at", { ascending: false }).limit(500),
    ]);
    if (reg.error) throw reg.error;
    const latest: Record<string, string> = {};
    for (const o of obs.data ?? []) latest[o.metric_id] ??= o.observed_on;
    const lastEv: Record<string, string> = {};
    for (const e of ev.data ?? []) lastEv[e.source] ??= e.fetched_at;
    const registry = (reg.data ?? []) as RegistryRow[];
    return { registry, completeness: computeCompleteness(bkkToday(), registry, (runs.data ?? []) as RunRow[], latest, lastEv) };
  },
});
