import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";
import { previewRule } from "./custom-source";

const cfgSchema = z.object({
  url: z.string().url().max(500).refine((u) => /^https?:\/\//.test(u), "ต้องเป็น http(s)"),
  format: z.enum(["json", "csv", "text"]),
  value_path: z.string().min(1).max(300),
  date_path: z.string().max(300).nullable().default(null),
  row_match: z.string().max(200).nullable().default(null),
});

const bkkToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

/** Admin: try a source definition without saving anything. */
export const testCustomSource = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => cfgSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { fetchCustom } = await import("./custom-source.server");
      return { ok: true as const, ...(await fetchCustom(data)) };
    } catch (e) { return { ok: false as const, error: String((e as Error).message).slice(0, 300) }; }
  });

export const listCustom = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const [{ data: sources }, { data: families }, { data: metrics }, { data: rules }] = await Promise.all([
      a.from("custom_sources").select("*").order("created_at", { ascending: false }),
      a.from("families").select("id,name_th").order("sort"),
      a.from("metrics").select("id,name_th,unit,family_id,kind,threshold_abs,threshold_pct,bands,decimals").order("family_id").order("sort"),
      a.from("metric_rule_versions").select("*").order("effective_from", { ascending: false }).order("id", { ascending: false }),
    ]);
    return { sources: sources ?? [], families: families ?? [], metrics: metrics ?? [], rules: rules ?? [], today: bkkToday() };
  });

/** Admin: save a tested source → metric (no threshold yet), registry row, schedule. */
export const saveCustomSource = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => cfgSchema.extend({
    key: z.string().regex(/^[a-z0-9_]{2,30}$/),
    name: z.string().min(2).max(120),
    owner: z.string().min(1).max(120),
    licence: z.string().max(120).default("ไม่ระบุ"),
    family_id: z.string().min(1).max(40),
    metric_name: z.string().min(1).max(120),
    unit: z.string().max(40).default(""),
    decimals: z.number().int().min(0).max(4).default(2),
    custom_times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).max(48).default([]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { allSources } = await import("./source-config.server");
    if ((await allSources()).some((s) => s.source === data.name)) return { ok: false as const, error: "มีแหล่งชื่อนี้อยู่แล้ว" };
    const { fetchCustom } = await import("./custom-source.server");
    try { await fetchCustom(data); } catch (e) { return { ok: false as const, error: `ทดลองดึงไม่ผ่าน: ${(e as Error).message}` }; }
    const metric_id = `c_${data.key}`;
    const steps = [
      () => a.from("metrics").insert({ id: metric_id, family_id: data.family_id, name_th: data.metric_name, unit: data.unit, kind: "delta", decimals: data.decimals, sort: 900 }),
      () => a.from("custom_sources").insert({ key: data.key, name: data.name, owner: data.owner, url: data.url, licence: data.licence, format: data.format, value_path: data.value_path, date_path: data.date_path || null, row_match: data.row_match || null, metric_id }),
      () => a.from("source_registry").upsert({ source: data.name, owner: data.owner, channel: data.format === "json" ? "api" : data.format, licence: data.licence, cadence: data.custom_times.length ? `กำหนดเอง ${data.custom_times.join(", ")}` : "ดึงเอง", unit: data.unit, url: data.url, sort: 900 }),
      () => a.from("source_config").upsert({ source: data.name, enabled: true, schedule: data.custom_times.length ? "custom" : "manual", custom_times: data.custom_times, daily_hour: null, fetch_mode: "default", max_attempts: 3, retry_delay_min: null, updated_at: new Date().toISOString() }),
    ];
    for (const s of steps) { const { error } = await s(); if (error) return { ok: false as const, error: error.message }; }
    return { ok: true as const, metric_id };
  });

/** Admin: stop a custom source. Readings, evidence and its metric stay (never deleted). */
export const disableCustomSource = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ key: z.string().min(1).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { data: c } = await a.from("custom_sources").select("name").eq("key", data.key).maybeSingle();
    if (!c) return { ok: false as const, error: "ไม่พบแหล่งนี้" };
    await a.from("custom_sources").update({ active: false }).eq("key", data.key);
    await a.from("source_config").update({ enabled: false }).eq("source", c.name);
    return { ok: true as const };
  });

const ruleSchema = z.object({
  metric_id: z.string().min(1).max(60),
  kind: z.enum(["delta", "level", "release"]),
  threshold_abs: z.number().positive().nullable().default(null),
  threshold_pct: z.number().positive().max(1000).nullable().default(null),
  bands: z.array(z.number()).max(6).nullable().default(null),
}).refine((r) => r.kind !== "delta" || r.threshold_abs || r.threshold_pct, "ต้องใส่เกณฑ์อย่างน้อยหนึ่งค่า")
  .refine((r) => r.kind !== "level" || (r.bands && r.bands.length > 0), "ต้องใส่ระดับอย่างน้อยหนึ่งค่า");

/** Admin: which past days a rule would have triggered on (stored readings only). */
export const previewSignalRule = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => ruleSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await a.from("observations").select("observed_on,value").eq("metric_id", data.metric_id).eq("is_demo", false).order("observed_on", { ascending: false }).limit(120);
    const list = (rows ?? []).map((r) => ({ observed_on: r.observed_on, value: Number(r.value) }));
    return { readings: list.length, hits: previewRule(list, data).reverse().slice(0, 30) };
  });

/** Admin: add a rule version. Effective date must be today or later — past days are never re-scored. */
export const saveSignalRule = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ rule: ruleSchema, effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(300).nullable().default(null) }).parse(d))
  .handler(async ({ data }) => {
    if (data.effective_from < bkkToday()) return { ok: false as const, error: "วันที่มีผลต้องเป็นวันนี้หรืออนาคต — ไม่ย้อนตัดสินข้อมูลเก่า" };
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { error } = await a.from("metric_rule_versions").insert({ ...data.rule, bands: data.rule.kind === "level" ? data.rule.bands : null, effective_from: data.effective_from, note: data.note });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });
