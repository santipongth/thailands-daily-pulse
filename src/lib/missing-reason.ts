// Shared "why is there no value" text for a metric — used by the Daily Brief tables and /data-all.
import { thaiDate } from "@/lib/signals";
import { SOURCES } from "@/lib/sources";
import type { Completeness } from "@/lib/completeness";

export type Run = { source: string; ran_at: string; ok: boolean; error: string | null };
export type Release = { family_id: string; title: string; release_date: string };
type M = { id: string; family_id: string };

const hm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
export const srcOf = (id: string) => SOURCES.find((s) => s.metrics.includes(id))?.source ?? null;

export function makeReasonOf(runs: Run[], releases: Release[], completeness: Completeness[] | null = null) {
  return (m: M): string => {
    if (m.id === "quake_th") return "ไม่มีแผ่นดินไหวในไทยวันนี้ (ไม่ใช่ข้อมูลขาด)";
    if (m.id.startsWith("lot")) return "ไม่ใช่วันออกสลาก — ออกรางวัลวันที่ 1 และ 16 ของเดือน";
    const REL_KW: Record<string, string> = { cpi: "เงินเฟ้อ", gdp: "GDP", unemp: "ว่างงาน" };
    const kw = REL_KW[m.id] as string | undefined;
    const rel = releases.find((x) => x.family_id === m.family_id && (!kw || x.title.includes(kw))) ?? releases.find((x) => x.family_id === m.family_id);
    const src = srcOf(m.id);
    if (!src) return rel ? `ประกาศตามรอบ ไม่ได้ดึงรายวัน — รอบถัดไป ${thaiDate(rel.release_date, { day: "numeric", month: "short" })} (${rel.title})` : "ไม่มีแหล่งข้อมูลผูกไว้";
    const c = completeness?.find((x) => x.source === src);
    const run = runs.find((x) => x.source === src);
    if (!run) return `${src}: ยังไม่เคยดึงสำเร็จ — รอรอบดึงถัดไป`;
    if (!run.ok && run.error?.startsWith("429")) return `${src} ถูกจำกัดคำขอ (429) ล่าสุด ${hm(run.ran_at)} น. — ผู้ให้บริการบล็อกที่อยู่ของเซิร์ฟเวอร์ ไม่ใช่ "ไม่เปลี่ยน"`;
    if (!run.ok) return `${src}: ดึงล้มเหลวล่าสุด ${hm(run.ran_at)} น.${run.error ? ` — ${run.error}` : ""}`;
    if (m.id === "tmax_bkk") return `${src}: ค่านี้คือสูงสุดของเมื่อวานจากรายงานราย 3 ชม. — ยังไม่มีรายงานของเมื่อวานครบ (ระบบเริ่มเก็บ 3 ต.ค.)`;
    if (c && c.status !== "ok") return `${src}: ${c.reason}`;
    return `${src}: ดึงสำเร็จล่าสุด ${hm(run.ran_at)} น. แต่ยังไม่มีค่าของวันนี้ก่อนเวลาตัด`;
  };
}
