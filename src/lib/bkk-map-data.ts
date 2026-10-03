// Data for the interactive Bangkok map (/data-all): latest batch per layer + colour bands + advice. Browser-safe (no Leaflet).
import { supabase } from "@/integrations/supabase/client";
import { districtOf, tmdTime } from "./bkk-geo";

export type LayerId = "weather" | "pm25" | "water" | "road" | "rail";
export type Pt = {
  key: string; layer: LayerId; name: string; area: string | null; district: string | null; value: number | null; unit: string;
  short: string; label: string; advice: string | null; status: string | null; at: string | null;
  lat: number | null; lng: number | null; approx: boolean; band: 1 | 2 | 3 | 4 | 5; severity: number; agency: string; url: string;
};

export const LAYERS: { id: LayerId; label: string; agency: string; url: string }[] = [
  { id: "pm25", label: "PM2.5", agency: "กรมควบคุมมลพิษ (Air4Thai)", url: "https://air4thai.pcd.go.th/" },
  { id: "water", label: "ระดับน้ำคลอง", agency: "สสน. (ThaiWater)", url: "https://www.thaiwater.net/" },
  { id: "road", label: "น้ำท่วมถนน", agency: "กทม. สำนักการระบายน้ำ", url: "https://weather.bangkok.go.th/flood/" },
  { id: "weather", label: "อากาศ", agency: "กรมอุตุนิยมวิทยา", url: "https://www.tmd.go.th/" },
  { id: "rail", label: "รถไฟฟ้า", agency: "BTS / MRT (X)", url: "https://x.com/BTS_SkyTrain" },
];
export const layerLabel = (l: LayerId) => LAYERS.find((x) => x.id === l)!.label;

const SRC: Record<string, LayerId> = {
  "Air4Thai PM2.5 (กรมควบคุมมลพิษ)": "pm25", "ThaiWater สถานี กทม.และปริมณฑล": "water", "กทม. ระบายน้ำ (น้ำท่วมถนน)": "road",
};
// TMD 3-hour stations near Bangkok (fixed coordinates).
export const TMD_POS: Record<string, [number, number]> = {
  "48455": [13.727, 100.56], "48454": [13.705, 100.567], "48453": [13.667, 100.606], "48456": [13.917, 100.6], "48429": [13.686, 100.767],
};
// Rail lines shown at their central interchange (notices are line-wide, not per station).
const RAIL_POS: Record<string, [number, number]> = { "BTS (X)": [13.7457, 100.5341], "MRT (X)": [13.7375, 100.5604] };

/** Thai AQI PM2.5 bands (µg/m³, PCD 2023). */
export const pm25Band = (v: number) => (v <= 15 ? 1 : v <= 25 ? 2 : v <= 37.5 ? 3 : v <= 75 ? 4 : 5) as Pt["band"];
const PM_ADVICE = ["", "คุณภาพอากาศดีมาก ทำกิจกรรมกลางแจ้งได้ตามปกติ", "คุณภาพอากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ",
  "ปานกลาง — กลุ่มเสี่ยง (เด็ก ผู้สูงอายุ ผู้มีโรคประจำตัว) ควรลดกิจกรรมกลางแจ้ง",
  "เริ่มมีผลต่อสุขภาพ — ลดกิจกรรมกลางแจ้ง สวมหน้ากากกันฝุ่น กลุ่มเสี่ยงควรอยู่ในอาคาร",
  "มีผลต่อสุขภาพ — งดกิจกรรมกลางแจ้ง สวมหน้ากาก N95 หากมีอาการผิดปกติให้พบแพทย์"];
/** Water level as % of bank height. */
export const waterBand = (p: number) => (p < 50 ? 1 : p < 70 ? 2 : p < 80 ? 3 : p < 100 ? 4 : 5) as Pt["band"];
export const STALE_MS = 6 * 3600e3;
export const isStale = (at: string | null) => !at || Date.now() - Date.parse(at) > STALE_MS;

const agencyOf = (l: LayerId) => LAYERS.find((x) => x.id === l)!;
const num = (v: unknown) => (v == null ? null : Number(v));

