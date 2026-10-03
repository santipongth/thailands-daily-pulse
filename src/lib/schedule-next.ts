// Browser-safe schedule helpers shared by the admin UI and the server queue (Bangkok time, UTC+7).
export type SchedCfg = { enabled: boolean; schedule: string; daily_hour: number | null; range_start?: number | null; range_end?: number | null; extra_hours?: number[]; custom_times?: string[] };

export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "5:10, 12:30" → ["05:10","12:30"] (valid, unique, sorted). */
export function parseTimes(s: string): string[] {
  const out = s.split(/[,\s]+/).filter(Boolean).map((t) => {
    const m = t.replace(".", ":").match(/^(\d{1,2}):?(\d{2})?$/);
    if (!m) return "";
    const v = `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
    return TIME_RE.test(v) ? v : "";
  }).filter(Boolean);
  return [...new Set(out)].sort();
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const inRange = (h: number, a: number, b: number) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

/** Most recent custom slot (epoch ms) at or before `now`, looking back up to 24h. */
export function lastCustomSlot(times: string[], now: number): number | null {
  const bkkMidnight = Math.floor((now + 7 * 3600e3) / 86400e3) * 86400e3 - 7 * 3600e3;
  let best: number | null = null;
  for (const day of [0, -1]) for (const t of times) {
    const at = bkkMidnight + day * 86400e3 + toMin(t) * 60e3;
    if (at <= now && (best === null || at > best)) best = at;
  }
  return best;
}

/** Approximate next automatic round (epoch ms), or null when only manual / built-in. */
export function nextRun(c: SchedCfg, now = Date.now()): number | null {
  if (!c.enabled || c.schedule === "manual" || c.schedule === "default") return null;
  const cands: number[] = [];
  const bkkHourStart = (k: number) => Math.floor(now / 3600e3) * 3600e3 + k * 3600e3;
  const bkkH = (ms: number) => new Date(ms + 7 * 3600e3).getUTCHours();
  if (c.schedule === "custom") {
    const bkkMidnight = Math.floor((now + 7 * 3600e3) / 86400e3) * 86400e3 - 7 * 3600e3;
    for (const day of [0, 1]) for (const t of c.custom_times ?? []) { const at = bkkMidnight + day * 86400e3 + toMin(t) * 60e3; if (at > now) cands.push(at); }
  } else {
    for (let k = 1; k <= 25; k++) {
      const at = bkkHourStart(k) + 5 * 60e3, h = bkkH(at);
      const ok = c.schedule === "hourly" || (c.schedule === "3h" && k % 3 === 0) || (c.schedule === "daily" && h === (c.daily_hour ?? 5))
        || (c.schedule === "hourly_range" && (inRange(h, c.range_start ?? 16, c.range_end ?? 8) || k % 3 === 0));
      if (ok) { cands.push(at); break; }
    }
  }
  for (let k = 1; k <= 24; k++) { const at = bkkHourStart(k) + 5 * 60e3; if ((c.extra_hours ?? []).includes(bkkH(at))) { cands.push(at); break; } }
  return cands.length ? Math.min(...cands) : null;
}
