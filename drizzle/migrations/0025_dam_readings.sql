CREATE TABLE public.dam_readings (id bigserial PRIMARY KEY, metric_id text NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE, value numeric NOT NULL, observed_on date NOT NULL, read_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX dam_readings_read_at ON public.dam_readings (read_at DESC);
GRANT SELECT ON public.dam_readings TO anon, authenticated;
GRANT ALL ON public.dam_readings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.dam_readings_id_seq TO service_role;
ALTER TABLE public.dam_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read dam readings" ON public.dam_readings FOR SELECT TO anon, authenticated USING (true);