// Pure parser for TMD WeatherForecast7Days V2 (valid certificate, unlike www.tmd.go.th).
// Returns today's forecast per province for Bangkok and its vicinity.
import { decodeXml } from "./tmd3h";

export const TMD7D_URL = "https://data.tmd.go.th/api/WeatherForecast7Days/V2/?uid=api&ukey=api12345";
export const BKK_VICINITY = ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "นครปฐม", "สมุทรสาคร"];

export type Day7 = { province: string; date: string; max?: number | undefined; min?: number | undefined; rainPct?: number | undefined; descTh: string };

const tag = (b: string, t: string) => decodeXml(b.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1]?.trim() ?? "");
const num = (s: string) => { const n = Number(s); return s !== "" && Number.isFinite(n) ? n : undefined; };

/** date = YYYY-MM-DD (Bangkok). */
export function parseTmd7d(xml: string, date: string): Day7[] {
  const [y, mo, d] = date.split("-");
  const want = `${d}/${mo}/${y}`;
  const out: Day7[] = [];
  for (const p of xml.split("<Province>").slice(1)) {
    const name = tag(p, "ProvinceNameThai");
    if (!BKK_VICINITY.includes(name)) continue;
    const days = p.split("<ForecastDate>").slice(1);
    const day = days.find((x) => x.startsWith(want));
    if (!day) continue;
    const b = "<ForecastDate>" + day;
    out.push({ province: name, date, max: num(tag(b, "MaximumTemperature")), min: num(tag(b, "MinimumTemperature")), rainPct: num(tag(b, "PercentRainCover")), descTh: tag(b, "DescriptionThai") });
  }
  return out.sort((a, b) => BKK_VICINITY.indexOf(a.province) - BKK_VICINITY.indexOf(b.province));
}
