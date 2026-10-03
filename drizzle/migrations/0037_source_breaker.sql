CREATE TABLE public.source_breaker (
  source text PRIMARY KEY,
  fail_streak integer NOT NULL DEFAULT 0,
  open_until timestamptz,
  probe boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.source_breaker TO authenticated;
GRANT ALL ON public.source_breaker TO service_role;
ALTER TABLE public.source_breaker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read breaker" ON public.source_breaker FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));