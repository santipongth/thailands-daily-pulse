import { BASKET } from "./impact";

export const GROUP: Record<string, "fuel" | "food" | "gas" | "power"> = { gsh95: "fuel", diesel: "fuel", e20: "fuel", lpg: "gas", elec_unit: "power" };
export const groupOf = (m: string) => GROUP[m] ?? "food";
export const GROUP_TH = { fuel: "น้ำมัน", food: "เนื้อสัตว์และอาหาร", gas: "ก๊าซ", power: "ค่าไฟฟ้า" } as const;

type Obs = { metric_id: string; observed_on: string; value: number };
export type TrendDay = { date: string; total: number; fuel: number; food: number; gas: number; power: number; complete: boolean };
export type TrendItem = { metric_id: string; label: string; start: number | null; end: number | null; deltaDay: number | null };

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400e3).toISOString().slice(0, 10);

/** Daily basket cost from real prices; days without a new price carry the last known price forward. */
export function costTrend(obs: Obs[], end: string, days: number) {
  const start = addDays(end, -(days - 1));
  const by = new Map<string, Obs[]>();
  for (const o of [...obs].sort((a, b) => a.observed_on.localeCompare(b.observed_on))) {
    if (!by.has(o.metric_id)) by.set(o.metric_id, []);
    by.get(o.metric_id)!.push(o);
  }
  const priceOn = (m: string, d: string) => { let v: number | null = null; for (const o of by.get(m) ?? []) { if (o.observed_on <= d) v = Number(o.value); else break; } return v; };
  const series: TrendDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const row: TrendDay = { date: d, total: 0, fuel: 0, food: 0, gas: 0, power: 0, complete: true };
    for (const b of BASKET) {
      const p = priceOn(b.metric_id, d);
      if (p == null) { row.complete = false; continue; }
      const c = p * b.qty; row.total += c; row[groupOf(b.metric_id)] += c;
    }
    series.push(row);
  }
  const items: TrendItem[] = BASKET.map((b) => {
    const s = priceOn(b.metric_id, start), e = priceOn(b.metric_id, end);
    return { metric_id: b.metric_id, label: b.label, start: s, end: e, deltaDay: s == null || e == null ? null : (e - s) * b.qty };
  }).sort((a, b) => Math.abs(b.deltaDay ?? 0) - Math.abs(a.deltaDay ?? 0));
  const comparable = items.filter((i) => i.deltaDay != null);
  const net = comparable.reduce((s, i) => s + i.deltaDay!, 0);
  return { start, series, items, netDay: net, netMonth: net * 30, partial: items.some((i) => i.deltaDay == null) };
}

export type PeriodStats = { avg: number | null; min: number | null; max: number | null; days: number };
/** Stats over real readings only (no carry-forward) with observed_on in [from, to]. */
export function periodStats(obs: { observed_on: string; value: number }[], from: string, to: string): PeriodStats {
  const v = obs.filter((o) => o.observed_on >= from && o.observed_on <= to).map((o) => Number(o.value));
  if (!v.length) return { avg: null, min: null, max: null, days: 0 };
  return { avg: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v), days: v.length };
}
export const shiftDays = addDays;
export const pctChange = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : ((a - b) / b) * 100);

export type WeeklyMetric = { id: string; threshold_pct: number | null; lag_days: number; expected_days: number; trust: string };
export type WeeklyCalc = {
  priceDate: string | null; lagDays: number; curAvg: number | null; prevAvg: number | null; daysCur: number; daysPrev: number;
  pct: number | null; coverage: number; trustMul: number; effective: number | null; ratio: number | null;
  severity: "high" | "medium" | "low" | null; reason: string;
};
/** Mirrors the SQL weekly rule in detect_core: latest price within the metric's arrival lag, 7d vs prior 7d,
 *  ≥3 real days each, threshold × trust (medium 1.5) × coverage sqrt(expected / days). `threshold` overrides (reader's own). */
export function weeklyCalc(obs: { observed_on: string; value: number }[], m: WeeklyMetric, date: string, threshold?: number): WeeklyCalc {
  const lag = Math.max(m.lag_days, 1);
  const th = threshold ?? m.threshold_pct;
  const trustMul = m.trust === "medium" ? 1.5 : 1;
  const latest = [...obs].filter((o) => o.observed_on <= date && o.observed_on >= addDays(date, -lag)).sort((a, b) => b.observed_on.localeCompare(a.observed_on))[0];
  const base = { lagDays: lag, trustMul, coverage: 1, effective: null, ratio: null, severity: null, pct: null, curAvg: null, prevAvg: null, daysCur: 0, daysPrev: 0 };
  if (!latest) return { ...base, priceDate: null, reason: `ไม่มีราคาภายใน ${lag} วัน (ช่วงที่แหล่งนี้มักส่งข้อมูลช้า)` };
  const d = latest.observed_on;
  const c = periodStats(obs, addDays(d, -6), d), p = periodStats(obs, addDays(d, -13), addDays(d, -7));
  const r0 = { ...base, priceDate: d, curAvg: c.avg, prevAvg: p.avg, daysCur: c.days, daysPrev: p.days };
  if (c.days < 3 || p.days < 3 || !p.avg) return { ...r0, reason: `ข้อมูลไม่พอ (ต้องมีอย่างน้อย 3 วันต่อสัปดาห์: ${c.days}/${p.days})` };
  const pct = ((c.avg! - p.avg) / Math.abs(p.avg)) * 100;
  const coverage = Math.max(1, Math.sqrt(m.expected_days / Math.min(c.days, p.days)));
  if (th == null) return { ...r0, pct, coverage, reason: "ไม่มีเกณฑ์ (ใช้เปรียบเทียบเท่านั้น)" };
  const effective = th * coverage * trustMul;
  const ratio = Math.abs(pct) / effective;
  const severity = ratio >= 3 ? "high" : ratio >= 1.5 ? "medium" : ratio >= 1 ? "low" : null;
  return { ...r0, pct, coverage, effective, ratio, severity, reason: severity ? `เปลี่ยน ${Math.abs(pct).toFixed(1)}% ≥ เกณฑ์จริง ${effective.toFixed(2)}%` : `เปลี่ยน ${Math.abs(pct).toFixed(1)}% < เกณฑ์จริง ${effective.toFixed(2)}%` };
}

export type Block = { from: string; to: string; avg: number | null; days: number; pct: number | null; crosses: boolean };
/** Consecutive blocks of `size` days ending at `end` (oldest first); pct vs the previous block, real readings only. */
export function blocks(obs: { observed_on: string; value: number }[], end: string, size: number, count: number, threshold: number | null): Block[] {
  const out: Block[] = [];
  for (let i = count; i >= 0; i--) {
    const to = addDays(end, -i * size), from = addDays(to, -(size - 1));
    const s = periodStats(obs, from, to);
    const prev = out.at(-1);
    const pct = prev && prev.avg && s.avg != null && prev.days >= 3 && s.days >= 3 ? ((s.avg - prev.avg) / Math.abs(prev.avg)) * 100 : null;
    out.push({ from, to, avg: s.avg, days: s.days, pct, crosses: pct != null && threshold != null && Math.abs(pct) >= threshold });
  }
  return out.slice(1);
}
