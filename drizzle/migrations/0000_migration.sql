
create table public.families (
  id text primary key, name_th text not null, emoji text not null, description text not null,
  cadence text not null, is_live boolean not null default false, source_name text not null,
  source_url text, sort int not null default 0
);
create table public.metrics (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  name_th text not null, unit text not null default '', kind text not null default 'delta',
  threshold_abs numeric, threshold_pct numeric, bands numeric[], decimals int not null default 2,
  sort int not null default 0
);
create table public.observations (
  id bigserial primary key, metric_id text not null references public.metrics(id) on delete cascade,
  observed_on date not null, value numeric not null, is_demo boolean not null default true,
  created_at timestamptz not null default now(), unique (metric_id, observed_on)
);
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  family_id text not null references public.families(id) on delete cascade,
  metric_id text not null references public.metrics(id) on delete cascade,
  signal_date date not null, severity text not null, title text not null,
  prev_value numeric, new_value numeric not null, change_abs numeric, change_pct numeric,
  is_demo boolean not null default true, created_at timestamptz not null default now(),
  unique (metric_id, signal_date)
);
create table public.daily_briefs (
  brief_date date primary key, body text not null, generated_at timestamptz not null default now()
);
create table public.release_calendar (
  id bigserial primary key, family_id text not null references public.families(id) on delete cascade,
  title text not null, release_date date not null
);
create table public.job_locks (name text primary key, locked_until timestamptz not null);

grant select on public.families, public.metrics, public.observations, public.signals, public.daily_briefs, public.release_calendar to anon, authenticated;
grant all on public.families, public.metrics, public.observations, public.signals, public.daily_briefs, public.release_calendar, public.job_locks to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table public.families enable row level security;
alter table public.metrics enable row level security;
alter table public.observations enable row level security;
alter table public.signals enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.release_calendar enable row level security;
alter table public.job_locks enable row level security;

create policy "public read" on public.families for select to anon, authenticated using (true);
create policy "public read" on public.metrics for select to anon, authenticated using (true);
create policy "public read" on public.observations for select to anon, authenticated using (true);
create policy "public read" on public.signals for select to anon, authenticated using (true);
create policy "public read" on public.daily_briefs for select to anon, authenticated using (true);
create policy "public read" on public.release_calendar for select to anon, authenticated using (true);

create index on public.observations (metric_id, observed_on desc);
create index on public.signals (signal_date desc);

-- Signal detector: compares a day's value to the previous observation per metric rules.
create or replace function public.detect_signals(_d date)
returns int language plpgsql security definer set search_path = public as $$
declare r record; prev numeric; cur numeric; ch numeric; pct numeric; ratio numeric;
  sev text; ttl text; bp int; bc int; n int := 0; dem boolean;
begin
  for r in select m.*, f.name_th as fam from metrics m join families f on f.id = m.family_id loop
    select value, is_demo into cur, dem from observations where metric_id = r.id and observed_on = _d;
    if cur is null then continue; end if;
    select value into prev from observations where metric_id = r.id and observed_on < _d order by observed_on desc limit 1;
    sev := null; ch := null; pct := null;
    if r.kind = 'release' then
      ch := case when prev is null then null else cur - prev end;
      sev := 'medium';
      ttl := format('%s ประกาศใหม่: %s %s', r.name_th, round(cur, r.decimals), r.unit);
    elsif prev is not null then
      ch := cur - prev;
      pct := case when prev = 0 then null else ch / abs(prev) * 100 end;
      if r.kind = 'level' then
        select count(*) into bp from unnest(r.bands) b where prev >= b;
        select count(*) into bc from unnest(r.bands) b where cur >= b;
        if bc <> bp then
          sev := case when bc >= 2 then 'high' when bc > bp then 'medium' else 'low' end;
          ttl := format('%s %s ระดับ: %s → %s %s', r.name_th, case when bc > bp then 'ข้าม' else 'ลดลงต่ำกว่า' end,
                        round(prev, r.decimals), round(cur, r.decimals), r.unit);
        end if;
      else
        ratio := greatest(
          case when r.threshold_abs is not null and r.threshold_abs > 0 then abs(ch) / r.threshold_abs else 0 end,
          case when r.threshold_pct is not null and pct is not null then abs(pct) / r.threshold_pct else 0 end);
        if ratio >= 1 then
          sev := case when ratio >= 3 then 'high' when ratio >= 1.5 then 'medium' else 'low' end;
          ttl := format('%s %s %s → %s %s', r.name_th, case when ch > 0 then 'ขึ้น' else 'ลง' end,
                        round(prev, r.decimals), round(cur, r.decimals), r.unit);
        end if;
      end if;
    end if;
    if sev is not null then
      insert into signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo)
      values (r.family_id, r.id, _d, sev, ttl, prev, cur, ch, pct, dem)
      on conflict (metric_id, signal_date) do update set severity = excluded.severity, title = excluded.title,
        prev_value = excluded.prev_value, new_value = excluded.new_value, change_abs = excluded.change_abs,
        change_pct = excluded.change_pct, is_demo = excluded.is_demo;
      n := n + 1;
    else
      delete from signals where metric_id = r.id and signal_date = _d;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.detect_signals(date) from public, anon, authenticated;
