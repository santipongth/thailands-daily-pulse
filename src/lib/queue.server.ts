// Server-only: Postgres-backed worker queue. One job per source; jobs are claimed with
// FOR UPDATE SKIP LOCKED (claim_ingest_job), retried with backoff, and every fetch a job
// makes is kept as raw evidence.

type Run = { source: string; ok: boolean; rows: number; error: string | null; ran_at: string; kind?: string; url?: string; sample?: string | null };
type Result = { values: Record<string, number>; runs: Run[] };
type Ctx = { admin: any; date: string };

const HANDLERS: Record<string, (ctx: Ctx, source: string) => Promise<Result>> = {
  connector: async ({ date }, source) => {
    const { CONNECTORS } = await import("./connectors.server");
    const c = CONNECTORS.find((x) => x.source === source);
    if (!c) throw new Error(`unknown connector ${source}`);
    const ran_at = new Date().toISOString();
    try {
      const values = await c.run(date);
      return { values, runs: [{ source, ok: true, rows: Object.keys(values).length, error: null, ran_at, kind: "api" }] };
    } catch (e) {
      return { values: {}, runs: [{ source, ok: false, rows: 0, error: String((e as Error).message).slice(0, 300), ran_at, kind: "api" }] };
    }
  },
  crawlers: async ({ admin, date }) => runCrawlersSafe(admin, date),
  checkraka: async () => {
    const { runCheckRaka } = await import("./checkraka.server");
    const r = await runCheckRaka();
    return { values: r.values, runs: [r.run] };
  },
  rakakaset: async ({ date }) => {
    const { runRakaKaset } = await import("./rakakaset.server");
    const r = await runRakaKaset(date);
    return { values: r.values, runs: [r.run] };
  },
  catalog: async ({ admin, date }) => {
    const { runCatalog } = await import("./catalog.server");
    return { values: {}, runs: await runCatalog(admin, date) };
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
  news: async ({ admin }) => {
    const { collectNews } = await import("./news.server");
    const news = await collectNews();
    if (news.length) await admin.from("news_items").upsert(news, { onConflict: "link", ignoreDuplicates: true });
    await admin.from("job_locks").upsert({ name: "news_fetched", locked_until: new Date().toISOString() });
    return { values: {}, runs: [] };
  },
};

async function runCrawlersSafe(admin: any, date: string): Promise<Result> {
  const { runCrawlers } = await import("./crawlers.server");
  const r = await runCrawlers(admin, date);
  return { values: r.values, runs: r.runs };
}

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
      const now = new Date().toISOString();
      const rows = Object.entries(res.values).map(([metric_id, value]) => ({ metric_id, value, observed_on: date, is_demo: false, created_at: now }));
      const { error: oe } = await admin.from("observations").upsert(rows, { onConflict: "metric_id,observed_on" });
      if (oe) console.error(oe);
    }
    if (runs.length) {
      const okAt = (r: Run) => ({ ...(r.ok ? { ...r, last_ok_at: r.ran_at } : r), kind: r.kind ?? "api", run_kind: job.run_kind });
      await admin.from("source_runs").upsert(runs.map(okAt), { onConflict: "source" });
      await admin.from("source_run_history").insert(runs.map((r) => ({ source: r.source, ran_at: r.ran_at, ok: r.ok, rows: r.rows, error: r.error, run_kind: job.run_kind })));
    }
    const retry = allFailed && job.attempts < job.max_attempts;
    await admin.from("ingest_jobs").update({
      status: retry ? "queued" : allFailed ? "failed" : "done",
      run_after: retry ? new Date(Date.now() + job.attempts * 20 * 60e3).toISOString() : job.run_after,
      locked_until: null,
      rows: runs.reduce((s, r) => s + (r.rows ?? 0), 0),
      error: err ?? (allFailed ? runs.map((r) => r.error).filter(Boolean).join("; ").slice(0, 300) : null),
      finished_at: retry ? null : new Date().toISOString(),
    }).eq("id", job.id);
  }
  return n;
}
