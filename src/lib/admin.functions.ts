import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin-middleware";

/** System health for the admin overview: failed jobs, sources failing in a row, brief publish times. */
export const getSystemHealth = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async () => {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 2 * 86400e3).toISOString();
  const [jobs, hist, briefs, queued] = await Promise.all([
    a.from("ingest_jobs").select("id,source,error,attempts,finished_at,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
    a.from("source_run_history").select("source,ok,ran_at,error").gte("ran_at", since).order("ran_at", { ascending: false }).limit(2000),
    a.from("daily_briefs").select("brief_date,published_at,cutoff_at").order("brief_date", { ascending: false }).limit(7),
    a.from("ingest_jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
  ]);
  const streak: Record<string, { fails: number; last_error: string | null; last_ok: string | null }> = {};
  for (const r of hist.data ?? []) {
    const s = (streak[r.source] ??= { fails: 0, last_error: null, last_ok: null });
    if (s.last_ok) continue;
    if (r.ok) s.last_ok = r.ran_at; else { s.fails++; s.last_error ??= r.error; }
  }
  const failing = Object.entries(streak).filter(([, s]) => s.fails >= 2).map(([source, s]) => ({ source, ...s })).sort((x, y) => y.fails - x.fails);
  return { failedJobs: jobs.data ?? [], failing, briefs: briefs.data ?? [], queued: queued.count ?? 0 };
});

/** Re-queue every failed job once (fresh attempts). */
export const requeueFailedJobs = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data } = await a.from("ingest_jobs").update({ status: "queued", attempts: 0, run_after: new Date().toISOString(), locked_until: null, error: null, finished_at: null })
    .eq("status", "failed").gte("created_at", new Date(Date.now() - 86400e3).toISOString()).select("id");
  return { requeued: data?.length ?? 0 };
});

/** Delete finished queue rows and run history older than 30 days. */
export const cleanupOldJobs = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { pruneOldJobs } = await import("./maintenance.server");
  return pruneOldJobs(a);
});
