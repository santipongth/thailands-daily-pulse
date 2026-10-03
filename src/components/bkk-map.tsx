// Interactive Bangkok map on Today: summary bar, layer chips, value pins, tap-anywhere nearest readings,
// search, near me, shareable link, full screen. Leaflet is imported after mount (browser only) so SSR never evaluates it.
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type * as Leaflet from "leaflet";
import { LAYERS, isStale, layerLabel, loadMapData, nearestPerLayer, summarise, type LayerId, type Pt } from "@/lib/bkk-map-data";
import { EditorialDataSection } from "@/components/editorial-data-section";

const CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ON: LayerId[] = ["pm25", "water", "road", "weather", "rail"];
const time = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const hm = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) : "—");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

type Spot = { c: [number, number]; label: string };

export function BkkMap({ initialLayers, initialPoint }: { initialLayers?: string; initialPoint?: string }) {
  const { data, dataUpdatedAt } = useQuery({ queryKey: ["bkk-map"], queryFn: loadMapData, refetchInterval: 10 * 60e3 });
  const [on, setOn] = useState<Set<LayerId>>(new Set(DEFAULT_ON));
  const [allRoads, setAllRoads] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const group = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const pts = data?.pts ?? [];
  const sum = useMemo(() => summarise(pts), [pts]);
  const selPt = pts.find((p) => p.key === sel) ?? null;

  // Shared link: ?layers=pm25,water&pt=<key>, validated by the Today route.
  useEffect(() => {
    if (initialLayers) setOn(new Set(initialLayers.split(",").filter((x): x is LayerId => LAYERS.some((l) => l.id === x))));
    if (initialPoint) setSel(initialPoint);
  }, []);
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("layers", [...on].join(","));
    sel ? u.searchParams.set("pt", sel) : u.searchParams.delete("pt");
    window.history.replaceState(window.history.state, "", u.toString());
  }, [on, sel]);

  const term = q.trim().toLowerCase();
  const visible = useMemo(() => pts.filter((p) => on.has(p.layer)
    && (p.layer !== "road" || allRoads || p.severity > 0 || (term && match(p, term)))
    && (!term || match(p, term))), [pts, on, allRoads, term]);
  const list = useMemo(() => [...visible].sort((a, b) => b.severity - a.severity || a.name.localeCompare(b.name, "th")).slice(0, term ? 40 : 15), [visible, term]);
  const near = useMemo(() => (spot ? nearestPerLayer(pts.filter((p) => on.has(p.layer)), spot.c) : []), [spot, pts, on]);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !box.current || map.current) return;
      const lf = (mod as any).default ?? mod; L.current = lf;
      const m = lf.map(box.current, { center: CENTER, zoom: 11, scrollWheelZoom: false, zoomControl: true });
      lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(m);
      group.current = lf.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => { setSel(null); setSpot({ c: [e.latlng.lat, e.latlng.lng], label: "จุดที่คุณแตะ" }); });
      m.on("focus", () => m.scrollWheelZoom.enable()); m.on("blur", () => m.scrollWheelZoom.disable());
      map.current = m; setReady(true);
    });
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const lf = L.current, g = group.current; if (!ready || !lf || !g) return;
    g.clearLayers();
    const order = [...visible].sort((a, b) => a.severity - b.severity); // worst drawn last (on top)
    for (const p of order) {
      if (p.lat == null || p.lng == null) continue;
      const big = p.layer === "rail" || p.key === sel;
      const html = `<span class="bkk-pin2 map-b${p.band}${p.layer === "weather" ? " bkk-weather" : ""}${p.layer === "rail" ? " bkk-rail" : ""}${isStale(p.at) ? " bkk-stale" : ""}${p.approx ? " bkk-approx" : ""}${p.key === sel ? " bkk-sel" : ""}">${esc(p.short)}</span>`;
      const size = big ? 34 : p.short ? 28 : 16;
      const mk = lf.marker([p.lat, p.lng], { icon: lf.divIcon({ html, className: "bkk-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), title: `${p.name} — ${p.label}`, keyboard: true, riseOnHover: true });
      mk.on("click", (e: Leaflet.LeafletMouseEvent) => { lf.DomEvent.stopPropagation(e); setSpot(null); setSel(p.key); });
      mk.addTo(g);
    }
    if (spot) lf.circleMarker(spot.c, { radius: 7, className: "bkk-me", interactive: false }).addTo(g);
  }, [visible, ready, sel, spot]);

  // Fly to a shared/selected point once the map is ready.
  useEffect(() => { if (ready && selPt?.lat != null) map.current!.flyTo([selPt.lat, selPt.lng!], Math.max(map.current!.getZoom(), 13), { duration: 0.5 }); }, [ready, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p: Pt) => { setSpot(null); setSel(p.key); if (p.lat == null) return; if (!on.has(p.layer)) setOn((s) => new Set(s).add(p.layer)); };
  const toggle = (id: LayerId) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const nearMe = () => {
    if (!navigator.geolocation) { setGeoErr("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setSel(null); setSpot({ c, label: "ตำแหน่งของคุณ" }); setGeoErr(null); map.current?.setView(c, 13); },
      () => setGeoErr("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — แตะบนแผนที่แทนได้"), { timeout: 10000 });
  };
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };
  const full = () => { const el = wrap.current; if (!el) return; document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.(); setTimeout(() => map.current?.invalidateSize(), 300); };
  useEffect(() => { const f = () => setTimeout(() => map.current?.invalidateSize(), 200); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  const count = (id: LayerId) => pts.filter((p) => p.layer === id && (id !== "road" || p.severity > 0)).length;
  const located = (id: LayerId) => pts.filter((p) => p.layer === id && p.lat != null).length;
  const noCoord = visible.filter((p) => p.lat == null).length;

  return (
    <EditorialDataSection eyebrow="กรุงเทพฯ ขณะนี้" title="แผนที่กรุงเทพฯ — อากาศ น้ำ และการเดินทาง">

      {/* ตอนนี้ในกรุงเทพฯ */}
      <div className="mt-3 grid grid-cols-2 gap-px border border-border bg-border text-sm md:grid-cols-4">
        <SumCell title="PM2.5 เฉลี่ย กทม." value={sum.pmAvg != null ? `${sum.pmAvg} µg/m³` : "—"} sub={sum.pmTop ? `สูงสุด ${sum.pmTop.value} · ${sum.pmTop.district ? `เขต${sum.pmTop.district}` : sum.pmTop.name}` : "ยังไม่มีค่าวันนี้"} onClick={sum.pmTop ? () => pick(sum.pmTop!) : undefined} />
        <SumCell title="ถนนน้ำท่วม (กทม.)" value={`${sum.flooded.length} จุด`} sub={sum.flooded[0] ? sum.flooded[0].name : "ไม่มีจุดน้ำท่วม"} tone={sum.flooded.length ? "bad" : undefined} onClick={sum.flooded[0] ? () => pick(sum.flooded[0]!) : undefined} />
        <SumCell title="คลองล้นตลิ่ง" value={`${sum.over.length} จาก ${sum.water.length} สถานี`} sub={sum.water[0] ? `สูงสุด ${sum.water[0].name} ${sum.water[0].value}%` : "—"} tone={sum.over.length ? "bad" : undefined} onClick={sum.water[0] ? () => pick(sum.water[0]!) : undefined} />
        <SumCell title="รถไฟฟ้า BTS/MRT" value={sum.rail.length ? "มีประกาศ" : "ปกติ"} sub={sum.rail.length ? sum.rail.map((p) => p.name).join(", ") : "ไม่มีเหตุขัดข้องใน 24 ชม."} tone={sum.rail.length ? "bad" : undefined} onClick={sum.rail[0] ? () => pick(sum.rail[0]!) : undefined} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={on.has(l.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${on.has(l.id) ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground"}`}>
            {l.label} <span className="opacity-70">{count(l.id)}</span>
            {data?.updated[l.id] && <span className="ml-1 text-xs opacity-70">· {hm(data.updated[l.id])}</span>}
          </button>
        ))}
        <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={allRoads} onChange={(e) => setAllRoads(e.target.checked)} /> จุดวัดถนนทุกจุด</label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเขต ถนน คลอง หรือสถานี เช่น บางนา, รามอินทรา" aria-label="ค้นหาบนแผนที่"
          className="min-w-0 flex-1 basis-56 border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground" />
        <button type="button" onClick={nearMe} className="rounded-full border border-foreground px-3 py-1 text-sm hover:bg-accent">◎ ใกล้ฉัน</button>
        <button type="button" onClick={share} className="rounded-full border border-border px-3 py-1 text-sm hover:border-foreground">{copied ? "คัดลอกลิงก์แล้ว" : "แชร์มุมมองนี้"}</button>
        <button type="button" onClick={full} className="rounded-full border border-border px-3 py-1 text-sm hover:border-foreground">⛶ เต็มจอ</button>
      </div>
      {geoErr && <p className="mt-1 text-xs text-destructive">{geoErr}</p>}

      <div className="mt-3 grid gap-4 md:grid-cols-[3fr_2fr]">
        <div ref={wrap} className="relative min-w-0 bg-background">
          <div ref={box} className="bkk-map h-[62vh] max-h-[560px] min-h-[340px] w-full border border-border" role="region" aria-label="แผนที่กรุงเทพมหานคร แตะเพื่อดูค่าที่ใกล้ที่สุด" />
          {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">กำลังโหลดแผนที่…</p>}
          <p className="pointer-events-none absolute left-14 top-2 z-[400] bg-background/90 px-2 py-1 text-xs text-muted-foreground">แตะจุดใดก็ได้บนแผนที่ เพื่อดูค่าที่ใกล้ที่สุด</p>
          {(selPt || spot) && (
            <div className="absolute inset-x-2 bottom-2 z-[500] max-h-[55%] overflow-y-auto border-2 border-foreground bg-background p-3 shadow-lg md:inset-x-auto md:right-2 md:w-80">
              <button type="button" onClick={() => { setSel(null); setSpot(null); }} className="float-right text-sm text-muted-foreground hover:text-foreground" aria-label="ปิด">✕</button>
              {selPt ? <PtCard p={selPt} /> : <NearCard spot={spot!} near={near} onPick={pick} />}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{term ? `ผลการค้นหา "${q}" (${visible.length})` : "จุดที่ควรรู้ก่อน (รุนแรงสุดก่อน)"}</h3>
          {!data ? <p className="mt-2 text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p> : !list.length ? <p className="mt-2 text-sm text-muted-foreground">{term ? "ไม่พบชื่อที่ค้นหาในชั้นข้อมูลที่เลือก" : "ไม่มีข้อมูลในชั้นที่เลือก"}</p> : (
            <ol className="mt-2 max-h-[520px] divide-y divide-border overflow-y-auto border-y border-border">
              {list.map((p) => (
                <li key={p.key}>
                  <button type="button" onClick={() => pick(p)} className={`flex w-full items-start gap-2 px-1 py-2 text-left text-sm hover:bg-accent ${p.key === sel ? "bg-accent" : ""} ${isStale(p.at) ? "opacity-60" : ""}`}>
                    <span className={`bkk-dot map-b${p.band} mt-1`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{layerLabel(p.layer)}{p.district ? ` · ${p.layer === "water" ? p.district : `เขต${p.district}`}` : ""} · {p.label}</span>
                      {p.lat == null && <span className="block text-xs text-muted-foreground">ไม่มีพิกัด — แสดงเฉพาะในรายการ</span>}
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">{time(p.at)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            ปักหมุดได้: PM2.5 {located("pm25")}/{pts.filter((p) => p.layer === "pm25").length} · คลอง {located("water")}/{pts.filter((p) => p.layer === "water").length} · ถนน {located("road")}/{pts.filter((p) => p.layer === "road").length}
            {noCoord > 0 && ` · ${noCoord} จุดในชั้นที่เลือกไม่มีพิกัด`}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>สี PM2.5 (µg/m³):</span>
        {[["1", "≤15 ดีมาก"], ["2", "≤25 ดี"], ["3", "≤37.5 ปานกลาง"], ["4", "≤75 เริ่มมีผล"], ["5", ">75 มีผลต่อสุขภาพ"]].map(([b, t]) => <span key={b} className="flex items-center gap-1"><span className={`bkk-dot map-b${b}`} />{t}</span>)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">คลอง: สีตาม % ของตลิ่ง (แดง = ล้นตลิ่ง) · ถนน: แดง = น้ำท่วม · หมุดวงกลมขาว = สถานีอากาศ (°C) · หมุดเส้นประ = ตำแหน่งโดยประมาณจากชื่อถนน · จาง = ค่าเก่ากว่า 6 ชม.</p>
      <p className="mt-1 text-xs text-muted-foreground">ที่มา: กรมควบคุมมลพิษ, สสน. (ThaiWater), กทม. สำนักการระบายน้ำ, กรมอุตุนิยมวิทยา, บัญชี X ของ BTS/MRT · แผนที่ © OpenStreetMap · โหลดล่าสุด {dataUpdatedAt ? hm(new Date(dataUpdatedAt).toISOString()) : "—"} น. (รีเฟรชทุก 10 นาที) · ตำแหน่งของคุณใช้บนเครื่องนี้เท่านั้น ไม่ถูกบันทึก</p>
    </EditorialDataSection>
  );
}

function match(p: Pt, t: string) {
  return [p.name, p.area, p.district].some((s) => s && s.toLowerCase().includes(t));
}

function SumCell({ title, value, sub, tone, onClick }: { title: string; value: string; sub: string; tone?: "bad" | undefined; onClick?: (() => void) | undefined }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="bg-background p-2 text-left hover:bg-accent disabled:cursor-default disabled:hover:bg-background">
      <span className="block text-xs text-muted-foreground">{title}</span>
      <span className={`block font-display text-lg leading-tight ${tone === "bad" ? "text-destructive" : ""}`}>{value}</span>
      <span className="block truncate text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}

function PtCard({ p }: { p: Pt }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-muted-foreground">{layerLabel(p.layer)}{p.district ? ` · ${p.layer === "water" ? p.district : `เขต${p.district}`}` : ""}</p>
      <p className="pr-6 font-semibold">{p.name}</p>
      {p.area && p.layer === "road" && <p className="text-xs text-muted-foreground">{p.area}</p>}
      <p className="mt-1 flex items-center gap-2"><span className={`bkk-dot map-b${p.band}`} aria-hidden /><span className="font-medium">{p.label}</span></p>
      {p.advice && <p className="mt-1 border-l-2 border-foreground pl-2">{p.advice}</p>}
      <p className="mt-1 text-xs text-muted-foreground">อัปเดต {time(p.at)}{isStale(p.at) ? " · ค่าเก่ากว่า 6 ชม." : ""}{p.approx ? " · ตำแหน่งโดยประมาณจากชื่อถนน" : ""}</p>
      <a href={p.url} target="_blank" rel="noopener" className="mt-1 inline-block text-xs underline">{p.agency} ↗</a>
    </div>
  );
}

function NearCard({ spot, near, onPick }: { spot: Spot; near: { p: Pt; d: number }[]; onPick: (p: Pt) => void }) {
  return (
    <div className="text-sm">
      <p className="pr-6 font-semibold">{spot.label}: ค่าที่ใกล้ที่สุด</p>
      {!near.length ? <p className="mt-1 text-muted-foreground">ไม่มีสถานีที่มีพิกัดในชั้นที่เลือก</p> : (
        <ul className="mt-1 divide-y divide-border">
          {near.map(({ p, d }) => (
            <li key={p.key}><button type="button" onClick={() => onPick(p)} className="flex w-full items-start gap-2 py-1.5 text-left hover:bg-accent">
              <span className={`bkk-dot map-b${p.band} mt-1`} aria-hidden />
              <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{layerLabel(p.layer)} · ห่าง {d.toFixed(1)} กม.</span><span className="block truncate">{p.name}</span><span className="block text-xs">{p.label}</span></span>
            </button></li>
          ))}
        </ul>
      )}
      {near.find((n) => n.p.layer === "pm25")?.p.advice && <p className="mt-1 border-l-2 border-foreground pl-2 text-xs">{near.find((n) => n.p.layer === "pm25")!.p.advice}</p>}
      {!near.some((n) => n.p.layer === "road") && <p className="mt-1 text-xs text-muted-foreground">ไม่มีถนนน้ำท่วมที่ปักหมุดได้ในขณะนี้</p>}
    </div>
  );
}