export async function loadMapData() {
  const since = new Date(Date.now() - 36 * 3600e3).toISOString();
  const [s, w, r, loc] = await Promise.all([
    supabase.from("station_snapshots").select("source,station_id,name,area,value,pct,status,observed_at,received_at,lat,lng")
      .in("source", Object.keys(SRC)).gte("received_at", since).order("received_at", { ascending: false }).limit(3000),
    supabase.from("weather_station_obs").select("station_id,name,obs_date,obs_time,temp,rain24,received_at").eq("kind", "3h").order("obs_date", { ascending: false }).order("received_at", { ascending: false }).limit(50),
    supabase.from("social_posts").select("post_id,source,posted_at,text,url").in("source", Object.keys(RAIL_POS)).order("posted_at", { ascending: false }).limit(20),
    supabase.from("station_locations").select("source,station_id,lat,lng,method").limit(5000),
  ]);
  const locs = new Map((loc.data ?? []).map((l) => [`${l.source}|${l.station_id}`, l]));
  const pts: Pt[] = [];
  const updated: Partial<Record<LayerId, string>> = {};
  const batch: Record<string, string> = {};
  for (const x of s.data ?? []) batch[x.source] ??= x.received_at; // newest fetch batch per source
  for (const x of s.data ?? []) {
    if (x.received_at !== batch[x.source]) continue;
    const layer = SRC[x.source]!; const a = agencyOf(layer);
    updated[layer] = x.received_at;
    const v = num(x.value), pct = num(x.pct);
    const l = x.lat == null ? locs.get(`${x.source}|${x.station_id}`) : null;
    const lat = x.lat != null ? Number(x.lat) : l ? Number(l.lat) : null;
    const lng = x.lng != null ? Number(x.lng) : l ? Number(l.lng) : null;
    let band: Pt["band"] = 1, severity = 0, label = "—", short = "", unit = "", advice: string | null = null;
    if (layer === "pm25" && v != null) { band = pm25Band(v); severity = v; label = `PM2.5 ${v} µg/m³${x.status ? ` · ${x.status}` : ""}`; short = String(Math.round(v)); unit = "µg/m³"; advice = PM_ADVICE[band]!; }
    if (layer === "water" && pct != null) {
      band = waterBand(pct); severity = pct; label = `${pct}% ของตลิ่ง${v != null ? ` · ${v} ม.รทก.` : ""}`; short = `${Math.round(pct)}%`; unit = "%";
      advice = pct >= 100 ? "น้ำล้นตลิ่ง — เฝ้าระวังน้ำท่วมบ้านเรือนริมคลอง ติดตามประกาศ กทม./ปภ." : pct >= 80 ? "น้ำใกล้ตลิ่ง — เฝ้าระวัง" : null;
    }
    if (layer === "road") {
      const fl = (x.status ?? "").startsWith("น้ำท่วม");
      band = fl ? 5 : x.status === "ขัดข้อง" ? 3 : 2; severity = fl ? 1000 + (v ?? 0) : 0;
      label = `${x.status ?? "—"}${v != null ? ` · ${v} ซม.` : ""}`; short = fl ? `${v ?? ""}` : ""; unit = "ซม.";
      advice = fl ? "หลีกเลี่ยงเส้นทาง รถเล็กควรระวังน้ำเข้าเครื่อง" : x.status === "ขัดข้อง" ? "เครื่องวัดขัดข้อง — ยังไม่มีค่าที่เชื่อถือได้" : null;
    }
    pts.push({ key: `${layer}:${x.station_id}`, layer, name: x.name, area: x.area, district: districtOf(x.area) ?? (layer === "water" ? x.area : null), value: layer === "water" ? pct : v, unit, short, label, advice, status: x.status, at: x.observed_at, lat, lng, approx: l?.method === "geocoded", band, severity, agency: a.agency, url: a.url });
  }
  const seen = new Set<string>();
  for (const x of w.data ?? []) {
    if (seen.has(x.station_id) || !TMD_POS[x.station_id]) continue; seen.add(x.station_id);
    const [lat, lng] = TMD_POS[x.station_id]!; const a = agencyOf("weather");
    if (!updated.weather || x.received_at > updated.weather) updated.weather = x.received_at;
    const hm = tmdTime(x.obs_time);
    const at = hm ? `${x.obs_date}T${hm}:00+07:00` : x.received_at;
    const rain = Number(x.rain24 ?? 0);
    pts.push({ key: `weather:${x.station_id}`, layer: "weather", name: x.name, area: null, district: null, value: x.temp, unit: "°C", short: x.temp != null ? `${Math.round(Number(x.temp))}°` : "", label: `สูงสุด ${x.temp ?? "—"}°C · ฝน 24 ชม. ${x.rain24 ?? "—"} มม. · รายงานรอบ ${hm ?? "—"} น.`, advice: rain >= 35 ? "ฝนตกหนัก — ระวังน้ำท่วมขังผิวจราจร" : Number(x.temp) >= 38 ? "อากาศร้อนจัด — ดื่มน้ำบ่อย หลีกเลี่ยงแดดจัด" : null, status: null, at, lat, lng, approx: false, band: rain >= 35 ? 4 : rain >= 10 ? 3 : 1, severity: rain, agency: a.agency, url: a.url });
  }
  for (const src of Object.keys(RAIL_POS)) {
    const p = (r.data ?? []).find((x) => x.source === src); const [lat, lng] = RAIL_POS[src]!;
    const recent = !!p && Date.now() - Date.parse(p.posted_at) < 24 * 3600e3;
    pts.push({ key: `rail:${src}`, layer: "rail", name: `รถไฟฟ้า ${src.replace(" (X)", "")}`, area: null, district: null, value: null, unit: "", short: src.slice(0, 3), label: recent ? p!.text.slice(0, 160) : "ไม่มีประกาศเหตุขัดข้องใน 24 ชม.", advice: recent ? "เผื่อเวลาเดินทาง ตรวจสอบประกาศล่าสุดของผู้ให้บริการ" : null, status: recent ? "มีประกาศ" : "ปกติ", at: p?.posted_at ?? null, lat, lng, approx: false, band: recent ? 4 : 2, severity: recent ? 500 : 0, agency: "บัญชี X ทางการ", url: p?.url ?? agencyOf("rail").url });
    if (p && (!updated.rail || p.posted_at > updated.rail)) updated.rail = p.posted_at;
  }
  return { pts, updated };
}

