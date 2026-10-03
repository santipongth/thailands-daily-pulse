CREATE TABLE public.brief_images (id bigserial PRIMARY KEY, brief_date date NOT NULL, slot text NOT NULL, family_id text, storage_path text NOT NULL, prompt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (brief_date, slot));
GRANT SELECT ON public.brief_images TO anon, authenticated;
GRANT ALL ON public.brief_images TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.brief_images_id_seq TO service_role;
ALTER TABLE public.brief_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read brief images" ON public.brief_images FOR SELECT TO anon, authenticated USING (true);