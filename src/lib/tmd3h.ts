// Pure parser for TMD Weather3Hours V2 XML (https://data.tmd.go.th/api/Weather3Hours/V2/).
// Only the station named BANGKOK METROPOLIS in province กรุงเทพมหานคร is used.
export const TMD3H_URL = "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345";

const tag = (b: string, t: string) => b.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1]?.trim() ?? "";
const num = (s: string) => { const n = Number(s); return s !== "" && Number.isFinite(n) ? n : undefined; };

export type Bkk3h = { time: string | null; temp?: number; maxTemp?: number; rain24?: number; stationFound: boolean; stations: number };

export function parseTmd3h(xml: string): Bkk3h {
  const blocks = xml.split(/<Station>/).slice(1).map((b) => b.split("</Station>")[0] ?? "");
  const b = blocks.find((x) => tag(x, "StationNameEnglish").toUpperCase() === "BANGKOK METROPOLIS" && tag(x, "Province").includes("กรุงเทพมหานคร"));
  if (!b) return { time: null, stationFound: false, stations: blocks.length };
  return {
    time: tag(b, "DateTime") || null,
    temp: num(tag(b, "AirTemperature")),
    maxTemp: num(tag(b, "MaxTemperature")),
    rain24: num(tag(b, "Rainfall24Hr")) ?? num(tag(b, "Rainfall")),
    stationFound: true,
    stations: blocks.length,
  };
}
