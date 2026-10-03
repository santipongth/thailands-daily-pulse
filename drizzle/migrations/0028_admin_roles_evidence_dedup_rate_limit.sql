CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Raw evidence: an identical re-fetch of the same URL updates the latest row instead of adding a new one.
ALTER TABLE public.raw_evidence ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.raw_evidence ADD COLUMN IF NOT EXISTS seen_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.raw_evidence ADD COLUMN IF NOT EXISTS last_job_id bigint;
CREATE INDEX IF NOT EXISTS raw_evidence_url_fetched_idx ON public.raw_evidence (url, fetched_at DESC);
CREATE INDEX IF NOT EXISTS raw_evidence_last_job_idx ON public.raw_evidence (last_job_id);

-- Public API rate limit buckets (per IP hash per minute), server-only.
CREATE TABLE public.api_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket text, _limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; w timestamptz := date_trunc('minute', now());
BEGIN
  INSERT INTO api_rate_limits(bucket, window_start, hits) VALUES (_bucket, w, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = api_rate_limits.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN DELETE FROM api_rate_limits WHERE window_start < now() - interval '10 minutes'; END IF;
  RETURN n <= _limit;
END $$;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer) TO service_role;

COMMENT ON TABLE public.gov_datasets IS 'DEPRECATED: GDCatalog tracking removed; unused.';
COMMENT ON TABLE public.gov_snapshots IS 'DEPRECATED: GDCatalog tracking removed; unused.';
COMMENT ON TABLE public.gov_changes IS 'DEPRECATED: GDCatalog tracking removed; unused.';