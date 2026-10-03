import { describe, expect, it } from "vitest";
import { billFor, latestTariffDoc, parseFt } from "./electricity";

describe("electricity", () => {
  it("parses the PEA Ft line", () => {
    const r = parseFt("<p>ค่า Ft ประจำเดือนกันยายน – ธันวาคม 2569 หน่วยละ 0.1623 บาท</p>");
    expect(r).toEqual({ ft: 0.1623, from: "2026-09-01", to: "2026-12-31", label: "กันยายน–ธันวาคม 2569" });
  });
  it("computes a 200-unit bill from the official tariff", () => {
    const b = billFor(200, 0.1623);
    // 200×3.0 + 200×0.1623 + 24.62 = 657.08; +7% VAT = 703.0756
    expect(b.total).toBeCloseTo(703.0756, 3);
    expect(b.perUnit).toBeCloseTo(3.5154, 3);
  });
  it("finds the newest tariff document", () => {
    expect(latestTariffDoc('a href="/x/Electricity_Tariff_MAY_2023.pdf" "/y/Electricity_Tariff_SEP_2026_3.pdf"')).toBe("Electricity_Tariff_SEP_2026_3.pdf");
  });
});