export const distKm = (a: [number, number], b: [number, number]) => {
  const R = 6371, t = Math.PI / 180, dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Nearest located point of each layer to `c` (for map clicks and "near me"). */
export function nearestPerLayer(pts: Pt[], c: [number, number]) {
  const out: { p: Pt; d: number }[] = [];
  for (const l of LAYERS) {
    let best: { p: Pt; d: number } | null = null;
    for (const p of pts) {
      if (p.layer !== l.id || p.lat == null || p.lng == null || l.id === "rail") continue;
      if (l.id === "road" && p.severity <= 0) continue; // nearest flooded road only
      const d = distKm(c, [p.lat, p.lng]);
      if (!best || d < best.d) best = { p, d };
    }
    if (best) out.push(best);
  }
  return out;
}

/** Headline numbers for the "ตอนนี้ในกรุงเทพฯ" bar. */
export function summarise(pts: Pt[]) {
  const pm = pts.filter((p) => p.layer === "pm25" && p.value != null);
  const pmAvg = pm.length ? Math.round((pm.reduce((s, p) => s + p.value!, 0) / pm.length) * 10) / 10 : null;
  const pmTop = [...pm].sort((a, b) => b.value! - a.value!)[0] ?? null;
  const flooded = pts.filter((p) => p.layer === "road" && p.severity > 0).sort((a, b) => b.severity - a.severity);
  const water = pts.filter((p) => p.layer === "water" && p.value != null).sort((a, b) => b.value! - a.value!);
  const over = water.filter((p) => p.value! >= 100);
  const rail = pts.filter((p) => p.layer === "rail" && p.severity > 0);
  return { pmAvg, pmTop, flooded, water, over, rail };
}
