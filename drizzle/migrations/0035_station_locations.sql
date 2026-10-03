CREATE TABLE public.station_locations (
  source text NOT NULL,
  station_id text NOT NULL,
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  method text NOT NULL DEFAULT 'source' CHECK (method IN ('source','geocoded')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, station_id)
);
GRANT SELECT ON public.station_locations TO anon, authenticated;
GRANT ALL ON public.station_locations TO service_role;
ALTER TABLE public.station_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read station locations" ON public.station_locations FOR SELECT TO anon, authenticated USING (true);