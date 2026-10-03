// Daily Brief front page: Thai-tabloid-inspired infographic (own design). All numbers from brief items / real rows; images are AI illustrations, labelled.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getBriefImages } from "@/lib/brief-images.functions";
import { thaiDate } from "@/lib/signals";
import type { BriefItem } from "@/components/brief-items";

const fmt = (v: number, d = 2) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });

function useFrontData(date: string) {
  const imgs = useServerFn(getBriefImages);
  return useQuery({
    queryKey: ["frontpage", date],
    queryFn: async () => {
      const end = `${date}T23:59:59+07:00`;
      const [f, obs, post, lot, images] = await Promise.all([
        supabase.from("families").select("id,name_th,emoji"),
        supabase.from("observations").select("metric_id,value,observed_on").in("metric_id", ["rain_bkk", "fc_tmax_bkk", "fc_tmin_bkk", "dam_pasak_pct", "pm25_bkk"]).eq("is_demo", false).lte("observed_on", date).order("observed_on", { ascending: false }).limit(40),
        supabase.from("social_posts").select("summary,text,area,posted_at").eq("is_bkk", true).lte("posted_at", end).order("posted_at", { ascending: false }).limit(1),
        supabase.from("lottery_draws").select("draw_date,first,last2").lte("draw_date", date).order("draw_date", { ascending: false }).limit(1),
        imgs({ data: { date } }).catch(() => []),
      ]);
      const latest = (id: string) => obs.data?.find((o) => o.metric_id === id);
      return { fam: f.data ?? [], latest, post: post.data?.[0], lot: lot.data?.[0], images };
    },
  });
}

function Photo({ url, className }: { url?: string | undefined; className?: string }) {
  return (
    <figure className={`relative overflow-hidden bg-ink/10 ${className ?? ""}`}>
      {url ? <img src={url} alt="ภาพประกอบสร้างโดย AI" className="h-full w-full object-cover" loading="lazy" /> : <div className="tds-grid h-full w-full" />}
      <figcaption className="absolute bottom-0 left-0 bg-ink/80 px-1.5 py-0.5 text-[10px] text-paper">{url ? "ภาพประกอบสร้างโดย AI — ไม่ใช่ภาพเหตุการณ์จริง" : "ยังไม่มีภาพประกอบ"}</figcaption>
    </figure>
  );
}

function delta(i: BriefItem) {
  const p = i.impact_inputs?.prev_value, n = i.impact_inputs?.new_value;
  if (p == null || n == null) return null;
  return { p, n, ch: n - p };
}

