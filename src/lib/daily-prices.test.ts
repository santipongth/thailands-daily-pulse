import { describe, expect, it } from "vitest";
import { parseLpg, parseBangkokWage, thaiPriceDate, verifyWageNotice } from "./daily-prices";

describe("dated price sources", () => {
  it("uses the vendor date, not the EPPO page update date", () => {
    expect(() => parseLpg({ last_updated: "17 September 2026", data: { ptt: { lpg_ptt_15kg: "423", lpg_ptt_date: "2023-03-01" } } }, "2026-10-03")).toThrow(/เก่าเกิน/);
    expect(parseLpg({ data: { ptt: { lpg_ptt_15kg: "423", lpg_ptt_date: "2026-09-17" } } }, "2026-10-03")).toEqual({ price: 423, date: "2026-09-17" });
  });
  it("requires a Bangkok rate and effective date from an accessible notice", () => {
    expect(() => parseBangkokWage("<html>Incapsula incident_id=123</html>", "2026-10-03")).toThrow(/ปิดกั้น/);
    expect(parseBangkokWage("กรุงเทพมหานคร อัตราค่าจ้างขั้นต่ำ 400 บาท มีผลใช้ 1 กรกฎาคม 2568", "2026-10-03")).toEqual({ price: 400, date: "2025-07-01" });
    expect(parseBangkokWage("ประกาศคณะกรรมการค่าจ้าง เรื่องอัตราค่าจ้างขั้นต่ำ (ฉบับที่ 14) เพื่อให้มีผลบังคับใช้ตั้งแต่วันที่ 1 กรกฎาคม 2568 เป็นต้นไป สาระสำคัญ คือ การปรับอัตราค่าจ้างขั้นต่ำเป็นวันละ 400 บาท ใน 3 กลุ่ม ได้แก่ 1. กรุงเทพมหานคร ทุกประเภทกิจการ", "2026-10-03")).toEqual({ price: 400, date: "2025-07-01" });
    expect(() => parseBangkokWage("กรุงเทพมหานคร อัตราค่าจ้างขั้นต่ำ 400 บาท มีผลใช้ 1 มกราคม 2570", "2026-10-03")).toThrow();
    expect(() => verifyWageNotice("อัตราค่าจ้างขั้นต่ำ (ฉบับที่ 15)", "2025-07-01")).toThrow(/ประกาศ/);
    expect(() => verifyWageNotice("อัตราค่าจ้างขั้นต่ำ (ฉบับที่ 15) อัตราค่าจ้างขั้นต่ำ (ฉบับที่ 14)", "2025-07-01")).toThrow(/ประกาศ/);
    expect(() => verifyWageNotice("Incapsula", "2025-07-01")).toThrow(/ปิดกั้น/);
    expect(verifyWageNotice("ตามประกาศคณะกรรมการค่าจ้าง เรื่อง อัตราค่าจ้างขั้นต่ำ (ฉบับที่ 14) ซึ่งได้ประกาศให้มีผลใช้บังคับ ตั้งแต่วันที่ 1 กรกฎาคม 2568", "2025-07-01")).toBeUndefined();
  });
  it("converts the oil announcement's Buddhist year", () => {
    expect(thaiPriceDate("4 ตุลาคม 2569")).toBe("2026-10-04");
    expect(() => thaiPriceDate("no date")).toThrow();
  });
});
import { readFileSync } from "node:fs";
import { parseLpgAiResult } from "./daily-prices";
describe("AI-read EPPO LPG page", () => {
  const page = readFileSync(new URL("./__fixtures__/eppo-lpg.md", import.meta.url), "utf8");
  const ok = { price_15kg: 423, effective_date: "2023-03-01", as_of_date: "2026-10-04", price_quote: "- 15 กก. (kg.) | 423", date_quote: "1 Mar 2023" };
  it("accepts quotes that are on the page", () => {
    expect(parseLpgAiResult(ok, page, "2026-10-04")).toEqual({ price: 423, effective: "2023-03-01", asOf: "2026-10-04" });
  });
  it("rejects invented quotes, wrong dates and out-of-range prices", () => {
    expect(() => parseLpgAiResult({ ...ok, price_15kg: 410, price_quote: "- 15 กก. (kg.) | 410" }, page, "2026-10-04")).toThrow(/ไม่พบ/);
    expect(() => parseLpgAiResult({ ...ok, effective_date: "2026-09-17", date_quote: "1 Mar 2023" }, page, "2026-10-04")).toThrow(/วันที่มีผล/);
    expect(() => parseLpgAiResult({ ...ok, price_15kg: 42 }, page, "2026-10-04")).toThrow(/นอกช่วง/);
  });
  it("falls back to today when the page date is missing", () => {
    expect(parseLpgAiResult({ ...ok, effective_date: null, as_of_date: null }, page, "2026-10-04").asOf).toBe("2026-10-04");
  });
});
