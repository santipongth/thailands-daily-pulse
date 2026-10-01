import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { retrySources } from "@/lib/signals.functions";
import { useSourcePrefs } from "@/hooks/use-source-prefs";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";

type Run = { source: string; ran_at: string; ok: boolean; error: string | null; last_ok_at: string | null; url: string | null; kind: string; run_kind: string };

const failQuery = queryOptions({
  queryKey: ["source-failures"],
  queryFn: async () => {
    const { data, error } = await supabase.from("source_runs").select("source,ran_at,ok,error,last_ok_at,url,kind,run_kind").order("source");
    if (error) throw error;
    return data as Run[];
  },
});

export const Route = createFileRoute("/failures")({
  validateSearch: z.object({ followed: z.coerce.number().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(failQuery),
  head: () => ({
    meta: [
      { title: "แหล่งที่ดึงข้อมูลไม่ได้ — Thailand Daily Signals" },
      { name: "description", content: "รายการเว็บไซต์หน่วยงานรัฐที่ดึงข้อมูลไม่สำเร็จ พร้อมวันที่ลองล่าสุดและเหตุผล" },
      { property: "og:title", content: "แหล่งที่ดึงข้อมูลไม่ได้ — Thailand Daily Signals" },
      { property: "og:description", content: "ความโปร่งใสของการดึงข้อมูล: อะไรล้มเหลว เมื่อไร และเพราะอะไร" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Failures,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

const t = (d: string | null) => (d ? new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยสำเร็จ");

function Failures() {
  const { data } = useSuspenseQuery(failQuery);
  const { followed } = Route.useSearch();
  const [prefs] = useSourcePrefs();
  const qc = useQueryClient();
  const retry = useServerFn(retrySources);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const failed = data.filter((r) => !r.ok && (!followed || !prefs.disabled.includes(r.source)));
  const daily = data.filter((r) => r.run_kind === "daily").map((r) => r.ran_at).sort().pop() ?? null;
  const onRetry = async () => {
    setBusy(true); setMsg("กำลังดึงข้อมูลใหม่จากทุกแหล่ง อาจใช้เวลา 1–2 นาที…");
    const r: any = await retry();
    setBusy(false);
    setMsg(r.refreshed ? "ลองใหม่เสร็จแล้ว" : r.wait_until ? `เพิ่งลองไปแล้ว ลองได้อีกครั้งหลัง ${t(r.wait_until)}` : "มีการดึงข้อมูลอยู่แล้ว ลองใหม่ในอีกสักครู่");
    qc.invalidateQueries({ queryKey: ["source-failures"] });
  };
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-4xl">แหล่งที่ดึงข้อมูลไม่ได้</h1>
        <p className="mt-2 text-muted-foreground">ล้มเหลว {failed.length} จาก {data.length} แหล่งในรอบล่าสุด ระบบจะลองใหม่อัตโนมัติทุกชั่วโมง ข้อมูลของแหล่งที่ล้มเหลวจะไม่ถูกใช้ตัดสัญญาณ</p>
        <p className="mt-1 text-sm">รอบประจำวัน (ทุกวัน 05:30 น.) ล่าสุด: <strong>{daily ? t(daily) : "ยังไม่เคยรัน"}</strong>{followed ? " · แสดงเฉพาะแหล่งที่คุณติดตาม" : ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={onRetry} disabled={busy} className="border-2 border-foreground px-3 py-1 text-sm font-semibold hover:bg-foreground hover:text-background disabled:opacity-50">ลองดึงใหม่ตอนนี้</button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
        {failed.length === 0 ? (
          <p className="mt-8 border-2 border-foreground p-6">ทุกแหล่งดึงข้อมูลสำเร็จในรอบล่าสุด</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {failed.map((r) => (
              <li key={r.source} className="border-2 border-foreground p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl">{r.source}</h2>
                  <span className="text-xs uppercase text-muted-foreground">{r.kind === "crawler" ? "crawler เว็บไซต์" : "API"} · {r.run_kind === "daily" ? "รอบประจำวัน" : r.run_kind === "manual" ? "ลองเอง" : "รอบรายชั่วโมง"}</span>
                </div>
                <p className="mt-2 text-sm"><span className="font-semibold text-destructive">เหตุผล:</span> {r.error}</p>
                <p className="mt-1 text-sm text-muted-foreground">ลองดึงล่าสุด: {t(r.ran_at)} · สำเร็จครั้งล่าสุด: {t(r.last_ok_at)}</p>
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs underline">{r.url}</a>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
