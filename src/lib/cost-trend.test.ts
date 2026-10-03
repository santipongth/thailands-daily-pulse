import { describe, expect, it } from "vitest";
import { costTrend } from "./cost-trend";

describe("costTrend", () => {
  it("carries prices forward and computes net change", () => {
    const obs = [
      { metric_id: "pork", observed_on: "2026-10-01", value: 100 },
      { metric_id: "pork", observed_on: "2026-10-03", value: 110 },
    ];
    const r = costTrend(obs, "2026-10-03", 3);
    expect(r.series.map((d) => +d.food.toFixed(2))).toEqual([18, 18, 19.8]);
    expect(+r.netDay.toFixed(2)).toBe(1.8);
    expect(r.partial).toBe(true);
    expect(r.series[0]!.complete).toBe(false);
  });
});

import { periodStats, pctChange } from "./cost-trend";
describe("periodStats", () => {
  it("uses only real readings in range", () => {
    const s = periodStats([{ observed_on: "2026-10-01", value: 10 }, { observed_on: "2026-10-03", value: 20 }, { observed_on: "2026-09-01", value: 99 }], "2026-09-28", "2026-10-04");
    expect(s).toEqual({ avg: 15, min: 10, max: 20, days: 2 });
    expect(pctChange(110, 100)).toBeCloseTo(10);
  });
});

import { weeklyCalc, blocks } from "./cost-trend";
describe("weeklyCalc", () => {
  const obs = ["01","02","03","06","07","08","09","10"].map((d, i) => ({ observed_on: `2026-10-${d}`, value: i < 3 ? 100 : 110 }));
  it("applies lag, coverage and trust like SQL", () => {
    const r = weeklyCalc(obs, { id: "x", threshold_pct: 3, lag_days: 4, expected_days: 5, trust: "medium" }, "2026-10-12");
    expect(r.priceDate).toBe("2026-10-10");
    expect(r.daysPrev).toBe(3);
    expect(r.coverage).toBeCloseTo(Math.sqrt(5 / 3), 5);
    expect(r.severity).not.toBeNull();
  });
  it("reports missing data within lag", () => {
    expect(weeklyCalc(obs, { id: "x", threshold_pct: 3, lag_days: 1, expected_days: 5, trust: "high" }, "2026-10-20").priceDate).toBeNull();
  });
  it("builds blocks", () => {
    expect(blocks(obs, "2026-10-10", 7, 2, 5).length).toBe(2);
  });
});
