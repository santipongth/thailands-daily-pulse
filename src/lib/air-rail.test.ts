import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAir4Thai } from "./air4thai";
import { isDisruption } from "./rail";
import { parseXPosts } from "./fm91.server";

const fx = (f: string) => readFileSync(new URL(`./__fixtures__/${f}`, import.meta.url), "utf8");

describe("air4thai", () => {
  it("averages Bangkok stations only and names the highest", () => {
    const r = parseAir4Thai(JSON.parse(fx("air4thai.json")), "2026-10-03");
    expect(r.stations.length).toBe(6);
    expect(r.max).toBe(30.4);
    expect(r.top?.at).toMatch(/^2026-10-03T\d{2}:\d{2}:00\+07:00$/);
    expect(r.avg).toBeCloseTo((22.1 + 30.4 + 23.7 + 23.4 + 25.7 + 24.3) / 6, 1);
  });
  it("ignores other days", () => {
    expect(parseAir4Thai(JSON.parse(fx("air4thai.json")), "2026-10-01").stations.length).toBe(0);
  });
});

describe("rail", () => {
  it("parses BTS and MRT X posts including escaped dates", () => {
    expect(parseXPosts(fx("x-bts.md")).length).toBeGreaterThan(2);
    expect(parseXPosts(fx("x-mrt.md")).length).toBeGreaterThan(2);
  });
  it("keeps only disruption notices", () => {
    expect(isDisruption("ขออภัยในความไม่สะดวก ขบวนรถไฟฟ้าสายสุขุมวิทขัดข้อง")).toBe(true);
    expect(isDisruption("MRT สายสีน้ำเงิน เดินรถล่าช้า 10 นาที")).toBe(true);
    expect(isDisruption("บรรยากาศกิจกรรมเย็บเต้านมเทียม")).toBe(false);
  });
});
