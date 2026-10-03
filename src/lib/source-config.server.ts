// Server-only: admin overrides per source (source_config). A source with no row, or schedule
// "default" and enabled, keeps the built-in cadence. Overridden sources are queued only by these rules.
import type { JobSpec } from "./queue.server";

export type SourceConfig = { source: string; enabled: boolean; schedule: string; daily_hour: number | null; fetch_mode: string; max_attempts: number; retry_delay_min: number | null; range_start?: number | null; range_end?: number | null; extra_hours?: number[] };

const EXTRA: JobSpec[] = [
  { job_type: "rakakaset", source: "RakaKaset (ราคาเกษตร)" },
  { job_type: "checkraka", source: "CheckRaka (ราคาอาหาร)" },
  { job_type: "holidays", source: "Kapook ปฏิทินวันหยุด" },
  { job_type: "rdtax", source: "กรมสรรพากร (ปฏิทินภาษี)" },
  { job_type: "lottery", source: "สำนักงานสลากกินแบ่งรัฐบาล (GLO)" },
  { job_type: "news", source: "ข่าว RSS" },
  { job_type: "news_general", source: "ข่าวทั่วไป RSS" },
  { job_type: "rail", source: "รถไฟฟ้า BTS/MRT (X)" },
  { job_type: "social", source: "FM91 Trafficpro (X)" },
];

/** Every source the queue can run, with its job type. */
export async function allSources(): Promise<JobSpec[]> {
  const { CONNECTORS } = await import("./connectors.server");
  const seen = new Set<string>();
  return [...CONNECTORS.map((c) => ({ job_type: "connector", source: c.source })), ...EXTRA].filter((s) => (seen.has(s.source) ? false : (seen.add(s.source), true)));
}

export async function loadConfigs(admin: any): Promise<Map<string, SourceConfig>> {
  const { data } = await admin.from("source_config").select("*");
  return new Map((data ?? []).map((c: SourceConfig) => [c.source, c]));
}

/** Bangkok hour h inside [start, end], wrapping past midnight (16→8 = evening/night/morning). */
export const inRange = (h: number, start: number, end: number) => (start <= end ? h >= start && h <= end : h >= start || h <= end);

const overridden = (c?: SourceConfig) => !!c && (!c.enabled || c.schedule !== "default");

/**
 * Removes overridden sources from the built-in specs, then adds overridden sources that are due now.
 * Attaches max_attempts from config to every spec that has a row.
 */
export async function applySourceConfig(admin: any, specs: JobSpec[], runKind?: string): Promise<(JobSpec & { max_attempts?: number })[]> {
  const out = await applyConfigOnly(admin, specs, runKind);
  const { pausedSources, breakerBypass } = await import("./breaker.server");
  if (breakerBypass(runKind)) return out;
  const paused = await pausedSources(admin);
  return paused.size ? out.filter((s) => !paused.has(s.source)) : out;
}

async function applyConfigOnly(admin: any, specs: JobSpec[], runKind?: string): Promise<(JobSpec & { max_attempts?: number })[]> {
  const cfg = await loadConfigs(admin);
  if (!cfg.size) return specs;
  const out: (JobSpec & { max_attempts?: number })[] = specs.filter((s) => !overridden(cfg.get(s.source)));
  const want = [...cfg.values()].filter((c) => c.enabled && c.schedule !== "default");
  if (want.length) {
    const { data: runs } = await admin.from("source_runs").select("source,ok,ran_at").in("source", want.map((c) => c.source));
    const last = new Map<string, { ok: boolean; ran_at: string }>((runs ?? []).map((r: any) => [r.source, r]));
    const types = new Map((await allSources()).map((s) => [s.source, s.job_type]));
    const now = Date.now();
    const bkk = new Date(now + 7 * 3600e3);
    const today = bkk.toISOString().slice(0, 10);
    for (const c of want) {
      const jt = types.get(c.source);
      if (!jt || out.some((s) => s.source === c.source)) continue;
      const r = last.get(c.source);
      const t = r ? Date.parse(r.ran_at) : 0;
      const h = bkk.getUTCHours();
      const ranThisHour = Math.floor(t / 3600e3) === Math.floor(now / 3600e3);
      const extra = (c.extra_hours ?? []).includes(h) && !ranThisHour;
      const due = extra || runKind === "manual" ? true
        : c.schedule === "hourly" ? Math.floor(t / 3600e3) < Math.floor(now / 3600e3)
        : c.schedule === "3h" ? now - t >= 3 * 3600e3 - 5 * 60e3
        : c.schedule === "hourly_range" ? (inRange(h, c.range_start ?? 16, c.range_end ?? 8) ? !ranThisHour : now - t >= 3 * 3600e3 - 5 * 60e3)
        : c.schedule === "daily" ? bkk.getUTCHours() === (c.daily_hour ?? 5) && !(r?.ok && new Date(t + 7 * 3600e3).toISOString().slice(0, 10) === today)
        : false; // manual: only via "ดึงตอนนี้"
      if (due) out.push({ job_type: jt, source: c.source });
    }
  }
  return out.map((s) => { const c = cfg.get(s.source); return c ? { ...s, max_attempts: c.max_attempts } : s; });
}
