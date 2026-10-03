// Interactive Bangkok map on /data-all: layer chips, colour-coded pins, worst-first list, "near me".
// Leaflet is imported dynamically after mount (browser only) so SSR never evaluates it.
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type * as Leaflet from "leaflet";
import { LAYERS, distKm, isStale, loadMapData, type LayerId, type Pt } from "@/lib/bkk-map-data";

const CENTER: [number, number] = [13.7563, 100.5018];
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function popup(p: Pt) {
  return `<div class="bkk-pop"><strong>${esc(p.name)}</strong>${p.area ? `<div class="bkk-pop-sub">${esc(p.area)}</div>` : ""}
  <div class="bkk-pop-val">${esc(p.label)}</div><div class="bkk-pop-sub">อัปเดต ${esc(time(p.at))}${isStale(p.at) ? " · ค่าเก่ากว่า 6 ชม." : ""}</div>
  <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.agency)} ↗</a></div>`;
}

export function BkkMap() {
  const { data } = useQuery({ queryKey: ["bkk-map"], queryFn: loadMapData, refetchInterval: 10 * 60e3 });
  const [on, setOn] = useState<Set<LayerId>>(new Set(["pm25", "water", "road", "rail"]));
  const [allRoads, setAllRoads] = useState(false);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const group = useRef<Leaflet.LayerGroup | null>(null);
  const markers = useRef(new Map<string, Leaflet.CircleMarker>());
  const [ready, setReady] = useState(false);

  const visible = useMemo(() => (data?.pts ?? []).filter((p) => on.has(p.layer) && (p.layer !== "road" || allRoads || p.severity > 0)), [data, on, allRoads]);
  const list = useMemo(() => {
    if (me) return visible.filter((p) => p.lat != null).map((p) => ({ p, d: distKm(me, [p.lat!, p.lng!]) })).sort((a, b) => a.d - b.d).slice(0, 5);
    return [...visible].sort((a, b) => b.severity - a.severity).slice(0, 12).map((p) => ({ p, d: null as number | null }));
  }, [visible, me]);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !box.current || map.current) return;
      const lf = (mod as any).default ?? mod; L.current = lf;
      const m = lf.map(box.current, { center: CENTER, zoom: 11, scrollWheelZoom: false, attributionControl: true });
      lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(m);
      group.current = lf.layerGroup().addTo(m); map.current = m; setReady(true);
    });
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const lf = L.current, g = group.current; if (!ready || !lf || !g) return;
    g.clearLayers(); markers.current.clear();
    for (const p of visible) {
      if (p.lat == null || p.lng == null) continue;
      const mk = lf.circleMarker([p.lat, p.lng], { radius: p.layer === "rail" ? 10 : p.severity > 0 && p.band >= 4 ? 9 : 7, weight: 1.5, className: `bkk-pin map-b${p.band}${isStale(p.at) ? " bkk-stale" : ""}${p.layer === "weather" ? " bkk-weather" : ""}` })
        .bindPopup(popup(p), { maxWidth: 260 }).addTo(g);
      markers.current.set(p.key, mk);
    }
    if (me) lf.circleMarker(me, { radius: 6, className: "bkk-me" }).bindPopup("ตำแหน่งของคุณ").addTo(g);
  }, [visible, ready, me]);

  const fly = (p: Pt) => {
    if (p.lat == null || !map.current) return;
    map.current.flyTo([p.lat, p.lng!], 14, { duration: 0.6 });
    setTimeout(() => markers.current.get(p.key)?.openPopup(), 650);
  };
  const toggle = (id: LayerId) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const nearMe = () => {
    if (me) { setMe(null); map.current?.setView(CENTER, 11); return; }
    if (!navigator.geolocation) { setGeoErr("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setMe(c); setGeoErr(null); map.current?.setView(c, 13); },
      () => setGeoErr("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง"), { timeout: 10000 });
  };
  const counts = (id: LayerId) => (data?.pts ?? []).filter((p) => p.layer === id && (id !== "road" || p.severity > 0)).length;
  const noCoord = visible.filter((p) => p.lat == null).length;

  return (
    <section className="mt-8">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">แผนที่กรุงเทพฯ — อากาศ น้ำ และการเดินทาง (ค่าล่าสุด)</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={on.has(l.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${on.has(l.id) ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground"}`}>
            {l.label} <span className="opacity-70">{counts(l.id)}</span>
            {data?.updated[l.id] && <span className="ml-1 text-xs opacity-70">· {time(data.updated[l.id]!).split(" ").slice(-1)}</span>}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={allRoads} onChange={(e) => setAllRoads(e.target.checked)} /> แสดงจุดวัดถนนทุกจุด</label>
        <button type="button" onClick={nearMe} className="ml-auto rounded-full border border-foreground px-3 py-1 text-sm hover:bg-accent">{me ? "ล้างตำแหน่ง" : "◎ ใกล้ฉัน"}</button>
      </div>
      {geoErr && <p className="mt-1 text-xs text-destructive">{geoErr}</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-[3fr_2fr]">
        <div ref={box} className="bkk-map h-[360px] w-full min-w-0 border border-border md:h-[480px]" role="region" aria-label="แผนที่กรุงเทพมหานคร" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{me ? "5 จุดที่ใกล้คุณที่สุด" : "จุดที่ควรรู้ก่อน (ค่าสูงสุดก่อน)"}</h3>
          {!data ? <p className="mt-2 text-sm text-muted-foreground">กำลังโหลด…</p> : !list.length ? <p className="mt-2 text-sm text-muted-foreground">ไม่มีข้อมูลในชั้นที่เลือก</p> : (
            <ol className="mt-2 divide-y divide-border border-y border-border">
              {list.map(({ p, d }) => (
                <li key={p.key}>
                  <button type="button" onClick={() => fly(p)} disabled={p.lat == null} className={`flex w-full items-start gap-2 py-2 text-left text-sm hover:bg-accent disabled:cursor-default ${isStale(p.at) ? "opacity-60" : ""}`}>
                    <span className={`bkk-dot map-b${p.band} mt-1`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{LAYERS.find((l) => l.id === p.layer)!.label} · {p.label}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">{d != null ? `${d.toFixed(1)} กม.` : time(p.at)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {noCoord > 0 && <p className="mt-2 text-xs text-muted-foreground">{noCoord} จุดไม่มีพิกัดจากต้นทาง (เช่น จุดวัดถนนของ กทม.) — ดูในรายการด้านบนและตารางด้านล่าง</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>สี PM2.5 (µg/m³):</span>
        {[["1", "≤15"], ["2", "≤25"], ["3", "≤37.5"], ["4", "≤75"], ["5", ">75"]].map(([b, t]) => <span key={b} className="flex items-center gap-1"><span className={`bkk-dot map-b${b}`} />{t}</span>)}
        <span>· ระดับน้ำ: สีเดียวกันตาม % ตลิ่ง (แดง = ล้นตลิ่ง) · ถนน: แดง = น้ำท่วม · จาง = ค่าเก่ากว่า 6 ชม.</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">ที่มา: กรมควบคุมมลพิษ, สสน. (ThaiWater), กทม. สำนักการระบายน้ำ, กรมอุตุนิยมวิทยา, บัญชี X ของ BTS/MRT · แผนที่ © OpenStreetMap · ตำแหน่งของคุณใช้บนเครื่องนี้เท่านั้น ไม่ถูกบันทึก</p>
    </section>
  );
}
