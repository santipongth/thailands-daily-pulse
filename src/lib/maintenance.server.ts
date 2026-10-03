import { causeOf } from "./perf";

/** Retention: queue rows (done/failed) and run history are kept 90 days (also pruned daily in SQL by prune_old_data); raw evidence is never deleted here.
 *  Station snapshots are kept 90 days. Before pruning, per-source daily performance is rolled up (kept forever). */
export async function pruneOldJobs(a: any) {
  await rollupPerf(a).catch((e) => console.error("perf rollup failed", e));
  const cut = new Date(Date.now() - 90 * 86400e3).toISOString();
  // raw_evidence.job_id references ingest_jobs: detach before deleting old jobs (evidence itself is kept).
  await a.from("raw_evidence").update({ job_id: null }).lt("fetched_at", cut).not("job_id", "is", null);
  const { data: jobs } = await a.from("ingest_jobs").delete().in("status", ["done", "failed"]).lt("created_at", cut).select("id");
  const { data: hist } = await a.from("source_run_history").delete().lt("ran_at", cut).select("id");
  await a.from("station_snapshots").delete().lt("received_at", new Date(Date.now() - 90 * 86400e3).toISOString());
  return { jobs: jobs?.length ?? 0, history: hist?.length ?? 0 };
}

const bkkDay = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };

/** Upserts source_perf_daily for the last `days` Bangkok days (runs, ok, failure causes, new raw files, median data age). */
export async function rollupPerf(a: any, days = 3) {
  const since = new Date(Date.now() - days * 86400e3).toISOString();
  const [{ data: runs }, { data: ev }, { data: snaps }] = await Promise.all([
    a.from("source_run_history").select("source,ran_at,ok,error").gte("ran_at", since).limit(20000),
    a.from("raw_evidence").select("source,fetched_at").gte("fetched_at", since).limit(20000),
    a.from("station_snapshots").select("source,observed_at,received_at").gte("received_at", since).not("observed_at", "is", null).limit(20000),
  ]);
  const rows = new Map<string, { source: string; day: string; runs: number; ok: number; causes: Record<string, number>; files_changed: number; ages: number[] }>();
  const get = (source: string, day: string) => {
    const k = `${source}|${day}`;
    if (!rows.has(k)) rows.set(k, { source, day, runs: 0, ok: 0, causes: {}, files_changed: 0, ages: [] });
    return rows.get(k)!;
  };
  for (const r of runs ?? []) { const x = get(r.source, bkkDay(r.ran_at)); x.runs++; if (r.ok) x.ok++; else { const c = causeOf(r.error); x.causes[c] = (x.causes[c] ?? 0) + 1; } }
  for (const e of ev ?? []) get(e.source, bkkDay(e.fetched_at)).files_changed++;
  for (const s of snaps ?? []) get(s.source, bkkDay(s.received_at)).ages.push((Date.parse(s.received_at) - Date.parse(s.observed_at)) / 60e3);
  const out = [...rows.values()].filter((r) => r.runs > 0).map(({ ages, ...r }) => ({ ...r, median_data_age_min: median(ages) === null ? null : Math.round(median(ages)!) }));
  if (out.length) await a.from("source_perf_daily").upsert(out, { onConflict: "source,day" });
  return out.length;
}
