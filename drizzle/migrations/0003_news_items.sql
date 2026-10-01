create table public.news_items (
  id bigserial primary key,
  source text not null,
  title text not null,
  link text not null unique,
  published_at timestamptz not null,
  agency text,
  family_id text references public.families(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.news_items to anon, authenticated;
grant all on public.news_items to service_role;
grant usage, select on sequence public.news_items_id_seq to service_role;
alter table public.news_items enable row level security;
create policy "public read" on public.news_items for select to anon, authenticated using (true);
create index on public.news_items (published_at desc);
create index on public.news_items (family_id, published_at desc);