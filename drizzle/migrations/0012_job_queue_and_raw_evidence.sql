CREATE TABLE public.ingest_jobs (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL,
  source text NOT NULL,
  job_type text NOT NULL,
  run_kind text NOT NULL DEFAULT 'hourly',
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  rows integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX ingest_jobs_due_idx ON public.ingest_jobs (status, run_after);
CREATE INDEX ingest_jobs_batch_idx ON public.ingest_jobs (batch_id);
GRANT SELECT ON public.ingest_jobs TO anon, authenticated;
GRANT ALL ON public.ingest_jobs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ingest_jobs_id_seq TO service_role;
ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.ingest_jobs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.raw_evidence (
  id bigserial PRIMARY KEY,
  job_id bigint REFERENCES public.ingest_jobs(id) ON DELETE SET NULL,
  source text NOT NULL,
  url text NOT NULL,
  http_status integer,
  content_type text,
  bytes integer NOT NULL DEFAULT 0,
  sha256 text NOT NULL,
  storage_path text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX raw_evidence_source_idx ON public.raw_evidence (source, fetched_at DESC);
CREATE INDEX raw_evidence_sha_idx ON public.raw_evidence (sha256);
GRANT SELECT ON public.raw_evidence TO anon, authenticated;
GRANT ALL ON public.raw_evidence TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.raw_evidence_id_seq TO service_role;
ALTER TABLE public.raw_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.raw_evidence FOR SELECT TO anon, authenticated USING (true);

-- Atomically claim the next due job (skip locked rows so parallel workers never take the same job).
CREATE OR REPLACE FUNCTION public.claim_ingest_job()
RETURNS SETOF public.ingest_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ingest_jobs j SET status = 'running', attempts = j.attempts + 1, started_at = now(), locked_until = now() + interval '3 minutes'
  WHERE j.id = (
    SELECT id FROM public.ingest_jobs
    WHERE (status = 'queued' AND run_after <= now()) OR (status = 'running' AND locked_until < now())
    ORDER BY run_after, id LIMIT 1 FOR UPDATE SKIP LOCKED
  )
  RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_ingest_job() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ingest_job() TO service_role;