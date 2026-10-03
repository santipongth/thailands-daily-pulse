import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Family = { id: string; name_th: string; emoji: string; description: string; cadence: string; is_live: boolean; source_name: string; source_url: string | null; sort: number };
export type Metric = { id: string; family_id: string; name_th: string; unit: string; kind: string; decimals: number; sort: number; threshold_abs: number | null; threshold_pct: number | null; bands: number[] | null };
export type Signal = { id: string; family_id: string; metric_id: string; signal_date: string; severity: string; title: string; prev_value: number | null; new_value: number; change_abs: number | null; change_pct: number | null; is_demo: boolean; created_at: string; checks?: any; score?: number | null };
export type News = { id: number; source: string; title: string; link: string; published_at: string; agency: string | null; family_id: string | null };
export type Obs = { metric_id: string; observed_on: string; value: number; is_demo: boolean; received_at: string; effective_from?: string | null };

export function bkkToday() {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}
export function shiftDate(d: string, n: number) {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export function thaiDate(d: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) {
  return new Intl.DateTimeFormat("th-TH", { ...opts, timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
}
export function fmt(v: number, decimals: number) {
  return Number(v).toLocaleString("th-TH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

async function throwing<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const dayQuery = (date: string) =>
  queryOptions({
    queryKey: ["day", date],
    queryFn: async () => {
      const from = shiftDate(date, -60);
      const [families, metrics, signals, obs, brief, calendar, news] = await Promise.all([
        throwing<Family[]>(supabase.from("families").select("*").order("sort")),
        throwing<Metric[]>(supabase.from("metrics").select("id,family_id,name_th,unit,kind,decimals,sort,threshold_abs,threshold_pct,bands").order("sort")),
        throwing<Signal[]>(supabase.from("signals").select("*").eq("signal_date", date)),
        throwing<Obs[]>(supabase.from("observations").select("metric_id,observed_on,value,is_demo,received_at,effective_from").gte("observed_on", from).lte("observed_on", date).order("observed_on").limit(1000)),
        throwing<{ body: string; generated_at: string; published_at: string | null; items: any } | null>(supabase.from("daily_briefs").select("body,generated_at,published_at,items").eq("brief_date", date).maybeSingle()),
        throwing<{ id: number; family_id: string; title: string; release_date: string }[]>(
          supabase.from("release_calendar").select("*").gt("release_date", date).order("release_date").limit(6),
        ),
        throwing<News[]>(
          supabase.from("news_items").select("*").lte("published_at", shiftDate(date, 1) + "T00:00:00+07:00").gte("published_at", shiftDate(date, -3) + "T00:00:00+07:00").order("published_at", { ascending: false }).limit(200),
        ),
      ]);
      signals.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0) || (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3));
      return { families, metrics, signals, obs, brief, calendar, news };
    },
  });

export const familyQuery = (id: string) =>
  queryOptions({
    queryKey: ["family", id],
    queryFn: async () => {
      const family = await throwing<Family | null>(supabase.from("families").select("*").eq("id", id).maybeSingle());
      if (!family) return null;
      const metrics = await throwing<Metric[]>(supabase.from("metrics").select("id,family_id,name_th,unit,kind,decimals,sort,threshold_abs,threshold_pct,bands").eq("family_id", id).order("sort"));
      const ids = metrics.map((m) => m.id);
      const [obs, signals, news] = await Promise.all([
        throwing<Obs[]>(supabase.from("observations").select("metric_id,observed_on,value,is_demo,received_at,effective_from").in("metric_id", ids).order("observed_on")),
        throwing<Signal[]>(supabase.from("signals").select("*").eq("family_id", id).order("signal_date", { ascending: false }).limit(50)),
        throwing<News[]>(supabase.from("news_items").select("*").eq("family_id", id).order("published_at", { ascending: false }).limit(10)),
      ]);
      return { family, metrics, obs, signals, news };
    },
  });

export const sourcesQuery = queryOptions({
  queryKey: ["sources"],
  queryFn: async () => {
    const [families, latest] = await Promise.all([
      throwing<Family[]>(supabase.from("families").select("*").order("sort")),
      throwing<{ created_at: string } | null>(supabase.from("observations").select("created_at").eq("is_demo", false).order("created_at", { ascending: false }).limit(1).maybeSingle()),
    ]);
    return { families, lastLive: latest?.created_at ?? null };
  },
});

export type Sensitivity = "low" | "medium" | "high";
export const SENS_SEVERITIES: Record<Sensitivity, string[]> = {
  low: ["high"],
  medium: ["high", "medium"],
  high: ["high", "medium", "low"],
};
