import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { setHolidayUrl } from "@/lib/calendar.functions";
import { bkkToday, thaiDate } from "@/lib/signals";
import { RD_TAX_URL } from "@/lib/rdtax";
import { upcomingQuery } from "@/lib/calendar";

export const Route = createFileRoute("/calendar")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "วันหยุดและกำหนดยื่นภาษี — Thailand Daily Signals" },
      { name: "description", content: "วันหยุดราชการและวันหยุดธนาคาร (จาก Kapook) และกำหนดยื่น/ชำระภาษีจากปฏิทินภาษีกรมสรรพากร" },
      { property: "og:title", content: "วันหยุดและกำหนดยื่นภาษี — Thailand Daily Signals" },
      { property: "og:description", content: "ดูวันหยุดที่กำลังจะมา และวันสุดท้ายยื่นแบบภาษีจากกรมสรรพากร" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const today = bkkToday();
  const { data } = useQuery(upcomingQuery(today));
  const qc = useQueryClient();
  const save = useServerFn(setHolidayUrl);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data?.holidayUrl) setUrl((u) => u || data.holidayUrl!); }, [data?.holidayUrl]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { url } });
      setMsg(r.ok ? `บันทึกลิงก์และดึงวันหยุดได้ ${r.count} รายการ` : r.error);
      qc.invalidateQueries({ queryKey: ["calendar"] });
    } catch { setMsg("ลิงก์ต้องเป็นรูปแบบ https://calendar.kapook.com/ปี พ.ศ./holiday"); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">วันหยุดและกำหนดยื่นภาษี</h1>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="section-heading text-2xl">วันหยุดราชการและวันหยุดธนาคาร</h2>
            <p className="mt-1 text-xs text-muted-foreground">จาก {data?.holidayUrl ? <a href={data.holidayUrl} target="_blank" rel="noreferrer" className="underline">ปฏิทินวันหยุด Kapook</a> : "Kapook"} · อ่านวันละครั้ง</p>
            <ul className="mt-4 divide-y divide-editorial-rule border-y border-editorial-rule">
              {(data?.holidays ?? []).map((h) => (
                <li key={h.id} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="w-28 shrink-0 tabular-nums">{thaiDate(h.holiday_date, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="flex-1">{h.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{[h.is_gov && "ราชการ", h.is_bank && "ธนาคาร"].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
              {data && !data.holidays.length && <li className="py-3 text-sm text-muted-foreground">ไม่มีวันหยุดที่เหลือในปีของลิงก์นี้ — เปลี่ยนเป็นลิงก์ปีถัดไปด้านล่าง</li>}
            </ul>
            <form onSubmit={submit} className="mt-6 space-y-3 border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)] text-sm">
              <p className="font-semibold">ลิงก์แหล่งวันหยุด</p>
              <label className="block">ลิงก์ (เปลี่ยนปีได้ เช่น …/2570/holiday)<input required value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 block w-full border border-foreground/30 bg-background px-2 py-1" placeholder="https://calendar.kapook.com/2570/holiday" /></label>
              <button disabled={busy} className="bg-foreground px-4 py-2 text-background disabled:opacity-50">{busy ? "กำลังดึง…" : "บันทึกและดึงทันที"}</button>
              {msg && <p role="status">{msg}</p>}
              <p className="text-xs text-muted-foreground">รับเฉพาะลิงก์ calendar.kapook.com/ปี/holiday · วันหยุดปีเก่ายังเก็บไว้</p>
            </form>
          </section>
          <section>
            <h2 className="section-heading text-2xl">กำหนดยื่น/ชำระภาษี</h2>
            <p className="mt-1 text-xs text-muted-foreground">จาก <a href={RD_TAX_URL} target="_blank" rel="noreferrer" className="underline">ปฏิทินภาษีอากร กรมสรรพากร</a> · อ่านวันละครั้ง</p>
            <ul className="mt-4 divide-y divide-editorial-rule border-y border-editorial-rule">
              {(data?.tax ?? []).map((t) => (
                <li key={t.id} className="py-3 text-sm">
                  <p><b className="tabular-nums">{thaiDate(t.due_date, { day: "numeric", month: "short", year: "numeric" })}</b> · {t.channel.includes("อินเทอร์เน็ต") ? "วันสุดท้ายยื่นทางอินเทอร์เน็ต" : "วันสุดท้ายยื่นแบบที่สำนักงาน"}</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">{t.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </li>
              ))}
              {data && !data.tax.length && <li className="py-3 text-sm text-muted-foreground">ยังดึงปฏิทินภาษีไม่ได้ — ตรวจสอบไม่ได้</li>}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
