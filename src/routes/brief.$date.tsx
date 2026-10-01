import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { BriefItems, type BriefItem } from "@/components/brief-items";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate, thaiDate } from "@/lib/signals";

const briefQuery = (date: string) =>
  queryOptions({
    queryKey: ["brief", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_briefs").select("brief_date,body,published_at,generated_at,items").eq("brief_date", date).maybeSingle();
      if (error) throw error;
      return data;
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
            <p className="mt-6 font-display text-2xl leading-relaxed">{data.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">ตัวเลขทั้งหมดคำนวณโดยระบบจากข้อมูลทางการ — AI ใช้เรียบเรียงภาษาบทนำเท่านั้น และถูกตรวจว่าไม่เพิ่มตัวเลขใหม่</p>
            <div className="mt-10"><BriefItems items={(data.items ?? []) as BriefItem[]} /></div>
          </>
        )}
      </main>
    </div>
  );
}
