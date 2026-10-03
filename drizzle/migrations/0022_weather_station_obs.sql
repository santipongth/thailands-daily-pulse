CREATE TABLE public.weather_station_obs (
  id bigserial PRIMARY KEY,
  station_id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('3h','7d')),
  obs_date date NOT NULL,
  obs_time text,
  temp numeric,
  tmin numeric,
  rain24 numeric,
  rain_pct numeric,
  descr text,
  dist_km numeric,
  source_url text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, obs_date, kind)
);
GRANT SELECT ON public.weather_station_obs TO anon, authenticated;
GRANT ALL ON public.weather_station_obs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.weather_station_obs_id_seq TO service_role;
ALTER TABLE public.weather_station_obs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.weather_station_obs FOR SELECT TO anon, authenticated USING (true);