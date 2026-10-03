import { createClient } from "@supabase/supabase-js";

const tables = [
  "daily_briefs", "brief_updates", "signals", "signal_events", "signal_versions",
  "families", "metrics", "source_registry", "source_runs", "source_run_history",
  "observations", "dam_readings", "weather_station_obs", "lottery_draws",
  "social_posts", "news_items", "holidays", "tax_deadlines", "release_calendar", "raw_evidence",
] as const;
export type PublicTable = (typeof tables)[number];
export const PUBLIC_TABLES = new Set<string>(tables);
const SAFE_COLUMNS: Partial<Record<PublicTable, string>> = {
  raw_evidence: "id,source,url,http_status,content_type,bytes,sha256,fetched_at",
  holidays: "id,holiday_date,name,kind,note,created_at",
};

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};
function env(name: string) {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}
function config(names: string[]) {
  for (const name of names) {
    const value = env(name)?.trim();
    if (value) return value;
  }
  return undefined;
}
function publicKey() {
  const direct = config(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = env("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed = JSON.parse(keyset) as Record<string, unknown>;
      const key = Object.values(parsed).find((value) => typeof value === "string" && value.startsWith("sb_publishable_"));
      if (typeof key === "string") return key;
    } catch { /* fall through */ }
  }
  const legacy = config(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("Public database key is not configured");
}
export function publicDatabase() {
  const url = config(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("Public database URL is not configured");
  return createClient(url, publicKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export const LIMIT_MAX = 100;
export function boundedLimit(value: unknown, fallback = 25) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(LIMIT_MAX, Math.max(1, parsed)) : fallback;
}
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
export function bkkDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export async function readPublicRows(table: PublicTable, options: {
  limit?: number; order?: string; ascending?: boolean; filters?: Record<string, string | boolean>;
} = {}) {
  let query = publicDatabase().from(table).select(SAFE_COLUMNS[table] ?? "*");
  for (const [key, value] of Object.entries(options.filters ?? {})) query = query.eq(key, value);
  if (options.order) query = query.order(options.order, { ascending: options.ascending ?? false });
  const { data, error } = await query.limit(boundedLimit(options.limit));
  if (error) throw new Error(error.message);
  return data ?? [];
}
