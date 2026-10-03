// Deterministic per-source performance summary + settings recommendation (unit-tested in perf.test.ts).

export type RunH = { source: string; ran_at: string; ok: boolean; error: string | null };
export type Cause = "429" | "403" | "timeout" | "partial" | "other";
export type Rec = { schedule?: string; daily_hour?: number | null; fetch_mode?: string; retry_delay_min?: number | null; max_attempts?: number; reasons: string[] };
export type Perf = {
  source: string; runs: number; ok: number; rate: number; causes: Partial<Record<Cause, number>>;
  byHour: { ok: number; fail: number }[]; filesChangedPerDay: number | null; runsPerDay: number; rec: Rec | null;
};

export const CAUSE_TH: Record<Cause, string> = { "429": "ถูกจำกัดการเรียก (429)", "403": "ถูกปฏิเสธ (403)", timeout: "หมดเวลา", partial: "ไฟล์ไม่ครบ/ว่าง", other: "อื่น ๆ" };

export function causeOf(err: string | null): Cause {
  const e = err ?? "";
  if (/(^|\D)429(\D|$)/.test(e)) return "429";
  if (/(^|\D)403(\D|$)|บล็อก|ปฏิเสธ/.test(e)) return "403";
  if (/หมดเวลา|timeout|abort/i.test(e)) return "timeout";
  if (/ไม่ครบ|ไฟล์ว่าง|ใช้ค่ารอบก่อน|ไม่พบ/.test(e)) return "partial";
  return "other";
}

const bkkHour = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3).getUTCHours();

/** cfg = current admin config (if any); changes = distinct raw-file versions per day for this source. */
export function analyse(source: string, runs: RunH[], days: number, changesPerDay: number | null, cfg?: { schedule: string; fetch_mode: string; retry_delay_min: number | null } | null): Perf {
  const byHour = Array.from({ length: 24 }, () => ({ ok: 0, fail: 0 }));
  const causes: Partial<Record<Cause, number>> = {};
  let ok = 0;
  for (const r of runs) {
    const h = byHour[bkkHour(r.ran_at)]!;
    if (r.ok) { ok++; h.ok++; } else { h.fail++; const c = causeOf(r.error); causes[c] = (causes[c] ?? 0) + 1; }
  }
  const fail = runs.length - ok;
  const rate = runs.length ? ok / runs.length : 0;
  const runsPerDay = runs.length / Math.max(1, days);
  const rec: Rec = { reasons: [] };
  if (runs.length >= 5) {
    const blocked = (causes["403"] ?? 0) + (causes["429"] ?? 0);
    const mode = cfg?.fetch_mode ?? "default";
    if (blocked / runs.length >= 0.3 && mode !== "firecrawl" && mode !== "auto") {
      rec.fetch_mode = "auto";
      rec.reasons.push(`ถูกบล็อก/จำกัด ${blocked} จาก ${runs.length} รอบ — ลองดึงตรงก่อนแล้วสลับไป Firecrawl`);
    }
    if ((causes["429"] ?? 0) >= 3 && (cfg?.retry_delay_min ?? 0) < 30) {
      rec.retry_delay_min = 30;
      rec.reasons.push(`ถูกจำกัดการเรียก ${causes["429"]} ครั้ง — รอนานขึ้นก่อนลองใหม่ (30 นาที)`);
    }
    if ((causes.partial ?? 0) >= 3 && (cfg?.retry_delay_min ?? 0) < 10) {
      rec.retry_delay_min = Math.max(rec.retry_delay_min ?? 0, 10);
      rec.max_attempts = 4;
      rec.reasons.push(`ไฟล์ไม่ครบ ${causes.partial} ครั้ง — ต้นทางกำลังเขียนไฟล์ ให้รอ 10 นาทีและลอง 4 ครั้ง`);
    }
    // Fetching far more often than the file changes → once a day at the most reliable hour.
    if (changesPerDay !== null && changesPerDay <= 1.2 && runsPerDay >= 4 && cfg?.schedule !== "daily") {
      const best = byHour.map((h, i) => ({ i, score: h.ok - 2 * h.fail, n: h.ok + h.fail })).filter((h) => h.n > 0 && h.i <= 5).sort((a, b) => b.score - a.score)[0];
      rec.schedule = "daily";
      rec.daily_hour = best?.i ?? 5;
      rec.reasons.push(`ไฟล์เปลี่ยนเฉลี่ย ${changesPerDay.toFixed(1)} ครั้ง/วัน แต่ดึง ${runsPerDay.toFixed(0)} รอบ/วัน — ดึงวันละครั้งตอน ${String(rec.daily_hour).padStart(2, "0")}:00 น. (ก่อนตัดสรุป 05:45)`);
    }
    // Failures concentrated in a few hours while others succeed.
    const badHours = byHour.map((h, i) => ({ i, ...h })).filter((h) => h.fail >= 3 && h.fail > h.ok);
    if (badHours.length && badHours.length <= 4 && fail >= 4 && !rec.retry_delay_min) {
      rec.retry_delay_min = 20;
      rec.reasons.push(`ล้มเหลวบ่อยช่วง ${badHours.map((h) => `${String(h.i).padStart(2, "0")}:00`).join(", ")} น. — เว้นระยะลองใหม่ 20 นาทีให้พ้นช่วงนั้น`);
    }
  }
  return { source, runs: runs.length, ok, rate, causes, byHour, filesChangedPerDay: changesPerDay, runsPerDay, rec: rec.reasons.length ? rec : null };
}
