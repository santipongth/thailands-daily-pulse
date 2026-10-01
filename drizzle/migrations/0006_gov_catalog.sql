CREATE TABLE public.gov_datasets (
  id text PRIMARY KEY,
  agency text NOT NULL,
  org text,
  title text NOT NULL,
  url text NOT NULL,
  first_seen date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date
);
GRANT SELECT ON public.gov_datasets TO anon, authenticated;
GRANT ALL ON public.gov_datasets TO service_role;
ALTER TABLE public.gov_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.gov_datasets FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.gov_snapshots (
  dataset_id text NOT NULL REFERENCES public.gov_datasets(id) ON DELETE CASCADE,
  snap_date date NOT NULL,
  metadata_modified text,
  resource_hash text,
  row_count integer,
  numeric_total numeric,
  csv_url text,
  PRIMARY KEY (dataset_id, snap_date)
);
GRANT SELECT ON public.gov_snapshots TO anon, authenticated;
GRANT ALL ON public.gov_snapshots TO service_role;
ALTER TABLE public.gov_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.gov_snapshots FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.gov_changes (
  id bigserial PRIMARY KEY,
  dataset_id text NOT NULL REFERENCES public.gov_datasets(id) ON DELETE CASCADE,
  agency text NOT NULL,
  change_date date NOT NULL,
  kind text NOT NULL,
  before_text text,
  after_text text,
  reason_th text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, change_date)
);
GRANT SELECT ON public.gov_changes TO anon, authenticated;
GRANT ALL ON public.gov_changes TO service_role;
GRANT USAGE ON SEQUENCE public.gov_changes_id_seq TO service_role;
ALTER TABLE public.gov_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.gov_changes FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.families (id, name_th, emoji, description, cadence, is_live, source_name, source_url, sort) VALUES
 ('govdata','ข้อมูลเปิดภาครัฐ','📂','ชุดข้อมูลทางการจากศูนย์ข้อมูลภาครัฐ เทียบกับเมื่อวานทุกวัน','รายวัน',true,'ศูนย์กลางข้อมูลเปิดภาครัฐ (gdcatalog.go.th)','https://gdcatalog.go.th',98)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.metrics (id, family_id, name_th, unit, kind, decimals, sort) VALUES
 ('cat_dld','govdata','ชุดข้อมูลเปลี่ยน กรมปศุสัตว์','ชุด','delta',0,1),
 ('cat_md','govdata','ชุดข้อมูลเปลี่ยน กรมเจ้าท่า','ชุด','delta',0,2),
 ('cat_bma','govdata','ชุดข้อมูลเปลี่ยน กรุงเทพมหานคร','ชุด','delta',0,3),
 ('cat_pao','govdata','ชุดข้อมูลเปลี่ยน อบจ./ท้องถิ่น','ชุด','delta',0,4),
 ('cat_ddc','govdata','ชุดข้อมูลเปลี่ยน กรมควบคุมโรค','ชุด','delta',0,5),
 ('cat_dlt','govdata','ชุดข้อมูลเปลี่ยน กรมการขนส่งทางบก','ชุด','delta',0,6)
ON CONFLICT (id) DO NOTHING;