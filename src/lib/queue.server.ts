// Server-only: Postgres-backed worker queue. One job per source; jobs are claimed with
// FOR UPDATE SKIP LOCKED (claim_ingest_job), retried with backoff, and every fetch a job
// makes is kept as raw evidence.
import { politeFetch } from "./http.server";

type Run = { source: string; ok: boolean; rows: number; error: string | null; ran_at: string; kind?: string; url?: string; sample?: string | null };
type Result = { values: Record<string, number>; runs: Run[]; dates?: Record<string, string> | undefined };
type Ctx = { admin: any; date: string };

const HANDLERS: Record<string, (ctx: Ctx, source: string) => Promise<Result>> = {
  connector: async ({ admin, date }, source) => {
    const { CONNECTORS, normalizeOut } = await import("./connectors.server");
    const c = CONNECTORS.find((x) => x.source === source);
    if (!c) throw new Error(`unknown connector ${source}`);
    const ran_at = new Date().toISOString();
    try {
      const { values, dates } = normalizeOut(await c.run(date, { admin }));
      return { values, dates, runs: [{ source, ok: true, rows: Object.keys(values).length, error: null, ran_at, kind: "api" }] };
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
  news: async ({ admin }) => {
    const { collectNews } = await import("./news.server");
    const news = await collectNews();
    if (news.length) await admin.from("news_items").upsert(news, { onConflict: "link", ignoreDuplicates: true });
    await admin.from("job_locks").upsert({ name: "news_fetched", locked_until: new Date().toISOString() });
    return { values: {}, runs: [] };
  },
};


export type JobSpec = { job_type: string; source: string };

/** Queue one job per source for a new batch. */
export async function enqueue(admin: any, specs: JobSpec[], runKind: string) {
  const batch_id = crypto.randomUUID();
  await admin.from("ingest_jobs").insert(specs.map((s) => ({ ...s, batch_id, run_kind: runKind })));
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
    try {
      if (!handler) throw new Error(`unknown job type ${job.job_type}`);
      res = await withEvidence(admin, job.id, job.source, () => handler({ admin, date }, job.source));
    } catch (e) {
      err = String((e as Error).message ?? e).slice(0, 300);
    }
    const runs = res?.runs ?? [];
    const allFailed = !!err || (runs.length > 0 && runs.every((r) => !r.ok));
    if (res && Object.keys(res.values).length) {
      // Four times per value: refers-to (observed_on/period), published (unknown here), received, effective.
      const now = new Date().toISOString();
      const { data: ev } = await admin.from("raw_evidence").select("id").eq("job_id", job.id).order("id", { ascending: false }).limit(1).maybeSingle();
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
    // provider rate-limit (429): retry sooner (15 min) so a pre-05:45 run still has a chance
    const limited = runs.some((r) => r.error?.startsWith("429"));
    const delay = limited ? 15 * 60e3 : job.attempts * 20 * 60e3;
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
