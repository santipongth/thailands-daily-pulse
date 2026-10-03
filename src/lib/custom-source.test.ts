import { describe, expect, it } from "vitest";
import { extractCustom, getPath, previewRule, toDate, toNumber } from "./custom-source";

describe("custom-source parsers", () => {
  it("numbers and dates", () => {
    expect(toNumber("1,234.50 บาท")).toBe(1234.5);
    expect(toNumber("ไม่มี")).toBeNull();
    expect(toDate("2026-10-04T05:00:00Z")).toBe("2026-10-04");
    expect(toDate("04/10/2569")).toBe("2026-10-04");
    expect(toDate("ณ วันที่ 4 ต.ค. 2569")).toBe("2026-10-04");
    expect(toDate("1 มีนาคม 2566")).toBe("2023-03-01");
  });
  it("json path incl. last index", () => {
    expect(getPath({ a: { b: [{ p: 1 }, { p: 2 }] } }, "a.b[-1].p")).toBe(2);
    const r = extractCustom('{"data":{"price":"42.10","asof":"2026-10-03"}}', { format: "json", value_path: "data.price", date_path: "data.asof" });
    expect(r).toMatchObject({ value: 42.1, date: "2026-10-03" });
  });
  it("csv with row match and quotes", () => {
    const csv = 'item,price,date\n"Pork, lean",150,2026-10-01\nEgg,4.2,2026-10-02\n"Pork, lean",155,2026-10-03\n';
    expect(extractCustom(csv, { format: "csv", value_path: "price", date_path: "date", row_match: "item=Pork, lean" })).toMatchObject({ value: 155, date: "2026-10-03" });
    expect(() => extractCustom(csv, { format: "csv", value_path: "nope" })).toThrow(/คอลัมน์/);
  });
  it("text regex on html", () => {
    const html = "<div>ราคาวันนี้ <b>32.94</b> บาท/ลิตร</div><p>มีผล 4 ต.ค. 2569</p>";
    expect(extractCustom(html, { format: "text", value_path: "ราคาวันนี้\\s*([\\d.,]+)", date_path: "มีผล\\s*(.+?2569)" })).toMatchObject({ value: 32.94, date: "2026-10-04" });
    expect(() => extractCustom(html, { format: "text", value_path: "ไม่มีคำนี้ (\\d+)" })).toThrow();
  });
  it("preview rule", () => {
    const rows = [{ observed_on: "2026-10-01", value: 100 }, { observed_on: "2026-10-02", value: 101 }, { observed_on: "2026-10-03", value: 110 }];
    expect(previewRule(rows, { kind: "delta", threshold_pct: 5 }).map((x) => x.date)).toEqual(["2026-10-03"]);
    expect(previewRule(rows, { kind: "level", bands: [105] })).toHaveLength(1);
  });
});
