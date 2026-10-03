/** Retention: queue rows (done/failed) and run history are kept 30 days; raw evidence is never deleted here. */
export async function pruneOldJobs(a: any) {
  const cut = new Date(Date.now() - 30 * 86400e3).toISOString();
  // raw_evidence.job_id references ingest_jobs: detach before deleting old jobs (evidence itself is kept).
  await a.from("raw_evidence").update({ job_id: null }).lt("fetched_at", cut).not("job_id", "is", null);
  const { data: jobs } = await a.from("ingest_jobs").delete().in("status", ["done", "failed"]).lt("created_at", cut).select("id");
  const { data: hist } = await a.from("source_run_history").delete().lt("ran_at", cut).select("id");
  return { jobs: jobs?.length ?? 0, history: hist?.length ?? 0 };
}
