ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'tagged';
CREATE INDEX IF NOT EXISTS news_items_kind_pub_idx ON public.news_items (kind, published_at DESC);