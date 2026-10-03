import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

export const SCHEDULES = ["default", "hourly", "3h", "daily", "manual"] as const;
export const SOURCE_FETCH_MODES = ["default", "auto", "direct", "firecrawl"] as const;

/** All runnable sources with their admin config (if any) and latest run. */
export const listSourceConfig = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allSources, loadConfigs } = await import("./source-config.server");
    const [list, cfg, { data: runs }] = await Promise.all([
      allSources(), loadConfigs(supabaseAdmin),
      supabaseAdmin.from("source_runs").select("source,ok,ran_at,rows,error,sample"),
    ]);
    const byRun = new Map((runs ?? []).map((r) => [r.source, r]));
    return list.map((s) => ({ source: s.source, config: cfg.get(s.source) ?? null, run: byRun.get(s.source) ?? null }));
  });

export const saveSourceConfig = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({
    source: z.string().min(1).max(200),
    enabled: z.boolean(),
    schedule: z.enum(SCHEDULES),
    daily_hour: z.number().int().min(0).max(23).nullable(),
    fetch_mode: z.enum(SOURCE_FETCH_MODES),
    max_attempts: z.number().int().min(1).max(6),
    retry_delay_min: z.number().int().min(1).max(240).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allSources } = await import("./source-config.server");
    if (!(await allSources()).some((s) => s.source === data.source)) return { ok: false as const, error: "ไม่รู้จักแหล่งนี้" };
    const { error } = await supabaseAdmin.from("source_config").upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Queue and run one source now (manual run); then re-detect and re-rank today's signals. */
export const runSourceNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ source: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { allSources, loadConfigs } = await import("./source-config.server");
    const spec = (await allSources()).find((s) => s.source === data.source);
    if (!spec) return { ok: false as const, error: "ไม่รู้จักแหล่งนี้" };
    const { enqueue, drain } = await import("./queue.server");
    const { bangkokDate } = await import("./ingest.server");
    const c = (await loadConfigs(admin)).get(spec.source);
    await enqueue(admin, [{ ...spec, ...(c ? { max_attempts: c.max_attempts } : {}) }], "manual");
    const date = bangkokDate();
    await drain(admin, date, 150e3, 3);
    await admin.rpc("detect_signals", { _d: date });
    await admin.rpc("rank_signals", { _d: date });
    const { data: run } = await admin.from("source_runs").select("ok,ran_at,rows,error,sample").eq("source", spec.source).maybeSingle();
    return { ok: true as const, run };
  });

/** Per-source success rate, failure causes, hour-of-day pattern and a rule-based settings recommendation. */
export const sourcePerformance = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ days: z.union([z.literal(7), z.literal(30)]) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { analyse } = await import("./perf");
    const { loadConfigs } = await import("./source-config.server");
    const since = new Date(Date.now() - data.days * 86400e3).toISOString();
    const [{ data: runs }, { data: ev }, cfg] = await Promise.all([
      admin.from("source_run_history").select("source,ran_at,ok,error").gte("ran_at", since).order("ran_at").limit(20000),
      admin.from("raw_evidence").select("source,fetched_at").gte("fetched_at", since).limit(20000),
      loadConfigs(admin),
    ]);
    const bySrc = new Map<string, any[]>();
    for (const r of runs ?? []) bySrc.set(r.source, [...(bySrc.get(r.source) ?? []), r]);
    const files = new Map<string, number>();
    for (const e of ev ?? []) files.set(e.source, (files.get(e.source) ?? 0) + 1);
    return [...bySrc].map(([s, list]) => {
      const f = files.get(s);
      const firstDay = Math.max(1, Math.min(data.days, (Date.now() - Date.parse(list[0].ran_at)) / 86400e3));
      return { ...analyse(s, list, firstDay, f === undefined ? null : f / firstDay, cfg.get(s) ?? null), config: cfg.get(s) ?? null };
    }).sort((a, b) => a.rate - b.rate);
  });
