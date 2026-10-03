// Server-only: Postgres-backed worker queue. One job per source; jobs are claimed with
// FOR UPDATE SKIP LOCKED (claim_ingest_job), retried with backoff, and every fetch a job
// makes is kept as raw evidence.
import { politeFetch } from "./http.server";

type Run = { source: string; ok: boolean; rows: number; error: string | null; ran_at: string; kind?: string; url?: string; sample?: string | null };
type Result = { values: Record<string, number>; runs: Run[]; dates?: Record<string, string> | undefined; snaps?: import("./connectors.server").Snap[] | undefined };
type Ctx = { admin: any; date: string };

/** Station/road rows for the public tables, linked to the newest raw file of that source. */
async function saveSnapshots(admin: any, jobId: number, source: string, rows: import("./connectors.server").Snap[]) {
  const { data: ev } = await admin.from("raw_evidence").select("id").or(`job_id.eq.${jobId},last_job_id.eq.${jobId}`).order("id", { ascending: false }).limit(1).maybeSingle();
  const received_at = new Date().toISOString();
  const { error } = await admin.from("station_snapshots").insert(rows.map((r) => ({ ...r, source, evidence_id: ev?.id ?? null, received_at })));
  if (error) console.error("station_snapshots insert failed", error.message);
  // Remember each station's own coordinates so the map keeps its pins when a later fetch has none.
  const locs = rows.filter((r) => r.lat != null && r.lng != null).map((r) => ({ source, station_id: r.station_id, name: r.name, lat: r.lat, lng: r.lng, method: "source", updated_at: received_at }));
  if (locs.length) {
    const { error: le } = await admin.from("station_locations").upsert(locs, { onConflict: "source,station_id" });
    if (le) console.error("station_locations upsert failed", le.message);
  }
  if (source === BMA_SOURCE) await geocodeBma(admin, rows).catch((e) => console.error("bma geocode failed", e));
}

const BMA_SOURCE = "กทม. ระบายน้ำ (น้ำท่วมถนน)";
/** New BMA road sensors (no coordinates from the source) → OpenStreetMap lookup, max 20 per run, stored as approximate. */
async function geocodeBma(admin: any, rows: import("./connectors.server").Snap[]) {
  const { data: known } = await admin.from("station_locations").select("station_id").eq("source", BMA_SOURCE);
  const tried = new Set((known ?? []).map((k: any) => k.station_id));
  const { data: miss } = await admin.from("app_settings").select("value").eq("key", "bma_geocode_miss").maybeSingle();
  const missed = new Set<string>(JSON.parse(miss?.value ?? "[]"));
  const todo = rows.filter((r) => !tried.has(r.station_id) && !missed.has(r.station_id)).slice(0, 20);
  const { bmaGeoQueries } = await import("./bkk-geo");
  for (const r of todo) {
    let hit: any = null;
    for (const q of bmaGeoQueries(r.name, r.area ?? "")) {
      const u = `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&countrycodes=th&viewbox=100.32,14.0,100.95,13.49&q=${encodeURIComponent(q)}`;
      const res = await fetch(u, { headers: { "user-agent": "ThailandDailySignals/1.0 (flood map)" } });
      await new Promise((ok) => setTimeout(ok, 1100));
      hit = res.ok ? (await res.json())[0] : null;
      if (hit) break;
    }
    if (hit) await admin.from("station_locations").upsert({ source: BMA_SOURCE, station_id: r.station_id, name: r.name, lat: Number(hit.lat), lng: Number(hit.lon), method: "geocoded" }, { onConflict: "source,station_id" });
    else missed.add(r.station_id);
  }
  if (todo.length) await admin.from("app_settings").upsert({ key: "bma_geocode_miss", value: JSON.stringify([...missed]), updated_at: new Date().toISOString() }, { onConflict: "key" });
}