grant execute on function public.detect_signals(date) to service_role;

insert into public.families (id, name_th, emoji, description, cadence, is_live, source_name, source_url, sort) values
('weather','อากาศ','🌧️','ฝน อุณหภูมิ พายุ เตือนภัย','รายวัน',true,'Open-Meteo (พยากรณ์ กทม.)','https://open-meteo.com',1),
('air','PM2.5 / อากาศหายใจ','😷','PM2.5, AQI, พื้นที่เกินเกณฑ์','รายชั่วโมง',true,'Open-Meteo Air Quality (อ้างอิงเกณฑ์กรมควบคุมมลพิษ)','https://air4thai.pcd.go.th',2),
('oil','น้ำมัน/LPG','⛽','แก๊สโซฮอล์ 95, E20, ดีเซล','เมื่อมีประกาศ',true,'ราคาขายปลีก ปตท. (กทม.และปริมณฑล)','https://www.pttor.com',3),
('fx','เงินบาท','💱','USD/THB, EUR/THB, JPY/THB','รายวัน',true,'ExchangeRate-API (อ้างอิง ธปท.ภายหลัง)','https://www.bot.or.th',4),
('gold','ทอง','🪙','ราคาทองคำแท่ง 96.5% (ประมาณจากราคาโลก)','หลายครั้ง/วัน',true,'Gold-API × USD/THB','https://www.goldtraders.or.th',5),
('water','น้ำ/น้ำท่วม','🌊','ระดับเขื่อน ฝนสะสม พื้นที่เสี่ยง','รายวัน',false,'สทนช. / กรมชลประทาน','https://www.thaiwater.net',6),
('food','ของกิน/ค่าครองชีพ','🥬','หมู ไก่ ไข่ ข้าว พริก มะนาว','รายวัน',false,'กรมการค้าภายใน','https://www.dit.go.th',7),
('farm','ราคาเกษตร','🌾','ราคาสุกร ข้าว ปาล์ม มันสำปะหลัง','รายวัน',false,'สำนักงานเศรษฐกิจการเกษตร','https://www.oae.go.th',8),
('rates','ดอกเบี้ย / Bond','🏦','ดอกเบี้ยนโยบาย, พันธบัตร 10 ปี','รายวัน/รอบประชุม',false,'ธนาคารแห่งประเทศไทย / ThaiBMA','https://www.bot.or.th',9),
('stock','ตลาดหุ้น','📈','SET, SET50','รายวัน',false,'ตลาดหลักทรัพย์ฯ','https://www.set.or.th',10),
('power','ค่าไฟ','💡','ค่า Ft รอบใหม่','ราย 4 เดือน',false,'กกพ.','https://www.erc.or.th',11),
('disease','โรคระบาด','🦠','ไข้หวัดใหญ่ ไข้เลือดออก','รายสัปดาห์',false,'กรมควบคุมโรค','https://ddc.moph.go.th',12),
('traffic','การจราจร','🚗','ดัชนีรถติด กทม.','รายวัน',false,'สนข. / Longdo Traffic','https://traffic.longdo.com',13),
('macro','เงินเฟ้อ / GDP / งาน','🇹🇭','CPI, GDP, อัตราว่างงาน','รายเดือน/ไตรมาส',false,'สนค. / สศช. / สสช.','https://www.nesdc.go.th',14),
('lottery','หวยรัฐบาล','🎟️','ผลรางวัลที่ 1','วันที่ 1 และ 16',false,'สำนักงานสลากกินแบ่งรัฐบาล','https://www.glo.or.th',15),
('flood_sat','น้ำท่วมจากดาวเทียม','🛰️','พื้นที่น้ำท่วม (ไร่)','ตามเหตุการณ์',false,'GISTDA','https://flood.gistda.or.th',16);

