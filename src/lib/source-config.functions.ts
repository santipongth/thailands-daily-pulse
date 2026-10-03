import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

export const SCHEDULES = ["default", "hourly", "3h", "daily", "manual", "hourly_range"] as const;
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
    range_start: z.number().int().min(0).max(23).nullable().default(null),
    range_end: z.number().int().min(0).max(23).nullable().default(null),
    extra_hours: z.array(z.number().int().min(0).max(23)).max(24).default([]),
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
    const { rollupPerf } = await import("./maintenance.server");
    await rollupPerf(admin, 2).catch(() => 0); // keep today's trend row fresh
    const sinceDay = new Date(Date.now() + 7 * 3600e3 - data.days * 86400e3).toISOString().slice(0, 10);
    const [{ data: runs }, { data: ev }, cfg, { data: daily }, { data: snaps }] = await Promise.all([
      admin.from("source_run_history").select("source,ran_at,ok,error").gte("ran_at", since).order("ran_at").limit(20000),
      admin.from("raw_evidence").select("source,fetched_at").gte("fetched_at", since).limit(20000),
      loadConfigs(admin),
      admin.from("source_perf_daily").select("source,day,runs,ok,files_changed,median_data_age_min").gte("day", sinceDay).order("day"),
      admin.from("station_snapshots").select("source,observed_at,received_at").gte("received_at", since).not("observed_at", "is", null).limit(20000),
    ]);
    const trend = new Map<string, any[]>();
    for (const d of daily ?? []) trend.set(d.source, [...(trend.get(d.source) ?? []), d]);
    const ages = new Map<string, number[]>();
    for (const s of snaps ?? []) ages.set(s.source, [...(ages.get(s.source) ?? []), (Date.parse(s.received_at) - Date.parse(s.observed_at!)) / 60e3]);
    const med = (xs?: number[]) => { if (!xs?.length) return null; const t = [...xs].sort((x, y) => x - y); return Math.round(t[t.length >> 1]!); };
    const bySrc = new Map<string, any[]>();
    for (const r of runs ?? []) bySrc.set(r.source, [...(bySrc.get(r.source) ?? []), r]);
    const files = new Map<string, number>();
    for (const e of ev ?? []) files.set(e.source, (files.get(e.source) ?? 0) + 1);
    return [...bySrc].map(([s, list]) => {
      const f = files.get(s);
      const firstDay = Math.max(1, Math.min(data.days, (Date.now() - Date.parse(list[0].ran_at)) / 86400e3));
      return { ...analyse(s, list, firstDay, f === undefined ? null : f / firstDay, cfg.get(s) ?? null), config: cfg.get(s) ?? null, trend: trend.get(s) ?? [], dataAgeMin: med(ages.get(s)) };
    }).sort((a, b) => a.rate - b.rate);
  });
