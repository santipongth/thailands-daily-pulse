import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { HouseholdBasket } from "@/components/household-basket";
import { BriefItems, type BriefItem } from "@/components/brief-items";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate, thaiDate } from "@/lib/signals";
import { STATUS_TH, type Completeness } from "@/lib/completeness";

const hm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

const briefQuery = (date: string) =>
  queryOptions({
    queryKey: ["brief", date],
    queryFn: async () => {
      const [{ data, error }, { data: updates }] = await Promise.all([
        supabase.from("daily_briefs").select("brief_date,body,published_at,generated_at,items,cutoff_at,edition,completeness").eq("brief_date", date).maybeSingle(),
        supabase.from("brief_updates").select("*").eq("brief_date", date).order("created_at"),
      ]);
      if (error) throw error;
      return data ? { ...data, updates: updates ?? [] } : null;
    },
  });

export const Route = createFileRoute("/brief/$date")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(briefQuery(params.date)),
  head: ({ params }) => ({
    meta: [
      { title: `Daily Brief ${params.date} — Thailand Daily Signals` },
      { name: "description", content: `สรุปสัญญาณประจำวันที่ ${params.date}: อะไรเปลี่ยน สำคัญแค่ไหน กระทบครัวเรือน และคำแนะนำจากแหล่งทางการ` },
      { property: "og:title", content: `Daily Brief ${params.date} — Thailand Daily Signals` },
      { property: "og:description", content: "4 คำถามที่คนไทยควรรู้ทุกเช้า" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BriefPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบ Brief วันนี้</div>,
});

function BriefPage() {
  const { date } = Route.useParams();
  const { data } = useSuspenseQuery(briefQuery(date));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex justify-between text-sm">
          <Link to="/brief/$date" params={{ date: shiftDate(date, -1) }} className="hover:underline">← วันก่อน</Link>
          <Link to="/brief" className="hover:underline">คลังทั้งหมด</Link>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-up">Daily Brief</p>
        <h1 className="font-display text-4xl">{thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
        {!data ? (
          <p className="mt-6 text-muted-foreground">ยังไม่มี Brief ของวันนี้ ฉบับถัดไปเผยแพร่เวลา 06:00 น.</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.published_at ? `เผยแพร่ ${new Date(data.published_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.` : "ฉบับระหว่างวัน (ฉบับทางการเผยแพร่ 06:00 น.)"} · บทนำเรียบเรียงโดย AI จากข้อเท็จจริงด้านล่างเท่านั้น
            </p>
            {data.cutoff_at && <p className="mt-1 text-sm font-semibold">ข้อมูลถึง {hm(data.cutoff_at)} น. — ข้อมูลที่ได้รับหลังเวลานี้เข้าเป็นอัปเดตด้านล่างหรือฉบับถัดไป</p>}
            <p className="mt-6 font-display text-2xl leading-relaxed">{data.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">ตัวเลขทั้งหมดคำนวณโดยระบบจากข้อมูลทางการ — AI ใช้เรียบเรียงภาษาบทนำเท่านั้น และถูกตรวจว่าไม่เพิ่มตัวเลขใหม่</p>
            <div className="mt-10"><BriefItems items={(data.items ?? []) as BriefItem[]} /></div>
            {data.updates.length > 0 && (
              <section className="mt-10">
                <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">อัปเดตหลังเผยแพร่</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {data.updates.map((u: any) => (
                    <li key={u.id}><span className="font-semibold">{hm(u.created_at)} น. · {({ update: "เหตุใหม่", correction: "แก้ไข", withdrawal: "ถอน" } as Record<string, string>)[u.kind] ?? u.kind}</span> — {u.title}{u.body ? ` (${u.body})` : ""} {u.event_id && <Link to="/events/$id" params={{ id: u.event_id }} className="text-xs underline">รุ่น {u.version}</Link>}</li>
                  ))}
                </ul>
              </section>
            )}
            {Array.isArray(data.completeness) && (
              <section className="mt-10">
                <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ความครบถ้วนของแหล่งข้อมูล</h2>
                <p className="mt-1 text-xs text-muted-foreground">แหล่งที่ "เก่า" หรือ "ตรวจสอบไม่ได้" ไม่ได้แปลว่าไม่เปลี่ยน — เพียงแต่ยังยืนยันไม่ได้ในฉบับนี้</p>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {(data.completeness as Completeness[]).map((c) => (
                    <li key={c.source}><span className={c.status === "ok" ? "font-semibold text-primary" : "font-semibold text-destructive"}>{STATUS_TH[c.status]}</span> {c.source} <span className="text-xs text-muted-foreground">· ข้อมูลวันที่ {c.data_date ?? "—"}{c.status !== "ok" ? ` · ${c.reason}` : ""}</span></li>
                  ))}
                </ul>
              </section>
            )}
            <div className="mt-10"><HouseholdBasket date={date} /></div>
            <Link to="/day/$date" params={{ date }} className="mt-4 inline-block text-sm underline">ดูอันดับสัญญาณทั้งหมดของวันนี้ เทียบเมื่อวาน →</Link>
          </>
        )}
      </main>
    </div>
  );
}