export function BriefFrontPage({ date, items, edition, cutoff }: { date: string; items: BriefItem[]; edition?: number | null; cutoff?: string | null }) {
  const { data } = useFrontData(date);
  const famOf = (id: string) => data?.fam.find((f) => f.id === id);
  const img = (slot: string) => data?.images.find((x) => x.slot === slot)?.url;
  const [top, ...rest] = items;
  const d = top ? delta(top) : null;
  const perDay = +items.reduce((a, i) => a + Number(i.impact_calc?.per_day ?? 0), 0).toFixed(2);
  const L = data?.latest;
  const rain = L?.("rain_bkk"), tmax = L?.("fc_tmax_bkk"), tmin = L?.("fc_tmin_bkk"), dam = L?.("dam_pasak_pct"), pm = L?.("pm25_bkk");

  return (
    <article className="mt-6 border-4 border-ink bg-paper text-ink shadow-[6px_6px_0_var(--color-ink)]" aria-label="หน้าหนึ่ง Thailand Daily Signals">
      {/* Nameplate */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch border-b-4 border-ink">
        <div className="flex flex-col justify-center bg-headline-red px-3 py-2 text-headline-red-foreground">
          <span className="font-display text-2xl font-black leading-none sm:text-3xl">สัญญาณ</span>
          <span className="text-[10px] font-semibold tracking-[0.2em]">DAILY SIGNALS</span>
        </div>
        <div className="tds-grid flex min-w-0 flex-col justify-center px-3 py-2">
          <p className="truncate font-display text-xl font-black sm:text-2xl">Thailand Daily Signals</p>
          <p className="flex flex-wrap items-center gap-x-3 text-[11px]">
            <span className="inline-flex items-center gap-1"><span className="ticker-live-dot inline-block h-2 w-2 rounded-full bg-press-green" />ข้อมูลจริงจากหน่วยงานรัฐ</span>
            <span>{thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            <span>ฉบับที่ {edition ?? 1}</span>
            {cutoff && <span>ตัดข้อมูล {new Date(cutoff).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.</span>}
          </p>
        </div>
      </header>

      {/* Banner headline */}
      <div className="border-b-4 border-ink px-3 py-3">
        {top ? (
          <h2 className="font-display text-3xl font-black leading-tight text-headline-red sm:text-5xl">{famOf(top.family)?.emoji} {top.what}</h2>
        ) : (
          <h2 className="font-display text-3xl font-black leading-tight sm:text-5xl">วันนี้ไม่มีอะไรเปลี่ยน<span className="text-headline-red">เกินเกณฑ์</span></h2>
        )}
        <p className="mt-1 text-sm font-semibold">{top ? top.importance : "ยังไม่มีข้อมูลที่ตรวจสอบได้เปลี่ยนเกินเกณฑ์ แหล่งที่ตรวจไม่ได้แสดงแยกด้านล่าง"}</p>
      </div>

      {/* Hero photo + big number */}
      <div className="grid border-b-4 border-ink sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Photo url={img("hero")} className="aspect-[3/2] sm:border-r-4 sm:border-ink" />
        <div className="flex flex-col">
          <div className="flex-1 bg-press-yellow p-3">
            <p className="text-xs font-bold">{top ? famOf(top.family)?.name_th : "ภาพรวมวันนี้"}</p>
            {d ? (
              <>
                <p className="font-display text-5xl font-black leading-none">{d.ch > 0 ? "▲" : "▼"} {fmt(Math.abs(d.ch))}</p>
                <p className="mt-1 text-sm">จาก {fmt(d.p)} → <b>{fmt(d.n)}</b></p>
              </>
            ) : (
              <p className="font-display text-4xl font-black leading-none">{items.length} <span className="text-lg">เรื่องที่เปลี่ยน</span></p>
            )}
          </div>
          <div className="border-t-4 border-ink bg-ink p-3 text-paper">
            <p className="text-xs">กระทบกระเป๋าครัวเรือนตัวอย่าง</p>
            <p className="font-display text-3xl font-black">{perDay === 0 ? "ไม่เปลี่ยน" : `${perDay > 0 ? "+" : "−"}฿${fmt(Math.abs(perDay))}`}<span className="text-sm font-normal"> /วัน</span></p>
          </div>
        </div>
      </div>

      {/* Secondary stories */}
      {rest.length > 0 && (
        <div className="grid border-b-4 border-ink sm:grid-cols-3">
          {rest.slice(0, 3).map((i, k) => {
            const dd = delta(i);
            return (
              <div key={i.metric_id} className={`flex flex-col ${k > 0 ? "border-t-4 border-ink sm:border-l-4 sm:border-t-0" : ""}`}>
                <Photo url={img(`s${k + 1}`)} className="aspect-[3/2]" />
                <div className={`flex-1 p-2 ${k === 1 ? "bg-press-green text-paper" : ""}`}>
                  <p className="font-display text-lg font-black leading-tight">{famOf(i.family)?.emoji} {i.what}</p>
                  {dd && <p className="text-sm font-bold">{dd.ch > 0 ? "▲" : "▼"} {fmt(Math.abs(dd.ch))} ({fmt(dd.p)} → {fmt(dd.n)})</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom strip */}
      <div className="tds-grid grid grid-cols-2 text-sm sm:grid-cols-4">
        <div className="border-r-2 border-ink p-2">
          <p className="text-xs font-bold text-headline-red">จราจร FM91</p>
          <p className="line-clamp-3">{data?.post ? (data.post.summary ?? data.post.text) : "ยังไม่มีโพสต์"}</p>
          <p className="text-[10px]">Social — ยังไม่ยืนยันจากหน่วยงานรัฐ</p>
        </div>
        <div className="p-2 sm:border-r-2 sm:border-ink">
          <p className="text-xs font-bold text-headline-red">อากาศ กทม.</p>
          <p>{tmin && tmax ? `${fmt(Number(tmin.value), 0)}–${fmt(Number(tmax.value), 0)}°C` : "—"}{rain ? ` · ฝน ${fmt(Number(rain.value), 1)} มม.` : ""}</p>
          {pm && <p className="text-xs">PM2.5 {fmt(Number(pm.value), 1)} µg/m³</p>}
        </div>
        <div className="border-r-2 border-t-2 border-ink p-2 sm:border-t-0">
          <p className="text-xs font-bold text-headline-red">เขื่อนป่าสักฯ</p>
          <p>{dam ? `${fmt(Number(dam.value), 1)}% ความจุ` : "—"}</p>
          {dam && <p className="text-[10px]">ข้อมูล {dam.observed_on}</p>}
        </div>
        <div className="border-t-2 border-ink p-2 sm:border-t-0">
          <p className="text-xs font-bold text-headline-red">สลากงวด {data?.lot ? thaiDate(data.lot.draw_date, { day: "numeric", month: "short" }) : "—"}</p>
          <p className="font-display text-2xl font-black tracking-wider">{data?.lot?.first ?? "—"}</p>
          {data?.lot?.last2 && <p className="text-xs">เลขท้าย 2 ตัว {data.lot.last2}</p>}
        </div>
      </div>
    </article>
  );
}
