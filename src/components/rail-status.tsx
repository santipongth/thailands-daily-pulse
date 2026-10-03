// BTS/MRT block on /data-all: accounts checked, last check, posts read/kept, latest notice. "No disruption" is a valid result.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAIL_ACCOUNTS } from "@/lib/rail";

const t = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export function RailStatus() {
  const { data } = useQuery({
    queryKey: ["rail-status"],
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("source_runs").select("ran_at,ok,error,sample,last_ok_at").eq("source", "รถไฟฟ้า BTS/MRT (X)").maybeSingle(),
        supabase.from("social_posts").select("source,posted_at,received_at,text,url,rail_status,rail_reason,rail_day").in("source", ["BTS (X)", "MRT (X)"]).order("posted_at", { ascending: false }).limit(8),
      ]);
      return { run: r.data, posts: p.data ?? [] };
    },
  });
  return (
    <section className="mt-8">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">รถไฟฟ้า BTS/MRT — ประกาศเหตุขัดข้อง</h2>
      <div className="mt-2 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <p>บัญชีที่ตรวจ: {RAIL_ACCOUNTS.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noopener" className="mr-2 underline">{a.url.replace("https://x.com/", "@")}</a>)}</p>
          <p className="mt-1">ตรวจล่าสุด: {t(data?.run?.ran_at)} {data?.run && (data.run.ok ? <span className="text-muted-foreground">· สำเร็จ</span> : <span className="text-destructive">· ไม่สำเร็จ</span>)}</p>
          <p className="mt-1 text-muted-foreground">{data?.run?.sample ?? "ยังไม่มีรอบดึง"}</p>
        </div>
        <div>
          {!data?.posts.length ? <p className="text-muted-foreground">ยังไม่มีประกาศเหตุขัดข้องหรือล่าช้า — ถือว่าเดินรถปกติตามที่บัญชีทางการรายงาน</p> : (
            <ul className="divide-y divide-border border-y border-border">
              {data.posts.map((p) => (
                <li key={p.url} className="py-2"><span className="text-xs text-muted-foreground">{p.source.replace(" (X)", "")} · ประกาศ {t(p.posted_at)} · ได้รับ {t(p.received_at)} · <b className={p.rail_status === "counted" ? "text-destructive" : ""}>{p.rail_status === "counted" ? `นับในสัญญาณ ${p.rail_day}` : p.rail_status === "late" ? "ไม่นับ (มาช้า)" : p.rail_status === "context" ? "บริบท" : "บันทึกก่อนมีสถานะ"}</b></span>
                  <a href={p.url} target="_blank" rel="noopener" className="block hover:underline">{p.text.slice(0, 160)}</a>{p.rail_reason && <span className="block text-xs text-muted-foreground">เหตุผล: {p.rail_reason}</span>}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">ที่มา: บัญชี X ทางการของ BTS และ MRT (BEM) · คัดด้วยคำสำคัญ ไม่ใช้ AI</p>
    </section>
  );
}
