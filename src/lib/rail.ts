// BTS / MRT service notices from the operators' official X accounts (via Firecrawl Markdown).
// Disruption-type posts are kept as labelled context; only delay/suspension notices count toward rail signals.
export const RAIL_ACCOUNTS = [
  { line: "BTS", url: "https://x.com/BTS_SkyTrain" },
  { line: "MRT", url: "https://x.com/BEM_MRT" },
] as const;

export const DISRUPT_RE = /ขัดข้อง|ล่าช้า|หยุดให้บริการ|งดให้บริการ|ปิดให้บริการชั่วคราว|ปิดสถานี|ปิดทางเข้า|เดินรถไม่ได้|เดินรถช้า|ปรับลดความเร็ว|เพิ่มระยะเวลา|ให้บริการไม่เต็ม|ไม่สามารถให้บริการ|delay|disrupt|suspend|technical (issue|problem)/i;

/** Signal rule (user-confirmed): delays & suspensions only — station exits/hours changes are context, not signals. */
export const SERVICE_ALERT_RE = /ขัดข้อง|ล่าช้า|หยุดให้บริการ|งดให้บริการ|ปิดให้บริการชั่วคราว|เดินรถไม่ได้|เดินรถช้า|ปรับลดความเร็ว|ให้บริการไม่เต็ม|ไม่สามารถให้บริการ|ขบวนรถสำรอง|ขบวนรถทดแทน|delay|suspend|disrupt|technical (issue|problem)/i;
export const NORMAL_RE = /(?:กลับมา|สามารถ|เปิด)ให้บริการ(?:ได้)?ตามปกติ|แก้ไข(?:เหตุขัดข้อง|ปัญหา)(?:เรียบร้อย|แล้ว)|resume(?:d)? normal service|service (?:has )?resumed/i;

export const isDisruption = (text: string) => DISRUPT_RE.test(text);
export const isServiceAlert = (text: string) => SERVICE_ALERT_RE.test(text) && !NORMAL_RE.test(text);

/** Count a burst of follow-up notices from the same operator as one incident within two hours. */
export function incidentPosts<T extends { source: string; posted_at: string }>(posts: T[]): T[] {
  const last = new Map<string, number>();
  return [...posts].sort((a, b) => a.posted_at.localeCompare(b.posted_at)).filter((p) => {
    const at = Date.parse(p.posted_at), prev = last.get(p.source);
    if (prev !== undefined && at - prev < 2 * 3600e3) return false;
    last.set(p.source, at);
    return true;
  });
}

/** Bangkok calendar date + 3-hour block (0–7) of an ISO timestamp. */
export const bkkDate = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);
export const bkkBlock = (iso: string) => Math.floor(new Date(Date.parse(iso) + 7 * 3600e3).getUTCHours() / 3);
export const BLOCK_TH = ["00–03", "03–06", "06–09", "09–12", "12–15", "15–18", "18–21", "21–24"];

export type RailStatus = "counted" | "context" | "late"; // 'late' remains for historical rows already labelled before this rule.
/**
 * Arrival-window rule: a service alert counts for the Bangkok day it was posted, or — when it was posted shortly
 * before midnight and first seen after it — for the day it arrived. Older notices are still counted on arrival,
 * with their original posted date preserved and an explicit reason, never silently dropped.
 */
export function classifyRail(text: string, postedIso: string, receivedIso: string, gapMs: number): { status: RailStatus; day: string; reason: string } {
  const pd = bkkDate(postedIso), rd = bkkDate(receivedIso);
  if (!isServiceAlert(text)) return { status: "context", day: pd, reason: "ไม่ใช่ประกาศล่าช้า/ขัดข้อง/หยุดให้บริการ (เช่น ปิดทางเข้า) — แสดงเป็นบริบท" };
  if (pd === rd) return { status: "counted", day: pd, reason: "ประกาศและได้รับในวันเดียวกัน" };
  const dayStart = Date.parse(rd + "T00:00:00+07:00");
  const lag = dayStart - Date.parse(postedIso);
  if (lag <= gapMs) return { status: "counted", day: rd, reason: `ประกาศก่อนเที่ยงคืน ${Math.round(lag / 60000)} นาที อยู่ในช่วงห่างของรอบตรวจ (${Math.round(gapMs / 60000)} นาที) — นับในวันที่ได้รับ` };
  return { status: "counted", day: rd, reason: `ประกาศวันที่ ${pd} แต่ได้รับวันที่ ${rd} หลังช่วงห่างรอบตรวจ (${Math.round(gapMs / 60000)} นาที) — นับวันที่ได้รับ โดยคงวันประกาศจริง` };
}
