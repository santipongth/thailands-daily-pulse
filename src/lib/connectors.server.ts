// Server-only: one connector per real data source. Each returns { metric_id: value } and may
// return per-metric dates ({ values, dates }) when a value refers to a day other than the run date.
import { politeFetch } from "./http.server";

type Values = Record<string, number>;
export type ConnectorOut = Values | { values: Values; dates: Record<string, string> };
export type Connector = { source: string; run: (date: string, ctx?: { admin?: any }) => Promise<ConnectorOut> };

export const normalizeOut = (o: ConnectorOut): { values: Values; dates?: Record<string, string> } =>
  o && typeof (o as any).values === "object" && typeof (o as any).dates === "object" ? (o as any) : { values: o as Values };

const json = async (url: string) => (await politeFetch(url, { headers: { accept: "application/json, */*" } })).json() as Promise<any>;
const text = async (url: string) => (await politeFetch(url)).text();
const pos = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const put = (o: Values, k: string, v: number | undefined) => {
  if (v !== undefined) o[k] = v;
};
const blocks = (xml: string, tag: string) => xml.split(`<${tag}>`).slice(1).map((b) => b.split(`</${tag}>`)[0] ?? "");
const field = (b: string, tag: string) => b.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1] ?? "";
const prevDay = (d: string) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };

