// Latest GLO draw (results only on the 1st/16th) — shown on non-draw days instead of a blank.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";
import { TodaySection } from "@/components/today-section";

export function nextDrawDate(from: string): string {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  if (d < 16) return `${y}-${String(m).padStart(2, "0")}-16`;
  const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function LatestLottery() {
  const { data: r } = useQuery({
    queryKey: ["latest-lottery"],
    queryFn: async () => (await supabase.from("lottery_draws").select("*").order("draw_date", { ascending: false }).limit(1).maybeSingle()).data,
  });
  if (!r) return null;
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const draw = thaiDate(r.draw_date, { day: "numeric", month: "short", year: "numeric" });
  const side: [string, string][] = [
    ["เลขท้าย 2 ตัว", r.last2 ?? "—"],
    ["เลขหน้า 3 ตัว", r.front3?.join(" · ") || "—"],
    ["เลขท้าย 3 ตัว", r.back3?.join(" · ") || "—"],
  ];
  return (
    <TodaySection id="lottery-h" title="ผลสลากงวดล่าสุด"
      note={`สำนักงานสลากกินแบ่งรัฐบาล · ${r.verified ? "ยืนยันตรงกัน 2 แหล่ง" : "ยังไม่ยืนยันจากแหล่งที่ 2"} · ตรวจซ้ำจากเอกสารทางการเสมอ`}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-0">
        <div className="md:col-span-7 md:border-r md:border-editorial-rule md:pr-8">
          <div className="flex items-center justify-between gap-3">
            <span className="bg-editorial-red px-3 py-1 text-xs font-bold tracking-wider text-editorial-paper">รางวัลที่ 1</span>
            <span className="text-sm font-semibold text-foreground">งวด {draw}</span>
          </div>
          <p className="mt-4 font-editorial text-6xl leading-none tracking-tight tabular-nums text-editorial-ink sm:text-7xl">{r.first}</p>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-editorial-rule pt-3 text-xs text-muted-foreground">
            <span>งวดถัดไป {thaiDate(nextDrawDate(r.draw_date > today ? r.draw_date : today), { day: "numeric", month: "short" })}</span>
            {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener" className="underline hover:text-editorial-red">เอกสารทางการ (PDF)</a>}
          </div>
        </div>
        <div className="md:col-span-5 md:pl-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">รางวัลเลขท้าย / เลขหน้า</h3>
          <dl className="mt-1">
            {side.map(([k, v], i) => (
              <div key={k} className={`flex items-end justify-between gap-4 py-4 ${i < side.length - 1 ? "border-b border-editorial-rule" : ""}`}>
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="font-editorial text-3xl leading-none tabular-nums text-editorial-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </TodaySection>
  );
}
