// Client-safe: per-source completeness from the source registry. Missing or stale data is
// reported as such — never treated as "no change".
import { SOURCES } from "./sources";

export type RegistryRow = { source: string; owner: string; channel: string; licence: string; cadence: string; unit: string; area: string; stale_after_days: number; url: string | null; sort: number };
export type RunRow = { source: string; ok: boolean; ran_at: string; last_ok_at: string | null; error: string | null };
export type Completeness = { source: string; status: "ok" | "stale" | "unverifiable"; data_date: string | null; last_ok_at: string | null; reason: string };

export const STATUS_TH: Record<Completeness["status"], string> = { ok: "ครบ", stale: "เก่า", unverifiable: "ตรวจสอบไม่ได้" };

const matches = (reg: string, run: string) =>
  reg === run ||
  (reg.startsWith("เว็บไซต์หน่วยงานรัฐ") && run.endsWith("(เว็บไซต์ทางการ)")) ||
  (reg.startsWith("ข้อมูลเปิดภาครัฐ") && run.startsWith("ข้อมูลเปิดภาครัฐ"));

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3);
const bkkDay = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);

/**
 * latestObs: metric_id -> latest real observed_on (the date the data refers to).
 * lastEvidence: source -> latest raw file fetched_at.
 */
export function computeCompleteness(today: string, registry: RegistryRow[], runs: RunRow[], latestObs: Record<string, string>, lastEvidence: Record<string, string>): Completeness[] {
  return registry.map((r) => {
    const rs = runs.filter((x) => matches(r.source, x.source));
    const okTimes = [...rs.map((x) => x.last_ok_at), lastEvidence[r.source] ?? null].filter(Boolean) as string[];
    const last_ok_at = okTimes.sort().pop() ?? null;
    const metrics = SOURCES.filter((s) => s.source === r.source).flatMap((s) => s.metrics);
    const obsDates = metrics.map((m) => latestObs[m]).filter(Boolean) as string[];
    const data_date = obsDates.sort().pop() ?? (last_ok_at ? bkkDay(last_ok_at) : null);
    const failing = rs.length > 0 && rs.every((x) => !x.ok);
    if (!last_ok_at || !data_date) return { source: r.source, status: "unverifiable", data_date, last_ok_at, reason: "ยังไม่เคยดึงสำเร็จ" };
    const age = daysBetween(data_date, today);
    if (age > r.stale_after_days) return { source: r.source, status: failing ? "unverifiable" : "stale", data_date, last_ok_at, reason: `ข้อมูลล่าสุดอายุ ${age} วัน (เกณฑ์ ${r.stale_after_days} วัน)${failing ? " และรอบล่าสุดดึงไม่ได้" : ""}` };
    if (failing) return { source: r.source, status: "unverifiable", data_date, last_ok_at, reason: `รอบล่าสุดดึงไม่ได้: ${(rs.find((x) => x.error)?.error ?? "").slice(0, 120)}` };
    const bad = rs.filter((x) => !x.ok).length;
    if (bad) return { source: r.source, status: "ok", data_date, last_ok_at, reason: `ดึงได้บางส่วน — ${bad} จาก ${rs.length} แหล่งย่อยดึงไม่ได้` };
    return { source: r.source, status: "ok", data_date, last_ok_at, reason: age === 0 ? "ข้อมูลของวันนี้" : `ข้อมูลวันที่ ${data_date} (ยังอยู่ในรอบอัปเดต)` };
  });
}
