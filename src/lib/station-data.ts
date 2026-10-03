// Per-station history for /station/$kind/$id (browser-safe). Real stored readings only — gaps stay gaps.
import { supabase } from "@/integrations/supabase/client";
import { SRC, TMD_POS, LAYERS, type LayerId } from "./bkk-map-data";
import { tmdTime } from "./bkk-geo";

export type Kind = LayerId;
export const KINDS: Kind[] = ["pm25", "weather", "road", "water", "rail"];
export const KIND_TH: Record<Kind, string> = { pm25: "อากาศ (PM2.5)", weather: "สถานีอุตุฯ", road: "น้ำท่วมถนน", water: "น้ำท้องถิ่น (คลอง)", rail: "รถไฟฟ้า" };
export const sourceOf = (k: Kind) => Object.entries(SRC).find(([, l]) => l === k)?.[0] ?? null;
export const agencyOf = (k: Kind) => LAYERS.find((l) => l.id === k)!;

export type HPoint = { t: number; v: number | null; v2?: number | null; note?: string | null };
export type History = { name: string; area: string | null; unit: string; unit2?: string; label: string; label2?: string; points: HPoint[]; lat: number | null; lng: number | null; approx: boolean; posts?: { posted_at: string; text: string; url: string }[] };

export async function loadHistory(kind: Kind, id: string, days: number): Promise<History | null> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  if (kind === "weather") {
    const { data } = await supabase.from("weather_station_obs").select("name,obs_date,obs_time,temp,rain24,received_at").eq("kind", "3h").eq("station_id", id).gte("received_at", since).order("received_at").limit(2000);
    if (!data?.length) return null;
    const seen = new Map<number, HPoint>();
    for (const x of data) {
      const hm = tmdTime(x.obs_time);
      const t = Date.parse(hm ? `${x.obs_date}T${hm}:00+07:00` : x.received_at);
      seen.set(t, { t, v: x.temp == null ? null : Number(x.temp), v2: x.rain24 == null ? null : Number(x.rain24) });
    }
    const pos = TMD_POS[id];
    return { name: data.at(-1)!.name, area: null, unit: "°C", unit2: "มม.", label: "อุณหภูมิ", label2: "ฝน 24 ชม.", points: [...seen.values()].sort((a, b) => a.t - b.t), lat: pos?.[0] ?? null, lng: pos?.[1] ?? null, approx: false };
  }
  if (kind === "rail") {
    const { data } = await supabase.from("social_posts").select("posted_at,text,url").eq("source", `${id} (X)`).gte("posted_at", since).order("posted_at", { ascending: false }).limit(200);
    const byDay = new Map<string, number>();
    for (let d = 0; d < days; d++) byDay.set(new Date(Date.now() + 7 * 3600e3 - d * 864e5).toISOString().slice(0, 10), 0);
    for (const p of data ?? []) { const k = new Date(Date.parse(p.posted_at) + 7 * 3600e3).toISOString().slice(0, 10); if (byDay.has(k)) byDay.set(k, byDay.get(k)! + 1); }
    return { name: `รถไฟฟ้า ${id}`, area: "ทั้งสาย (ต้นทางไม่แยกรายสถานี)", unit: "ประกาศ", label: "ประกาศเหตุขัดข้องต่อวัน", points: [...byDay.entries()].map(([d, n]) => ({ t: Date.parse(`${d}T12:00:00+07:00`), v: n })).sort((a, b) => a.t - b.t), lat: null, lng: null, approx: false, posts: data ?? [] };
  }
  const src = sourceOf(kind);
  if (!src) return null;
  const [s, l] = await Promise.all([
    supabase.from("station_snapshots").select("name,area,value,pct,status,observed_at,received_at,lat,lng").eq("source", src).eq("station_id", id).gte("received_at", since).order("received_at").limit(3000),
    supabase.from("station_locations").select("lat,lng,method").eq("source", src).eq("station_id", id).maybeSingle(),
  ]);
  if (!s.data?.length) return null;
  const seen = new Map<number, HPoint>();
  for (const x of s.data) {
    const t = Date.parse(x.observed_at ?? x.received_at);
    const v = kind === "water" ? x.pct : x.value;
    seen.set(t, { t, v: v == null ? null : Number(v), v2: kind === "water" && x.value != null ? Number(x.value) : null, note: x.status });
  }
  const last = s.data.at(-1)!;
  const lat = last.lat ?? l.data?.lat ?? null, lng = last.lng ?? l.data?.lng ?? null;
  const meta = kind === "pm25" ? { unit: "µg/m³", label: "PM2.5" } : kind === "water" ? { unit: "%", label: "ระดับน้ำ (% ของตลิ่ง)", unit2: "ม.รทก.", label2: "ระดับน้ำ" } : { unit: "ซม.", label: "ความสูงน้ำบนถนน" };
  return { name: last.name, area: last.area, ...meta, points: [...seen.values()].sort((a, b) => a.t - b.t), lat: lat == null ? null : Number(lat), lng: lng == null ? null : Number(lng), approx: !last.lat && l.data?.method === "geocoded" };
}
