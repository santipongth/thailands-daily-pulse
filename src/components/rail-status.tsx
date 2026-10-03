// BTS/MRT notices from official X accounts. "No disruption" is a valid result.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAIL_ACCOUNTS } from "@/lib/rail";
import { TodayEmpty, TodayItem, TodayList, TodaySection, thTime } from "@/components/today-section";

const statusLabel = (p: { rail_status: string | null; rail_day: string | null }) =>
  p.rail_status === "counted" ? `นับในสัญญาณ ${p.rail_day}` : p.rail_status === "late" ? "ไม่นับ (มาช้า)" : p.rail_status === "context" ? "บริบท" : "บันทึกก่อนมีสถานะ";

export function RailStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rail-status"],
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("source_runs").select("ran_at,ok,error,sample,last_ok_at").eq("source", "รถไฟฟ้า BTS/MRT (X)").maybeSingle(),
        supabase.from("social_posts").select("source,posted_at,received_at,text,url,rail_status,rail_reason,rail_day").in("source", ["BTS (X)", "MRT (X)"]).order("posted_at", { ascending: false }).limit(8),
      ]);
      if (p.error) throw new Error(p.error.message);
      return { run: r.data, posts: p.data ?? [] };
    },
  });
  return (
    <TodaySection id="rail-h" title="รถไฟฟ้า BTS/MRT"
      note={<>ประกาศจากบัญชี X ทางการ {RAIL_ACCOUNTS.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noopener" className="mr-1 underline">{a.url.replace("https://x.com/", "@")}</a>)} · คัดด้วยคำสำคัญ ไม่ใช้ AI · ตรวจล่าสุด {thTime(data?.run?.ran_at)}{data?.run && !data.run.ok ? " (ไม่สำเร็จ)" : ""}</>}>
      {isLoading ? <TodayEmpty>กำลังโหลด…</TodayEmpty>
        : isError ? <TodayEmpty>อ่านข้อมูลไม่ได้</TodayEmpty>
        : !data?.posts.length ? <TodayEmpty>ไม่มีประกาศเหตุขัดข้องหรือล่าช้า — เดินรถปกติตามที่บัญชีทางการรายงาน</TodayEmpty> : (
          <TodayList>
            {data.posts.map((p) => (
              <TodayItem key={p.url} label={`${p.source.replace(" (X)", "")} · ${statusLabel(p)}`}
                meta={<><span>ประกาศ {thTime(p.posted_at)}</span><span>รับ {thTime(p.received_at)}</span><a href={p.url} target="_blank" rel="noopener" className="underline hover:text-foreground">ดูโพสต์ต้นทาง</a></>}>
                <p className="whitespace-pre-line">{p.text}</p>
                {p.rail_reason && <p className="mt-1 text-xs text-muted-foreground">เหตุผล: {p.rail_reason}</p>}
              </TodayItem>
            ))}
          </TodayList>
        )}
    </TodaySection>
  );
}
