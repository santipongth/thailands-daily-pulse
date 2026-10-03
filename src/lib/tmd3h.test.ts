import { describe, expect, it } from "vitest";
import { parseTmd3h } from "./tmd3h";

const st = (id: string) => `<Station><WmoStationNumber>${id}</WmoStationNumber><StationNameEnglish>S${id}</StationNameEnglish><Observation><DateTime>10/03/2026 19:00:00</DateTime><AirTemperature>29.5</AirTemperature><Rainfall24Hr>1.2</Rainfall24Hr></Observation></Station>`;

describe("parseTmd3h", () => {
  it("empty file → not found, incomplete", () => {
    const r = parseTmd3h("<Weather3Hours><Stations></Stations></Weather3Hours>");
    expect(r).toMatchObject({ stationFound: false, stations: 0, complete: false });
  });
  it("partial file without Bangkok uses nearest substitute", () => {
    const r = parseTmd3h(st("48325") + st("48453"));
    expect(r).toMatchObject({ stationFound: true, stationId: "48453", complete: false, rain24: 1.2 });
  });
  it("full file picks 48455", () => {
    const r = parseTmd3h(Array.from({ length: 120 }, (_, i) => st(String(48000 + i))).join("") + st("48454") + st("48455"));
    expect(r).toMatchObject({ stationId: "48455", complete: true, date: "2026-10-03" });
  });
});
