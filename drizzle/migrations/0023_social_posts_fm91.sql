CREATE TABLE public.social_posts (
  id bigserial PRIMARY KEY,
  post_id text NOT NULL UNIQUE,
  source text NOT NULL,
  posted_at timestamptz NOT NULL,
  text text NOT NULL,
  url text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  is_bkk boolean,
  area text,
  summary text,
  ai_reason text,
  evidence_id bigint REFERENCES public.raw_evidence(id) ON DELETE SET NULL
);
GRANT SELECT ON public.social_posts TO anon, authenticated;
GRANT ALL ON public.social_posts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.social_posts_id_seq TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read social" ON public.social_posts FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX social_posts_posted_idx ON public.social_posts (posted_at DESC);
INSERT INTO public.source_registry (source, owner, channel, licence, cadence, unit, area, stale_after_days, url, sort)
VALUES ('FM91 Trafficpro (X)', 'สวพ.FM91', 'Social Media (X ผ่าน Firecrawl) + AI คัดกรอง', 'ไม่ระบุ', 'ทุก 30 นาที', 'โพสต์', 'กรุงเทพฯ และปริมณฑล', 1, 'https://x.com/fm91trafficpro', 18)
ON CONFLICT (source) DO NOTHING;