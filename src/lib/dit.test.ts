import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ditFormDate, parseDit } from "./dit";

describe("parseDit", () => {
  it("reads unit and daily rows from the DIT report", () => {
    const r = parseDit(readFileSync(new URL("./__fixtures__/dit-pork.html", import.meta.url), "utf8"));
    expect(r.unit).toBe("บาท/กก.");
    expect(r.rows[0]).toEqual({ date: "2026-09-01", min: 170, max: 180, avg: 175 });
    expect(r.rows.length).toBeGreaterThan(15);
  });
  it("formats Buddhist-era form dates", () => expect(ditFormDate("2026-10-03")).toBe("03/10/2569"));
});
