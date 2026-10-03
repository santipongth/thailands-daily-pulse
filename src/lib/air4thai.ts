// Air4Thai (Pollution Control Department) hourly station feed → Bangkok PM2.5 average + highest station.
export const A4T_URL = "https://air4thai.pcd.go.th/services/getNewAQI_JSON.php";
export const A4T_ALT_URL = "https://air4thai.com/forweb/getAQI_JSON.php";

export type A4tStation = { id: string; name: string; area: string; pm25: number; aqi: number | null; at: string };

/** Bangkok stations (areaTH contains กรุงเทพ) with a valid PM2.5 reading on `date`. */
export function parseAir4Thai(d: any, date: string) {
  const st: A4tStation[] = (d?.stations ?? [])
    .filter((x: any) => /กรุงเทพ/.test(String(x?.areaTH ?? "")) && x?.AQILast?.date === date)
    .map((x: any) => ({
      id: String(x.stationID), name: String(x.nameTH ?? x.stationID), area: String(x.areaTH ?? "").split(",")[0]!.trim(),
      pm25: Number(x.AQILast?.PM25?.value), aqi: Number(x.AQILast?.PM25?.aqi) > 0 ? Number(x.AQILast.PM25.aqi) : null,
      at: `${x.AQILast.date}T${String(x.AQILast.time ?? "00:00").padStart(5, "0")}:00+07:00`,
    }))
    .filter((x: A4tStation) => Number.isFinite(x.pm25) && x.pm25 >= 0);
  st.sort((a, b) => b.pm25 - a.pm25);
  const avg = st.length ? Math.round((st.reduce((s, x) => s + x.pm25, 0) / st.length) * 10) / 10 : undefined;
  return { stations: st, avg, max: st[0]?.pm25, top: st[0], latest: st.map((x) => x.at).sort().at(-1) };
}
