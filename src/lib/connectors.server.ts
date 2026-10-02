// Server-only: one connector per real data source. Each returns { metric_id: value }.

type Values = Record<string, number>;
export type Connector = { source: string; run: (date: string) => Promise<Values> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Polite fetch: on 429 waits Retry-After (capped 20s; default 5s then 15s), max 3 tries. */
async function get(url: string, ms = 12000) {
  const waits = [5000, 15000];
  for (let i = 0; ; i++) {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 ThailandDailySignals", accept: "application/json, text/xml, */*" },
      signal: AbortSignal.timeout(ms),
    });
    if (res.ok) return res;
    if (res.status === 429 && i < waits.length) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 20000) : waits[i]!);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}
const json = async (url: string) => (await get(url)).json() as Promise<any>;
const text = async (url: string) => (await get(url)).text();
const pos = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const put = (o: Values, k: string, v: number | undefined) => {
  if (v !== undefined) o[k] = v;
};
const blocks = (xml: string, tag: string) => xml.split(`<${tag}>`).slice(1).map((b) => b.split(`</${tag}>`)[0] ?? "");
const field = (b: string, tag: string) => b.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1] ?? "";

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
    source: "ThaiWater (สสน.)",
    run: async () => {
      const o: Values = {};
      const d = await json("https://api-v3.thaiwater.net/api/v1/thaiwater30/public/thailand_main");
      const dams: any[] = d?.dam?.data?.data ?? [];
      let st = 0, cap = 0;
      for (const x of dams) {
        const s = Number(x.dam_storage), m = Number(x.dam?.max_storage);
        if (Number.isFinite(s) && m > 0) { st += s; cap += m; }
        if (x.dam?.dam_name?.th === "ภูมิพล") put(o, "dam_bhumibol", pos(x.dam_storage_percent));
      }
      if (cap > 0) o["dam_total"] = +((st / cap) * 100).toFixed(2);
      return o;
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
      const xml = await text("https://data.tmd.go.th/api/DailySeismicEvent/v1/?uid=api&ukey=api12345");
      let max = 0;
      for (const b of blocks(xml, "DailyEarthquakes")) {
        const lat = Number(field(b, "Latitude")), lon = Number(field(b, "Longitude")), mag = Number(field(b, "Magnitude"));
        if (!field(b, "DateTimeThai").startsWith(date)) continue;
        if (lat >= 4 && lat <= 22 && lon >= 96 && lon <= 107 && mag > max) max = mag;
      }
      return { quake_max: max };
    },
  },
  {
    source: "Open-Meteo (อากาศ/PM2.5)",
    run: async () => {
      const o: Values = {};
      // one multi-location request for both cities (2 requests per run instead of 3)
      const aq = await json("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.75,18.79&longitude=100.5,98.98&current=pm2_5");
      const w = await json("https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5&daily=precipitation_sum,temperature_2m_max&timezone=Asia/Bangkok&forecast_days=2");
      put(o, "pm25_bkk", pos(aq?.[0]?.current?.pm2_5));
      put(o, "pm25_cnx", pos(aq?.[1]?.current?.pm2_5));
      const rain = Number(w?.daily?.precipitation_sum?.[1]);
      if (Number.isFinite(rain)) o["rain_bkk"] = rain;
      put(o, "tmax_bkk", pos(w?.daily?.temperature_2m_max?.[0]));
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
      for (const [k, v] of Object.entries(r.value)) if (!(k in values)) values[k] = v;
      return { source, ok: true, rows: Object.keys(r.value).length, error: null as string | null, ran_at: new Date().toISOString() };
    }
    return { source, ok: false, rows: 0, error: String((r.reason as Error)?.message ?? r.reason).slice(0, 300), ran_at: new Date().toISOString() };
  });
  return { values, runs };
}
