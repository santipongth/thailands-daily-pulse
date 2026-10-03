import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { parseBmaFlood, parseDdpmAlerts, parseThaiWaterBkk } from "./flood";

const fx = (f: string) => readFileSync(new URL(`./__fixtures__/${f}`, import.meta.url), "utf8");

describe("flood parsers", () => {
  it("counts BMA flooded road sensors read today only", () => {
    const r = parseBmaFlood(fx("bma-flood.md"), "2026-10-03");
    expect(r.flooded).toBeGreaterThan(0);
    expect(r.names.every((n) => !n.endsWith("*"))).toBe(true);
    expect(parseBmaFlood(fx("bma-flood.md"), "2026-10-04").sensors).toBe(0);
  });
  it("finds DDPM flood warnings by date, skipping routine reports", () => {
    const r = parseDdpmAlerts(fx("ddpm.md"), "2026-10-03");
    expect(r.titles.some((t) => t.includes("น้ำทะเลหนุน"))).toBe(true);
    expect(r.titles.some((t) => t.startsWith("รายงานแจ้งข่าว"))).toBe(false);
  });
  it("ThaiWater: keeps Bangkok-area stations reported today, sorted by % of bank", () => {
    const st = (prov: string, pct: string, at: string) => ({ storage_percent: pct, waterlevel_msl: "1", waterlevel_datetime: at, geocode: { province_name: { th: prov } }, station: { tele_station_name: { th: "x" } } });
    const r = parseThaiWaterBkk({ waterlevel_data: { data: [st("กรุงเทพมหานคร", "95", "2026-10-03 20:00"), st("นนทบุรี", "101", "2026-10-03 20:00"), st("เชียงใหม่", "150", "2026-10-03 20:00"), st("กรุงเทพมหานคร", "120", "2026-09-30 10:00")] } }, "2026-10-03");
    expect(r.maxPct).toBe(101);
    expect(r.overBank).toBe(1);
    expect(r.stations.length).toBe(2);
  });
});
