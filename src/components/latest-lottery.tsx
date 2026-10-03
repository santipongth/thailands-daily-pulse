// Latest GLO draw (results only on the 1st/16th) — shown on non-draw days instead of a blank.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";
import { EditorialDataSection } from "@/components/editorial-data-section";

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
  return (
    <EditorialDataSection
      eyebrow="ข้อมูลประกาศเป็นรอบ"
      title="ผลสลากงวดล่าสุด"
      summary={<><span className="block font-editorial text-lg text-editorial-ink">งวด</span><span className="text-xs text-muted-foreground">{thaiDate(r.draw_date, { day: "numeric", month: "short", year: "numeric" })}</span></>}
      footer={<>
        {r.verified ? "ยืนยันตรงกัน 2 แหล่งของสำนักงานสลากฯ" : "ยังไม่ยืนยันจากแหล่งที่ 2"} · งวดถัดไป {thaiDate(nextDrawDate(r.draw_date > today ? r.draw_date : today), { day: "numeric", month: "short" })} · ตรวจซ้ำจากเอกสารทางการเสมอ
      </>}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
        <div className="border-l-4 border-editorial-red pl-4"><div className="text-xs text-muted-foreground">รางวัลที่ 1</div><div className="mt-1 font-editorial text-4xl tabular-nums text-editorial-ink sm:text-5xl">{r.first}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขท้าย 2 ตัว</div><div className="mt-1 font-editorial text-3xl tabular-nums">{r.last2 ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขหน้า 3 ตัว</div><div className="mt-1 text-lg font-semibold tabular-nums">{r.front3?.join(" · ") || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขท้าย 3 ตัว</div><div className="mt-1 text-lg font-semibold tabular-nums">{r.back3?.join(" · ") || "—"}</div></div>
      </div>
    </EditorialDataSection>
  );
}