insert into public.metrics (id, family_id, name_th, unit, kind, threshold_abs, threshold_pct, bands, decimals, sort) values
('rain_bkk','weather','ฝนพรุ่งนี้ กทม.','มม.','level',null,null,'{10,35}',1,1),
('tmax_bkk','weather','อุณหภูมิสูงสุด กทม.','°C','delta',2,null,null,1,2),
('pm25_bkk','air','PM2.5 กรุงเทพฯ','µg/m³','level',null,null,'{37.5,75}',1,1),
('pm25_cnx','air','PM2.5 เชียงใหม่','µg/m³','level',null,null,'{37.5,75}',1,2),
('gsh95','oil','แก๊สโซฮอล์ 95','บาท/ลิตร','delta',0.1,null,null,2,1),
('e20','oil','แก๊สโซฮอล์ E20','บาท/ลิตร','delta',0.1,null,null,2,2),
('diesel','oil','ดีเซล B7','บาท/ลิตร','delta',0.1,null,null,2,3),
('usdthb','fx','USD/THB','บาท','delta',null,0.5,null,2,1),
('eurthb','fx','EUR/THB','บาท','delta',null,0.6,null,2,2),
('jpythb','fx','JPY/THB (100 เยน)','บาท','delta',null,0.6,null,2,3),
('gold_bar','gold','ทองคำแท่ง (บาทละ)','บาท','delta',100,null,null,0,1),
('dam_bhumibol','water','เขื่อนภูมิพล','% ความจุ','delta',2,null,null,1,1),
('pork','food','หมูเนื้อแดง','บาท/กก.','delta',null,3,null,0,1),
('egg','food','ไข่ไก่ เบอร์ 2','บาท/ฟอง','delta',null,3,null,2,2),
('chili','food','พริกขี้หนู','บาท/กก.','delta',null,8,null,0,3),
('lime','food','มะนาว','บาท/ลูก','delta',null,8,null,2,4),
('hog_farm','farm','สุกรมีชีวิต','บาท/กก.','delta',null,3,null,0,1),
('rice_farm','farm','ข้าวเปลือกเจ้า','บาท/ตัน','delta',null,3,null,0,2),
('palm','farm','ปาล์มน้ำมัน','บาท/กก.','delta',null,4,null,2,3),
('policy_rate','rates','ดอกเบี้ยนโยบาย','%','delta',0.1,null,null,2,1),
('bond10y','rates','พันธบัตร 10 ปี','%','delta',0.08,null,null,2,2),
('set','stock','SET Index','จุด','delta',null,1.5,null,2,1),
('ft','power','ค่า Ft','สต./หน่วย','release',null,null,null,2,1),
('dengue','disease','ผู้ป่วยไข้เลือดออก (สัปดาห์)','ราย','delta',null,15,null,0,1),
('traffic_idx','traffic','ดัชนีรถติด กทม.','จาก 10','delta',1.5,null,null,1,1),
('cpi','macro','เงินเฟ้อทั่วไป (YoY)','%','release',null,null,null,2,1),
('gdp','macro','GDP (YoY)','%','release',null,null,null,1,2),
('unemp','macro','อัตราว่างงาน','%','release',null,null,null,2,3),
('lotto','lottery','รางวัลที่ 1','','release',null,null,null,0,1),
('flood_area','flood_sat','พื้นที่น้ำท่วม','ไร่','delta',null,20,null,0,1);

