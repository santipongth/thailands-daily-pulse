// Latest GLO draw (results only on the 1st/16th) — shown on non-draw days instead of a blank.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";
import { TodayItem, TodayList, TodaySection } from "@/components/today-section";

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
  const prizes: [string, string][] = [["เลขท้าย 2 ตัว", r.last2 ?? "—"], ["เลขหน้า 3 ตัว", r.front3?.join(" · ") || "—"], ["เลขท้าย 3 ตัว", r.back3?.join(" · ") || "—"]];
  return (
    <TodaySection id="lottery-h" title="ผลสลากงวดล่าสุด"
      note={`สำนักงานสลากกินแบ่งรัฐบาล · ${r.verified ? "ยืนยันตรงกัน 2 แหล่ง" : "ยังไม่ยืนยันจากแหล่งที่ 2"} · ตรวจซ้ำจากเอกสารทางการเสมอ`}>
      <TodayList>
        <TodayItem label={`รางวัลที่ 1 · งวด ${thaiDate(r.draw_date, { day: "numeric", month: "short", year: "numeric" })}`}
          meta={<><span>งวดถัดไป {thaiDate(nextDrawDate(r.draw_date > today ? r.draw_date : today), { day: "numeric", month: "short" })}</span>{r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener" className="underline hover:text-foreground">เอกสารทางการ</a>}</>}>
          <p className="font-editorial text-4xl tabular-nums text-editorial-ink">{r.first}</p>
        </TodayItem>
        <TodayItem label="รางวัลเลขท้าย / เลขหน้า">
          <dl className="grid gap-1">{prizes.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}</dl>
        </TodayItem>
      </TodayList>
    </TodaySection>
  );
}
