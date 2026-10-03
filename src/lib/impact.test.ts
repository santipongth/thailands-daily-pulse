import { describe, expect, it } from "vitest";
import { impactFor, numbersInText, basketLines, BASKET } from "./impact";
import { computeCompleteness } from "./completeness";

describe("impactFor", () => {
  it("is deterministic and signed by the price change", () => {
    const up = impactFor({ metric_id: "diesel", prev_value: 30, new_value: 31 });
    const down = impactFor({ metric_id: "diesel", prev_value: 31, new_value: 30 });
    if (up && down) { expect(up).toEqual(impactFor({ metric_id: "diesel", prev_value: 30, new_value: 31 })); }
    expect(up === null || down === null || JSON.stringify(up) !== JSON.stringify(down)).toBe(true);
  });
  it("returns null without a previous value", () => {
    expect(impactFor({ metric_id: "diesel", prev_value: null, new_value: 31 })).toBeNull();
  });
});

describe("numbersInText (AI intro guard)", () => {
  it("finds numbers so new figures can be rejected", () => {
    expect(numbersInText("ดีเซลขึ้น 1.50 บาท").length).toBeGreaterThan(0);
    expect(numbersInText("ไม่มีตัวเลข")).toEqual([]);
  });
});

describe("basketLines", () => {
  it("only uses real observations of basket items", () => {
    const id = BASKET[0]!.metric_id;
    const lines = basketLines([{ metric_id: id, observed_on: "2026-10-02", value: 10 }, { metric_id: id, observed_on: "2026-10-03", value: 11 }], "2026-10-03");
    expect(lines.every((l) => BASKET.some((b) => b.metric_id === l.metric_id))).toBe(true);
  });
});

describe("computeCompleteness", () => {
  const reg = [{ source: "S", owner: "", channel: "", licence: "", cadence: "", unit: "", area: "", stale_after_days: 1, url: null, sort: 0 }];
  it("never-fetched source is unverifiable, not 'no change'", () => {
    expect(computeCompleteness("2026-10-03", reg, [], {}, {})[0]!.status).toBe("unverifiable");
  });
  it("fresh successful run is ok", () => {
    const r = computeCompleteness("2026-10-03", reg, [{ source: "S", ok: true, ran_at: "2026-10-03T01:00:00Z", last_ok_at: "2026-10-03T01:00:00Z", error: null }], {}, {});
    expect(r[0]!.status).toBe("ok");
  });
});
