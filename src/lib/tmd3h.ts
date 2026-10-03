// Pure parser for TMD Weather3Hours V2 XML (https://data.tmd.go.th/api/Weather3Hours/V2/).
// Only station 48455 BANGKOK METROPOLIS (กรุงเทพมหานคร) is used. Thai text in the file is written
// as numeric character references (&#xE01;…) so everything is decoded before matching.
export const TMD3H_URL = "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345";

export const decodeXml = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

const tag = (b: string, t: string) => decodeXml(b.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1]?.trim() ?? "");
const num = (s: string) => { const n = Number(s); return s !== "" && Number.isFinite(n) ? n : undefined; };

export type Bkk3h = { time: string | null; date: string | null; temp?: number | undefined; rain24?: number | undefined; stationFound: boolean; stations: number };

export function parseTmd3h(xml: string): Bkk3h {
  const blocks = xml.split(/<Station>/).slice(1).map((b) => b.split("</Station>")[0] ?? "");
  const b = blocks.find((x) => tag(x, "WmoStationNumber") === "48455")
    ?? blocks.find((x) => tag(x, "StationNameEnglish").toUpperCase() === "BANGKOK METROPOLIS");
  if (!b) return { time: null, date: null, stationFound: false, stations: blocks.length };
  const time = tag(b, "DateTime") || null; // "MM/DD/YYYY HH:mm:ss", Bangkok local time
  const m = time?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return {
    time,
    date: m ? `${m[3]}-${m[1]}-${m[2]}` : null,
    temp: num(tag(b, "MaxTemperature")) ?? num(tag(b, "AirTemperature")),
    rain24: num(tag(b, "Rainfall24Hr")) ?? num(tag(b, "Rainfall")),
    stationFound: true,
    stations: blocks.length,
  };
}
