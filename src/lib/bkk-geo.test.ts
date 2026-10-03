import { describe, expect, it } from "vitest";
import { bmaGeoQueries, districtOf, tmdTime } from "./bkk-geo";

describe("bkk-geo", () => {
  it("reads the hour, not the seconds, from TMD times", () => {
    expect(tmdTime("10/03/2026 19:00:00")).toBe("19:00");
    expect(tmdTime("7:00")).toBe("07:00");
    expect(tmdTime(null)).toBeNull();
  });
  it("builds soi and landmark queries", () => {
    expect(bmaGeoQueries("ถ.รามอินทรา (ซ. 5)", "ถนนรามอินทรา")).toEqual(["ซอยรามอินทรา 5"]);
    expect(bmaGeoQueries("ถ.แจ้งวัฒนะ (ม.ราชภัฏพระนคร)", "ถนนแจ้งวัฒนะ")).toEqual(["ม.ราชภัฏพระนคร ถนนแจ้งวัฒนะ", "ม.ราชภัฏพระนคร"]);
    expect(bmaGeoQueries("ถนนไม่มีวงเล็บ", "")).toEqual([]);
  });
  it("extracts the district", () => {
    expect(districtOf("แขวงหิรัญรูจี เขตธนบุรี, กรุงเทพฯ")).toBe("ธนบุรี");
    expect(districtOf("ปทุมธานี")).toBeNull();
  });
});
