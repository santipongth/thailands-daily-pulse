import { describe, expect, it } from "vitest";
import { analyse, causeOf, type RunH } from "./perf";

const run = (h: number, ok: boolean, error: string | null = null, day = 1): RunH => ({ source: "s", ok, error, ran_at: new Date(Date.UTC(2026, 9, day, h - 7 < 0 ? h + 17 : h - 7)).toISOString() });

describe("perf", () => {
  it("classifies causes", () => {
    expect(causeOf("429 https://x")).toBe("429");
    expect(causeOf("Firecrawl ตอบ 403")).toBe("403");
    expect(causeOf("หมดเวลารอ 120 วินาที")).toBe("timeout");
    expect(causeOf("กรมอุตุฯ ส่งไฟล์ไม่ครบ")).toBe("partial");
  });
  it("recommends auto mode when often blocked", () => {
    const runs = [...Array(4)].map((_, i) => run(i, false, "403 x")).concat([...Array(4)].map((_, i) => run(i + 6, true)));
    const p = analyse("s", runs, 1, null, null);
    expect(p.rec?.fetch_mode).toBe("auto");
    expect(p.rate).toBe(0.5);
  });
  it("recommends daily when file rarely changes", () => {
    const runs = [...Array(24)].map((_, h) => run(h, true));
    const p = analyse("s", runs, 1, 1, null);
    expect(p.rec?.schedule).toBe("daily");
    expect(p.rec?.daily_hour).toBeLessThanOrEqual(5);
  });
  it("no recommendation for a healthy source", () => {
    const runs = [...Array(8)].map((_, h) => run(h * 3, true));
    expect(analyse("s", runs, 1, 8, null).rec).toBeNull();
  });
});