const HANDLERS: Record<string, (ctx: Ctx, source: string) => Promise<Result>> = {
  connector: async ({ admin, date }, source) => {
    const { CONNECTORS, normalizeOut } = await import("./connectors.server");
    const c = CONNECTORS.find((x) => x.source === source);
    if (!c) throw new Error(`unknown connector ${source}`);
    const ran_at = new Date().toISOString();
    try {
      const { values, dates, note, sample, rows } = normalizeOut(await c.run(date, { admin }));
      return { values, dates, snaps: rows, runs: [{ source, ok: true, rows: Object.keys(values).length, error: note ?? null, ran_at, kind: "api", sample: sample ?? null }] };
    } catch (e) {
      return { values: {}, runs: [{ source, ok: false, rows: 0, error: String((e as Error).message).slice(0, 300), ran_at, kind: "api" }] };
    }
  },
  checkraka: async () => {
    const { runCheckRaka } = await import("./checkraka.server");
    const r = await runCheckRaka();
    return { values: r.values, runs: [r.run] };
  },
  rakakaset: async ({ date }) => {
    const { runRakaKaset } = await import("./rakakaset.server");
    const r = await runRakaKaset(date);
    return { values: r.values, dates: r.dates, runs: [r.run] };
  },
  lottery: async ({ admin }) => {
    const ran_at = new Date().toISOString();
    const base = { source: "สำนักงานสลากกินแบ่งรัฐบาล (GLO)", kind: "api", url: "https://www.glo.or.th/api/lottery/getLatestLottery", ran_at };
    try {
      const { syncLottery } = await import("./glo.server");
      const r = await syncLottery(admin);
      return { values: {}, runs: [{ ...base, ok: true, rows: 1, error: null, sample: `งวด ${r.date} รางวัลที่ 1 ${r.first}${r.verified ? " (ยืนยันแล้ว)" : " (รอยืนยัน)"}` }] };
    } catch (e) {
      return { values: {}, runs: [{ ...base, ok: false, rows: 0, error: String((e as Error).message).slice(0, 200) }] };
    }
  },
  holidays: async ({ admin }) => {
    const { data: s } = await admin.from("app_settings").select("value").eq("key", "holiday_url").maybeSingle();
    const url = s?.value ?? "https://calendar.kapook.com/2569/holiday";
    const base = { source: "Kapook ปฏิทินวันหยุด", kind: "crawler", url, ran_at: new Date().toISOString() };
    try {
      const { parseKapook } = await import("./kapook");
      const res = await politeFetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const rows = parseKapook(await res.text());
      if (!rows.length) throw new Error("ไม่พบรายการวันหยุดในหน้า (รูปแบบหน้าอาจเปลี่ยน)");
      const { error } = await admin.from("holidays").upsert(rows.map((r) => ({ ...r, source: "kapook", source_url: url, delete_hash: "" })), { onConflict: "holiday_date,name" });
      if (error) throw new Error(error.message);
      return { values: {}, runs: [{ ...base, ok: true, rows: rows.length, error: null, sample: rows.slice(0, 2).map((r) => `${r.holiday_date} ${r.name}`).join(" · ") }] };
    } catch (e) {
      return { values: {}, runs: [{ ...base, ok: false, rows: 0, error: String((e as Error).message).slice(0, 200) }] };
    }
  },
  rdtax: async ({ admin, date }) => {
    const { RD_TAX_URL, parseRdTax } = await import("./rdtax");
    const base = { source: "กรมสรรพากร (ปฏิทินภาษี)", kind: "crawler", url: RD_TAX_URL, ran_at: new Date().toISOString() };
    try {
      const res = await politeFetch(RD_TAX_URL);
      if (!res.ok) throw new Error(`${res.status} ${RD_TAX_URL}`);
      const rows = parseRdTax(await res.text(), date);
      if (!rows.length) throw new Error("ไม่พบกำหนดยื่นภาษีในหน้า (รูปแบบหน้าอาจเปลี่ยน)");
      const now = new Date().toISOString();
      const { error } = await admin.from("tax_deadlines").upsert(rows.map((r) => ({ ...r, source_url: RD_TAX_URL, fetched_at: now })), { onConflict: "due_date,channel" });
      if (error) throw new Error(error.message);
      return { values: {}, runs: [{ ...base, ok: true, rows: rows.length, error: null, sample: rows.slice(0, 2).map((r) => `${r.due_date} ${r.items[0]}`).join(" · ") }] };
    } catch (e) {
      return { values: {}, runs: [{ ...base, ok: false, rows: 0, error: String((e as Error).message).slice(0, 200) }] };
    }
  },
  rail: async ({ admin }) => {
    const { refreshRail } = await import("./rail.server");
    const r = await refreshRail(admin);
    return { values: r.values, dates: r.dates, runs: [r.run] };
  },
  // FM91 writes its own source_runs/history; used by "ดึงตอนนี้" and admin-set schedules.
  social: async () => {
    const { refreshSocial } = await import("./fm91.server");
    await refreshSocial();
    return { values: {}, runs: [] };
  },
  news_general: async ({ admin }) => {
    const { collectGeneralNews, GENERAL_FEEDS, GENERAL_SOURCE } = await import("./news.server");
    const ran_at = new Date().toISOString();
    const base = { source: GENERAL_SOURCE, kind: "rss", url: GENERAL_FEEDS.map((f) => f.url).join(" , "), ran_at };
    const { rows, errs, per } = await collectGeneralNews();
    if (rows.length) {
      const { error } = await admin.from("news_items").upsert(rows, { onConflict: "link", ignoreDuplicates: true });
      if (error) errs.push(error.message);
    }
    const ok = rows.length > 0;
    return { values: {}, runs: [{ ...base, ok, rows: rows.length, error: errs.length ? errs.join(" · ").slice(0, 300) : null, sample: ok ? `อ่านข่าว ${rows.length} รายการ (${per.join(", ")})` : null }] };
  },
  news: async ({ admin }) => {
    const { collectNews } = await import("./news.server");
    const news = await collectNews();
    if (news.length) await admin.from("news_items").upsert(news, { onConflict: "link", ignoreDuplicates: true });
    await admin.from("job_locks").upsert({ name: "news_fetched", locked_until: new Date().toISOString() });
    return { values: {}, runs: [] };
  },
};


