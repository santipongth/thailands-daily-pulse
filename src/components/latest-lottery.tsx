// Latest GLO draw (results only on the 1st/16th) — shown on non-draw days instead of a blank.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";

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
    <div className="border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">ผลสลากงวดล่าสุด</div>
      <div className="font-display text-lg">งวด {thaiDate(r.draw_date, { day: "numeric", month: "long", year: "numeric" })}</div>
      <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div><div className="text-xs text-muted-foreground">รางวัลที่ 1</div><div className="font-display text-3xl tracking-widest">{r.first}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขท้าย 2 ตัว</div><div className="font-display text-2xl">{r.last2 ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขหน้า 3 ตัว</div><div className="text-lg">{r.front3?.join(" · ") || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">เลขท้าย 3 ตัว</div><div className="text-lg">{r.back3?.join(" · ") || "—"}</div></div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {r.verified ? "ยืนยันตรงกัน 2 แหล่งของสำนักงานสลากฯ" : "ยังไม่ยืนยันจากแหล่งที่ 2"} · งวดถัดไป {thaiDate(nextDrawDate(r.draw_date > today ? r.draw_date : today), { day: "numeric", month: "short" })} · ตรวจซ้ำจากเอกสารทางการเสมอ
      </div>
    </div>
  );
}
