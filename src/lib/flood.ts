// Pure parsers for flood / local-water sources (unit-tested in flood.test.ts).

export const TW_WL_URL = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load";
export const BMA_FLOOD_URL = "https://weather.bangkok.go.th/flood/";
export const BMA_WATER_URL = "https://weather.bangkok.go.th/water/";
export const DDPM_ALERT_URL = "https://www.disaster.go.th/contents/disaster_alert_report";

const BKK_AREA = ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ"];

/** ThaiWater telemetry stations in Bangkok + 3 neighbours reporting on `date` (Bangkok). */
export function parseThaiWaterBkk(d: any, date: string) {
  const rows: any[] = d?.waterlevel_data?.data ?? [];
  const st = rows.filter((x) => BKK_AREA.includes(x?.geocode?.province_name?.th) && String(x?.waterlevel_datetime ?? "").startsWith(date) && x?.storage_percent != null)
    .map((x) => ({ name: String(x.station?.tele_station_name?.th ?? ""), province: String(x.geocode.province_name.th), pct: Number(x.storage_percent), msl: Number(x.waterlevel_msl), at: String(x.waterlevel_datetime) }))
    .filter((x) => Number.isFinite(x.pct));
  st.sort((a, b) => b.pct - a.pct);
  return { stations: st, maxPct: st[0]?.pct, overBank: st.filter((x) => x.pct >= 100).length, top: st[0] };
}

const beDate = (s: string) => { const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${Number(m[3]) - 543}-${m[2]}-${m[1]}` : null; };
const tableRows = (md: string, prefix: string) => md.split("\n").filter((l) => l.startsWith(`| ${prefix}`)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

/** BMA road-flood sensors: rows | code | road | station | dd/mm/BBBB hh:mm | level | status |. Counts flooded sensors read on `date`. */
export function parseBmaFlood(md: string, date: string) {
  const rows = tableRows(md, "FL.").filter((r) => beDate(r[3] ?? "") === date);
  const flooded = rows.filter((r) => (r[5] ?? "").startsWith("น้ำท่วม"));
  return { sensors: rows.length, flooded: flooded.length, names: flooded.map((r) => r[2]!.replace(/\s*\\?\*$/, "")) };
}

/** BMA canal level stations: status column (index 4) = ปกติ / เตือนภัย / วิกฤต. */
export function parseBmaWater(md: string, date: string) {
  const rows = tableRows(md, "WL.").filter((r) => beDate(r[3] ?? "") === date);
  return { stations: rows.length, critical: rows.filter((r) => r[4] === "วิกฤต").length, warning: rows.filter((r) => r[4] === "เตือนภัย").length };
}

const TH_MON: Record<string, string> = { "ม.ค.": "01", "ก.พ.": "02", "มี.ค.": "03", "เม.ย.": "04", "พ.ค.": "05", "มิ.ย.": "06", "ก.ค.": "07", "ส.ค.": "08", "ก.ย.": "09", "ต.ค.": "10", "พ.ย.": "11", "ธ.ค.": "12" };
const FLOOD_RE = /น้ำท่วม|น้ำป่า|น้ำหลาก|น้ำทะเลหนุน|ฝนตกหนัก|ระดับน้ำ/;

/** DDPM alert list: specific flood warnings dated `date` (routine twice-daily reports excluded). */
export function parseDdpmAlerts(md: string, date: string) {
  const items = md.split("](").slice(0, -1).map((chunk) => {
    const title = (chunk.split("\\\n")[1] ?? chunk.split("\n")[1] ?? "").replace(/\\$/, "").trim();
    const dm = chunk.match(/(\d{1,2}) ([ก-๙]+\.[ก-๙]+\.) (\d{4})\s*$/);
    const d = dm && TH_MON[dm[2]!] ? `${Number(dm[3]) - 543}-${TH_MON[dm[2]!]}-${dm[1]!.padStart(2, "0")}` : null;
    return { title, date: d };
  }).filter((x) => x.title && x.date);
  const today = items.filter((x) => x.date === date && FLOOD_RE.test(x.title) && !/^รายงานแจ้งข่าวแจ้งเตือนสาธารณภัย ประจำวัน/.test(x.title));
  return { listed: items.length, warnings: today.length, titles: today.map((x) => x.title), bkk: today.some((x) => /กรุงเทพ/.test(x.title)) };
}
