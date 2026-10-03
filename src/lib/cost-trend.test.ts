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