export type JobSpec = { job_type: string; source: string; max_attempts?: number };

/** Queue one job per source for a new batch. */
export async function enqueue(admin: any, specs: JobSpec[], runKind: string) {
  const batch_id = crypto.randomUUID();
  // Every row carries max_attempts: PostgREST bulk insert fills missing keys with NULL (NOT NULL column → whole batch rejected).
  const { error } = await admin.from("ingest_jobs").insert(specs.map((s) => ({ job_type: s.job_type, source: s.source, max_attempts: s.max_attempts ?? 3, batch_id, run_kind: runKind })));
  if (error) console.error("enqueue failed", error);
  return batch_id;
}

/** Processes due jobs one at a time until the queue is empty or the time budget is spent. Returns processed count. */
export async function drain(admin: any, date: string, budgetMs = 240e3, maxJobs = 40): Promise<number> {
  const { withEvidence } = await import("./evidence.server");
  const start = Date.now();
  let n = 0;
  while (n < maxJobs && Date.now() - start < budgetMs) {
    const { data: claimed, error } = await admin.rpc("claim_ingest_job");
    if (error) { console.error("claim failed", error); break; }
    const job = claimed?.[0];
    if (!job) break;
    n++;
    const handler = HANDLERS[job.job_type];
    let res: Result | null = null;
    let err: string | null = null;
    const { data: cfg } = await admin.from("source_config").select("fetch_mode,retry_delay_min").eq("source", job.source).maybeSingle();
    const { setRequestMode } = await import("./http.server");
    setRequestMode(cfg?.fetch_mode && cfg.fetch_mode !== "default" ? cfg.fetch_mode : null, !/^(Longdo|ThaiWater)/.test(job.source));
    try {
      if (!handler) throw new Error(`unknown job type ${job.job_type}`);
      res = await withEvidence(admin, job.id, job.source, () => handler({ admin, date }, job.source));
    } catch (e) {
      err = String((e as Error).message ?? e).slice(0, 300);
    } finally {
      setRequestMode(null, false);
    }
    const runs = res?.runs ?? [];
    if (res?.snaps?.length) await saveSnapshots(admin, job.id, job.source, res.snaps);
    const allFailed = !!err || (runs.length > 0 && runs.every((r) => !r.ok));
    if (res && Object.keys(res.values).length) {
      // Four times per value: refers-to (observed_on/period), published (unknown here), received, effective.
      const now = new Date().toISOString();
      const { data: ev } = await admin.from("raw_evidence").select("id").or(`job_id.eq.${job.id},last_job_id.eq.${job.id}`).order("id", { ascending: false }).limit(1).maybeSingle();
      const rows = Object.entries(res.values).map(([metric_id, value]) => {
        const d = res!.dates?.[metric_id] ?? date;
        return { metric_id, value, observed_on: d, period_start: d, period_end: d, effective_from: d, is_demo: false, received_at: now, created_at: now, evidence_id: ev?.id ?? null };
      });
      // Re-fetching an unchanged value keeps the original received time (replay stays honest).
      const { data: existing } = await admin.from("observations").select("metric_id,observed_on,value,is_demo").in("metric_id", rows.map((r) => r.metric_id)).in("observed_on", [...new Set(rows.map((r) => r.observed_on))]);
      const same = new Set((existing ?? []).filter((e: any) => !e.is_demo).map((e: any) => `${e.metric_id}|${e.observed_on}|${Number(e.value)}`));
      const changed = rows.filter((r) => !same.has(`${r.metric_id}|${r.observed_on}|${Number(r.value)}`));
      if (changed.length) {
        const { error: oe } = await admin.from("observations").upsert(changed, { onConflict: "metric_id,observed_on" });
        if (oe) console.error(oe);
      }
    }
    if (runs.length) {
      const okAt = (r: Run) => ({ ...(r.ok ? { ...r, last_ok_at: r.ran_at } : r), kind: r.kind ?? "api", run_kind: job.run_kind });
      await admin.from("source_runs").upsert(runs.map(okAt), { onConflict: "source" });
      await admin.from("source_run_history").insert(runs.map((r) => ({ source: r.source, ran_at: r.ran_at, ok: r.ok, rows: r.rows, error: r.error, run_kind: job.run_kind })));
    }
    const retry = allFailed && job.attempts < job.max_attempts;
    // Circuit breaker counts finished rounds (not each retry); TMD mid-write files don't count as failures.
    const midWriteOnly = runs.length > 0 && runs.every((r) => r.ok || r.error?.includes("ใช้ค่ารอบก่อน"));
    if (!retry) await import("./breaker.server").then((b) => b.recordBreaker(admin, job.source, allFailed && !midWriteOnly)).catch((e) => console.error("breaker", e));
    // provider rate-limit (429): retry sooner (15 min) so a pre-05:45 run still has a chance
    const limited = runs.some((r) => r.error?.startsWith("429"));
    // TMD mid-write file (empty/partial): the next complete file is usually ready within minutes
    const midWrite = runs.some((r) => r.error?.includes("ใช้ค่ารอบก่อน"));
    const delay = cfg?.retry_delay_min && !limited ? cfg.retry_delay_min * 60e3 : limited ? 15 * 60e3 : midWrite ? job.attempts * 5 * 60e3 : job.attempts * 20 * 60e3;
    await admin.from("ingest_jobs").update({
      status: retry ? "queued" : allFailed ? "failed" : "done",
      run_after: retry ? new Date(Date.now() + delay).toISOString() : job.run_after,
      locked_until: null,
      rows: runs.reduce((s, r) => s + (r.rows ?? 0), 0),
      error: err ?? (allFailed ? runs.map((r) => r.error).filter(Boolean).join("; ").slice(0, 300) : null),
      finished_at: retry ? null : new Date().toISOString(),
    }).eq("id", job.id);
  }
  return n;
}