export const CONNECTORS: Connector[] = [
  {
    source: "PTT (thai-oil-api)",
    run: async () => {
      const o: Values = {};
      const p = (await json("https://api.chnwt.dev/thai-oil-api/latest"))?.response?.stations?.ptt;
      put(o, "gsh95", pos(p?.gasohol_95?.price));
      put(o, "e20", pos(p?.gasohol_e20?.price));
      put(o, "diesel", pos(p?.diesel?.price));
      return o;
    },
  },
  {
    source: "บางจาก (Bangchak API)",
    run: async () => {
      // used as fallback only when PTT values are missing (handled by merge order)
      const o: Values = {};
      const items: any[] = (await json("https://www.bangchak.co.th/api/oilprice"))?.data?.items ?? [];
      for (const it of items) {
        const n = String(it.OilNameEng ?? "").toUpperCase();
        const v = pos(it.PriceToday);
        if (n.includes("GASOHOL 95") && !n.includes("E")) put(o, "gsh95", v);
        else if (n.includes("E20")) put(o, "e20", v);
        else if (/DIESEL$|DIESEL B7/.test(n)) put(o, "diesel", v);
      }
      return o;
    },
  },
  {
    source: "สมาคมค้าทองคำ",
    run: async () => {
      const o: Values = {};
      const g = await json("https://www.goldtraders.or.th/api/GoldPrices/Latest");
      put(o, "gold_bar", pos(g?.bL_SellPrice));
      put(o, "gold_orn", pos(g?.oM965_SellPrice));
      return o;
    },
  },
  {
    // Chao Phraya Dam release (station C.13 ท้ายเขื่อนเจ้าพระยา) only exists in ThaiWater's water-level list.
    source: "ThaiWater (สสน.)",
    run: async () => {
      const URL_TW = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/thailand_main";
      let d: any;
      try { d = await json(URL_TW); }
      catch (e) {
        // Fallback: Firecrawl (real browser, stealth proxy, TH location) — ThaiWater blocks the hosting address.
        const key = process.env["FIRECRAWL_API_KEY"];
        if (!key) throw e;
        const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: URL_TW, formats: ["rawHtml"], onlyMainContent: false, location: { country: "TH" }, proxy: "auto", maxAge: 0, timeout: 120000 }),
        });
        const fc: any = await r.json().catch(() => null);
        if (!r.ok || !fc?.success) throw new Error(`${(e as Error).message} · Firecrawl [${r.status}] ${fc?.error ?? ""}`.slice(0, 280));
        const raw: string = fc.data?.rawHtml ?? "";
        const body = (raw.match(/<pre[^>]*>([\s\S]*)<\/pre>/)?.[1] ?? raw).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
        const st = fc.data?.metadata?.statusCode;
        if (st && st !== 200) throw new Error(`${(e as Error).message} · Firecrawl ก็ถูก ThaiWater จำกัดคำขอ (${st})`);
        d = JSON.parse(body);
      }
      const wl: any[] = d?.waterlevel?.data?.data ?? d?.waterlevel?.data ?? [];
      const c13 = wl.find((x) => String(x?.station?.tele_station_oldcode ?? "").trim() === "C.13");
      const q = pos(c13?.discharge);
      if (q === undefined) throw new Error("ไม่พบค่าระบายน้ำสถานี C.13 ท้ายเขื่อนเจ้าพระยา ในไฟล์");
      const day = String(c13.waterlevel_datetime ?? "").slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(day) ? { values: { cp_dam_q: q }, dates: { cp_dam_q: day } } : { cp_dam_q: q };
    },
  },
  {
    // Dams around Bangkok, from the owning department (RID). Not blocked like ThaiWater.
    source: "RID อ่างเก็บน้ำ (กรมชลประทาน)",
    run: async () => {
      const d = await json("https://app.rid.go.th/reservoir/api/dam/public");
      const dams: any[] = (d?.data ?? []).flatMap((r: any) => r?.dam ?? []);
      const find = (n: string) => dams.find((x) => String(x?.name ?? "").includes(n));
      const pasak = find("ป่าสักชลสิทธิ์"), khundan = find("ขุนด่านปราการชล");
      const o: Values = {};
      put(o, "dam_pasak_pct", pos(pasak?.percent_storage));
      if (Number.isFinite(Number(pasak?.outflow)) && pasak?.outflow != null) o["dam_pasak_out"] = Number(pasak.outflow);
      put(o, "dam_khundan_pct", pos(khundan?.percent_storage));
      if (!Object.keys(o).length) throw new Error("ไม่พบเขื่อนป่าสักชลสิทธิ์/ขุนด่านปราการชล ในไฟล์");
      const day = String(d?.date ?? "");
      return /^\d{4}-\d{2}-\d{2}$/.test(day) ? { values: o, dates: Object.fromEntries(Object.keys(o).map((k) => [k, day])) } : o;
    },
  },
  {
    source: "กรมอุตุฯ เตือนภัย",
    run: async (date) => {
      const xml = await text("https://data.tmd.go.th/api/WeatherWarningNews/v1/?uid=api&ukey=api12345");
      const n = blocks(xml, "WarningNews").filter((b) => field(b, "AnnounceDateTime").startsWith(date)).length;
      return { tmd_warn: n };
    },
  },
  {
    source: "กรมอุตุฯ แผ่นดินไหว",
    run: async (date) => {
      // RSS of TMD seismic bureau; only epicentres inside Thailand (title names a จ. province, not another ประเทศ).
      const { parseQuakeRss } = await import("./quake");
      const qs = parseQuakeRss(await text("https://earthquake.tmd.go.th/feed/rss_tmd.xml"));
      const max = qs.filter((q) => q.inThailand && q.dateBkk === date).reduce((m, q) => Math.max(m, q.magnitude), 0);
      return { quake_th: max };
    },
  },
  {
    // www.tmd.go.th has an incomplete certificate chain (hosting returns 526), so figures come from
    // data.tmd.go.th WeatherForecast7Days — today's กรุงเทพมหานคร row.
    source: "กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล",
    run: async (date) => {
      const { TMD7D_URL, parseTmd7d } = await import("./tmd7d");
      const rows = parseTmd7d(await text(TMD7D_URL), date);
      const bkk = rows.find((r) => r.province === "กรุงเทพมหานคร");
      if (!bkk) throw new Error(`ไม่พบพยากรณ์ กรุงเทพมหานคร ของวันที่ ${date} ในไฟล์ 7 วัน`);
      const o: Values = {};
      put(o, "fc_tmax_bkk", pos(bkk.max));
      put(o, "fc_tmin_bkk", pos(bkk.min));
      return o;
    },
  },
  {
    // Rain = 24-h rainfall of the latest report (dated by the report). Temperature = yesterday's highest
    // 3-hourly reading: a running max per day is kept in app_settings (key tmax3h:YYYY-MM-DD).
    source: "กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)",
    run: async (date, ctx) => {
      const { TMD3H_URL, parseTmd3h } = await import("./tmd3h");
      const r = parseTmd3h(await text(TMD3H_URL));
      if (!r.stationFound) throw new Error(r.stations ? "ไม่พบสถานี 48455 BANGKOK METROPOLIS ในไฟล์" : "กรมอุตุฯ ยังไม่มีรายการสถานีในรอบนี้ (ไฟล์ว่าง)");
      const day = r.date ?? date;
      const values: Values = {}, dates: Record<string, string> = {};
      if (r.rain24 !== undefined && r.rain24 >= 0) { values["rain_bkk"] = r.rain24; dates["rain_bkk"] = day; }
      const admin = ctx?.admin;
      if (admin && r.temp !== undefined) {
        const key = `tmax3h:${day}`;
        const { data: cur } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
        const best = Math.max(r.temp, Number(cur?.value ?? -Infinity));
        if (!cur || best !== Number(cur.value)) await admin.from("app_settings").upsert({ key, value: String(best), updated_at: new Date().toISOString() });
        const { data: y } = await admin.from("app_settings").select("value").eq("key", `tmax3h:${prevDay(day)}`).maybeSingle();
        if (y && Number.isFinite(Number(y.value))) { values["tmax_bkk"] = Number(y.value); dates["tmax_bkk"] = day; }
      }
      if (!Object.keys(values).length) throw new Error("สถานี BANGKOK METROPOLIS ไม่มีค่าฝน และยังไม่มีอุณหภูมิสูงสุดของเมื่อวาน");
      return { values, dates };
    },
  },
  {
    source: "GISTDA PM2.5 (กรุงเทพฯ)",
    run: async () => {
      const d = await json("https://pm25.gistda.or.th/rest/getPm25byProvince");
      const row = (d?.data ?? []).find((x: any) => x?.pv_tn === "กรุงเทพมหานคร");
      if (!row) throw new Error("ไม่พบแถว กรุงเทพมหานคร");
      const o: Values = {};
      put(o, "pm25_bkk", pos(row.pm25Avg24hr ?? row.pm25));
      return o;
    },
  },
  {
    source: "ExchangeRate (อัตราแลกเปลี่ยน)",
    run: async () => {
      const o: Values = {};
      const r = (await json("https://open.er-api.com/v6/latest/USD"))?.rates ?? {};
      const usd = pos(r.THB);
      if (usd) {
        o["usdthb"] = +usd.toFixed(3);
        if (pos(r.EUR)) o["eurthb"] = +(usd / r.EUR).toFixed(3);
        if (pos(r.JPY)) o["jpythb"] = +((100 * usd) / r.JPY).toFixed(3);
      }
      return o;
    },
  },
  {
    source: "Longdo Traffic Index",
    run: async () => {
      const d = await json("https://traffic.longdo.com/api/json/traffic/index");
      const v = Number(d?.index);
      return Number.isFinite(v) ? { traffic_idx: v } : {};
    },
  },
];

/** Runs all connectors; earlier connectors win on conflicts (PTT before Bangchak). */
export async function runConnectors(date: string) {
  const results = await Promise.allSettled(CONNECTORS.map((c) => c.run(date)));
  const values: Values = {};
  const runs = results.map((r, i) => {
    const source = CONNECTORS[i]!.source;
    if (r.status === "fulfilled") {
      const v = normalizeOut(r.value).values;
      for (const [k, x] of Object.entries(v)) if (!(k in values)) values[k] = x;
      return { source, ok: true, rows: Object.keys(v).length, error: null as string | null, ran_at: new Date().toISOString() };
    }
    return { source, ok: false, rows: 0, error: String((r.reason as Error)?.message ?? r.reason).slice(0, 300), ran_at: new Date().toISOString() };
  });
  return { values, runs };
}
