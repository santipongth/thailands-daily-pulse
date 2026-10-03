import { describe, expect, it } from "vitest";
import { parseLpg, parseBangkokWage, thaiPriceDate } from "./daily-prices";

describe("dated price sources", () => {
  it("uses the vendor date, not the EPPO page update date", () => {
    expect(() => parseLpg({ last_updated: "17 September 2026", data: { ptt: { lpg_ptt_15kg: "423", lpg_ptt_date: "2023-03-01" } } }, "2026-10-03")).toThrow(/เก่าเกิน/);
    expect(parseLpg({ data: { ptt: { lpg_ptt_15kg: "423", lpg_ptt_date: "2026-09-17" } } }, "2026-10-03")).toEqual({ price: 423, date: "2026-09-17" });
  });
  it("requires a Bangkok rate and effective date from an accessible notice", () => {
    expect(() => parseBangkokWage("<html>Incapsula incident_id=123</html>", "2026-10-03")).toThrow(/ปิดกั้น/);
    expect(parseBangkokWage("กรุงเทพมหานคร อัตราค่าจ้างขั้นต่ำ 400 บาท มีผลใช้ 1 กรกฎาคม 2568", "2026-10-03")).toEqual({ price: 400, date: "2025-07-01" });
  });
  it("converts the oil announcement's Buddhist year", () => {
    expect(thaiPriceDate("4 ตุลาคม 2569")).toBe("2026-10-04");
    expect(() => thaiPriceDate("no date")).toThrow();
  });
});