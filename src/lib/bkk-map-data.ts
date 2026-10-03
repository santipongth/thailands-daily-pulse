// Data for the interactive Bangkok map (/data-all): latest batch per layer + colour bands. Browser-safe (no Leaflet).
import { supabase } from "@/integrations/supabase/client";

export type LayerId = "weather" | "pm25" | "water" | "road" | "rail";
export type Pt = {
  key: string; layer: LayerId; name: string; area: string | null; value: number | null; unit: string; label: string;
  status: string | null; at: string | null; lat: number | null; lng: number | null; band: 1 | 2 | 3 | 4 | 5; severity: number;
  agency: string; url: string;
};

export const LAYERS: { id: LayerId; label: string; agency: string; url: string }[] = [
  { id: "pm25", label: "PM2.5", agency: "กรมควบคุมมลพิษ (Air4Thai)", url: "https://air4thai.pcd.go.th/" },
  { id: "water", label: "ระดับน้ำ", agency: "สสน. (ThaiWater)", url: "https://www.thaiwater.net/" },
  { id: "road", label: "น้ำท่วมถนน", agency: "กทม. สำนักการระบายน้ำ", url: "https://weather.bangkok.go.th/flood/" },
  { id: "weather", label: "อากาศ", agency: "กรมอุตุนิยมวิทยา", url: "https://www.tmd.go.th/" },
  { id: "rail", label: "รถไฟฟ้า", agency: "BTS / MRT (X)", url: "https://x.com/BTS_SkyTrain" },
];

const SRC: Record<string, LayerId> = {
  "Air4Thai PM2.5 (กรมควบคุมมลพิษ)": "pm25", "ThaiWater สถานี กทม.และปริมณฑล": "water", "กทม. ระบายน้ำ (น้ำท่วมถนน)": "road",
};
// TMD 3-hour stations near Bangkok (fixed coordinates).
export const TMD_POS: Record<string, [number, number]> = {
  "48455": [13.727, 100.56], "48454": [13.705, 100.567], "48453": [13.667, 100.606], "48456": [13.917, 100.6], "48429": [13.686, 100.767],
};
// Rail lines shown as markers at their central interchange (notices are line-wide, not per station).
const RAIL_POS: Record<string, [number, number]> = { "BTS (X)": [13.7457, 100.5341], "MRT (X)": [13.7375, 100.5604] };

/** Thai AQI PM2.5 bands (µg/m³). */
export const pm25Band = (v: number) => (v <= 15 ? 1 : v <= 25 ? 2 : v <= 37.5 ? 3 : v <= 75 ? 4 : 5) as Pt["band"];
/** Water level as % of bank height. */
export const waterBand = (p: number) => (p < 50 ? 1 : p < 70 ? 2 : p < 80 ? 3 : p < 100 ? 4 : 5) as Pt["band"];
export const BAND_VAR = ["", "var(--map-1)", "var(--map-2)", "var(--map-3)", "var(--map-4)", "var(--map-5)"];
export const STALE_MS = 6 * 3600e3;
export const isStale = (at: string | null) => !at || Date.now() - Date.parse(at) > STALE_MS;

const agencyOf = (l: LayerId) => LAYERS.find((x) => x.id === l)!;

export async function loadMapData() {
  const since = new Date(Date.now() - 36 * 3600e3).toISOString();
  const [s, w, r] = await Promise.all([
    supabase.from("station_snapshots").select("source,station_id,name,area,value,pct,status,observed_at,received_at,lat,lng")
      .in("source", Object.keys(SRC)).gte("received_at", since).order("received_at", { ascending: false }).limit(3000),
    supabase.from("weather_station_obs").select("station_id,name,obs_date,obs_time,temp,rain24,received_at").eq("kind", "3h").order("obs_date", { ascending: false }).limit(50),
    supabase.from("social_posts").select("post_id,source,posted_at,text,url").in("source", Object.keys(RAIL_POS)).order("posted_at", { ascending: false }).limit(20),
  ]);
  const pts: Pt[] = [];
  const updated: Partial<Record<LayerId, string>> = {};
  // Keep only the newest fetch batch per source.
  const batch: Record<string, string> = {};
  for (const x of s.data ?? []) batch[x.source] ??= x.received_at;
  for (const x of s.data ?? []) {
    if (x.received_at !== batch[x.source]) continue;
    const layer = SRC[x.source]!; const a = agencyOf(layer);
    updated[layer] = x.received_at;
    const v = x.value == null ? null : Number(x.value); const pct = x.pct == null ? null : Number(x.pct);
    let band: Pt["band"] = 1, severity = 0, label = "—", unit = "";
    if (layer === "pm25" && v != null) { band = pm25Band(v); severity = v; label = `${v} µg/m³`; unit = "µg/m³"; }
    if (layer === "water" && pct != null) { band = waterBand(pct); severity = pct; label = `${pct}% ของตลิ่ง`; unit = "%"; }
    if (layer === "road") { const fl = (x.status ?? "").startsWith("น้ำท่วม"); band = fl ? 5 : (x.status === "ขัดข้อง" ? 3 : 2); severity = fl ? 1000 + (v ?? 0) : 0; label = `${x.status ?? "—"}${v != null ? ` · ${v} ซม.` : ""}`; unit = "ซม."; }
    pts.push({ key: `${layer}:${x.station_id}`, layer, name: x.name, area: x.area, value: layer === "water" ? pct : v, unit, label, status: x.status, at: x.observed_at, lat: x.lat == null ? null : Number(x.lat), lng: x.lng == null ? null : Number(x.lng), band, severity, agency: a.agency, url: a.url });
  }
  const seen = new Set<string>();
  for (const x of w.data ?? []) {
    if (seen.has(x.station_id) || !TMD_POS[x.station_id]) continue; seen.add(x.station_id);
    const [lat, lng] = TMD_POS[x.station_id]!; const a = agencyOf("weather");
    updated.weather ??= x.received_at;
    const at = `${x.obs_date}T${(x.obs_time?.slice(-5) ?? "07:00").padStart(5, "0")}:00+07:00`;
    pts.push({ key: `weather:${x.station_id}`, layer: "weather", name: x.name, area: null, value: x.temp, unit: "°C", label: `${x.temp ?? "—"}°C · ฝน ${x.rain24 ?? "—"} มม.`, status: null, at, lat, lng, band: 1, severity: Number(x.rain24 ?? 0), agency: a.agency, url: a.url });
  }
  for (const src of Object.keys(RAIL_POS)) {
    const p = (r.data ?? []).find((x) => x.source === src); const [lat, lng] = RAIL_POS[src]!;
    const recent = p && Date.now() - Date.parse(p.posted_at) < 24 * 3600e3;
    pts.push({ key: `rail:${src}`, layer: "rail", name: src.replace(" (X)", ""), area: null, value: null, unit: "", label: recent ? p!.text.slice(0, 140) : "ไม่มีประกาศเหตุขัดข้องใน 24 ชม.", status: recent ? "มีประกาศ" : "ปกติ", at: p?.posted_at ?? null, lat, lng, band: recent ? 4 : 2, severity: recent ? 1 : 0, agency: "บัญชี X ทางการ", url: p?.url ?? agencyOf("rail").url });
    if (p) updated.rail = !updated.rail || p.posted_at > updated.rail ? p.posted_at : updated.rail;
  }
  return { pts, updated };
}

export const distKm = (a: [number, number], b: [number, number]) => {
  const R = 6371, t = Math.PI / 180, dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