-- 30 days of demo history. Values are deterministic illustrative series.
with today as (select (now() at time zone 'Asia/Bangkok')::date as t),
spec(metric_id, base, amp, freq, phase, step) as (values
 ('rain_bkk',14,14,0.9,0.3,0.1),('tmax_bkk',33.5,1.6,0.7,1.1,0.1),
 ('pm25_bkk',24,16,0.45,2.0,0.1),('pm25_cnx',20,12,0.38,0.5,0.1),
 ('gsh95',39.6,0.6,0.22,0.4,0.3),('e20',34.6,0.6,0.22,0.4,0.3),('diesel',41.0,0.6,0.18,1.3,0.3),
 ('usdthb',33.2,0.35,0.5,0.2,0.01),('eurthb',38.9,0.45,0.45,1.2,0.01),('jpythb',22.6,0.3,0.4,2.2,0.01),
 ('gold_bar',53600,700,0.55,0.8,50),('dam_bhumibol',62,6,0.08,0.1,0.1),
 ('pork',178,9,0.3,0.6,5),('egg',4.0,0.25,0.25,1.4,0.1),('chili',95,25,0.35,2.4,5),('lime',3.0,0.8,0.3,0.9,0.25),
 ('hog_farm',72,4,0.28,0.2,1),('rice_farm',9800,350,0.2,1.7,50),('palm',5.4,0.4,0.33,0.3,0.05),
 ('bond10y',2.35,0.12,0.42,0.7,0.01),('set',1385,30,0.6,1.0,0.01),
 ('dengue',820,220,0.5,0.4,1),('traffic_idx',6.2,1.6,1.1,0.2,0.1),('flood_area',42000,15000,0.25,1.0,500))
insert into public.observations (metric_id, observed_on, value, is_demo)
select s.metric_id, t - d, round((s.base + s.amp * sin(d * s.freq + s.phase)) / s.step) * s.step, true
from spec s, today, generate_series(0, 29) d
where not (s.metric_id = 'dengue' and d % 7 <> 0);

with today as (select (now() at time zone 'Asia/Bangkok')::date as t)
insert into public.observations (metric_id, observed_on, value, is_demo)
select 'policy_rate', t - d, case when d > 12 then 1.75 else 1.50 end, true from today, generate_series(0,29) d
union all select 'ft', t - 40, 39.72, true from today
union all select 'ft', t - 2, 36.72, true from today
union all select 'cpi', t - 35, 0.42, true from today
union all select 'cpi', t - 5, 0.81, true from today
union all select 'gdp', t - 48, 2.8, true from today
union all select 'unemp', t - 20, 0.89, true from today
union all select 'lotto', t - 15, 482917, true from today
union all select 'lotto', t, 715304, true from today;

do $$ declare d int; t date := (now() at time zone 'Asia/Bangkok')::date; begin
  for d in reverse 29..0 loop perform public.detect_signals(t - d); end loop;
end $$;

with today as (select (now() at time zone 'Asia/Bangkok')::date as t)
insert into public.release_calendar (family_id, title, release_date)
select 'macro','เงินเฟ้อ CPI เดือนล่าสุด (สนค.)', t + 4 from today
union all select 'oil','ราคาน้ำมันอาจปรับ (คาดการณ์)', t + 1 from today
union all select 'macro','GDP ไตรมาสล่าสุด (สศช.)', t + 47 from today
union all select 'rates','ประชุม กนง.', t + 13 from today
union all select 'lottery','ประกาศผลสลากกินแบ่งรัฐบาล', t + 15 from today
union all select 'macro','อัตราว่างงาน (สสช.)', t + 9 from today;
