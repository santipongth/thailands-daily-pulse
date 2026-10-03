import { BASKET } from "./impact";

export const GROUP: Record<string, "fuel" | "food" | "gas"> = { gsh95: "fuel", diesel: "fuel", e20: "fuel", lpg: "gas" };
export const groupOf = (m: string) => GROUP[m] ?? "food";
export const GROUP_TH = { fuel: "น้ำมัน", food: "เนื้อสัตว์และอาหาร", gas: "ก๊าซ" } as const;

type Obs = { metric_id: string; observed_on: string; value: number };
export type TrendDay = { date: string; total: number; fuel: number; food: number; gas: number; complete: boolean };
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
    const row: TrendDay = { date: d, total: 0, fuel: 0, food: 0, gas: 0, complete: true };
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
