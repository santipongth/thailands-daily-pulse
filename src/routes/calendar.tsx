import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { addHoliday, deleteHoliday } from "@/lib/calendar.functions";
import { bkkToday, thaiDate } from "@/lib/signals";
import { RD_TAX_URL } from "@/lib/rdtax";
import { upcomingQuery } from "@/lib/calendar";

export const Route = createFileRoute("/calendar")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "วันหยุดและกำหนดยื่นภาษี — Thailand Daily Signals" },
      { name: "description", content: "วันหยุดราชการ วันหยุดพิเศษ (ผู้ใช้เพิ่มเอง) และกำหนดยื่น/ชำระภาษีจากปฏิทินภาษีกรมสรรพากร" },
      { property: "og:title", content: "วันหยุดและกำหนดยื่นภาษี — Thailand Daily Signals" },
      { property: "og:description", content: "ดูวันหยุดที่กำลังจะมา และวันสุดท้ายยื่นแบบภาษีจากกรมสรรพากร" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const TOK = "tds-holiday-tokens";
const readTokens = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(TOK) ?? "{}"); } catch { return {}; } };

function CalendarPage() {
  const today = bkkToday();
  const { data } = useQuery(upcomingQuery(today));
  const qc = useQueryClient();
  const add = useServerFn(addHoliday);
  const del = useServerFn(deleteHoliday);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ holiday_date: "", name: "", kind: "ราชการ" as "ราชการ" | "พิเศษ", note: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setTokens(readTokens()), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await add({ data: { ...form, note: form.note || undefined } });
      if (!r.ok) { setMsg(r.error); return; }
      const t = { ...readTokens(), [r.id]: r.token };
      localStorage.setItem(TOK, JSON.stringify(t)); setTokens(t);
      setForm({ ...form, name: "", note: "" }); setMsg("เพิ่มวันหยุดแล้ว");
      qc.invalidateQueries({ queryKey: ["calendar"] });
    } catch { setMsg("ข้อมูลไม่ถูกต้อง ตรวจวันที่และชื่ออีกครั้ง"); } finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    const token = tokens[id]; if (!token) return;
    const r = await del({ data: { id, token } });
    if (r.ok) { const t = { ...readTokens() }; delete t[id]; localStorage.setItem(TOK, JSON.stringify(t)); setTokens(t); qc.invalidateQueries({ queryKey: ["calendar"] }); }
  };

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl">วันหยุดและกำหนดยื่นภาษี</h1>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="font-display text-xl">วันหยุดที่กำลังจะมา</h2>
            <p className="mt-1 text-xs text-muted-foreground">ผู้ใช้เพิ่มเอง — ยังไม่ได้ยืนยันกับประกาศทางการ ตรวจสอบกับ ครม./หน่วยงานก่อนวางแผน</p>
            <ul className="mt-4 divide-y divide-foreground/20 border-y border-foreground/20">
              {(data?.holidays ?? []).map((h) => (
                <li key={h.id} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="w-28 shrink-0 tabular-nums">{thaiDate(h.holiday_date, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="flex-1">{h.name} <span className="text-xs text-muted-foreground">· วันหยุด{h.kind}</span>{h.note && <span className="block text-xs text-muted-foreground">{h.note}</span>}</span>
                  {tokens[h.id] && <button onClick={() => remove(h.id)} className="text-xs underline">ลบ</button>}
                </li>
              ))}
              {data && !data.holidays.length && <li className="py-3 text-sm text-muted-foreground">ยังไม่มีวันหยุดที่เพิ่มไว้</li>}
            </ul>
            <form onSubmit={submit} className="mt-6 space-y-3 border border-foreground/30 p-4 text-sm">
              <p className="font-semibold">เพิ่มวันหยุด</p>
              <label className="block">วันที่<input required type="date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} className="mt-1 block w-full border border-foreground/30 bg-background px-2 py-1" /></label>
              <label className="block">ชื่อวันหยุด<input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full border border-foreground/30 bg-background px-2 py-1" placeholder="เช่น วันปิยมหาราช" /></label>
              <label className="block">ประเภท
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "ราชการ" | "พิเศษ" })} className="mt-1 block w-full border border-foreground/30 bg-background px-2 py-1">
                  <option value="ราชการ">วันหยุดราชการ</option><option value="พิเศษ">วันหยุดพิเศษ</option>
                </select>
              </label>
              <label className="block">หมายเหตุ / ที่มา (ไม่บังคับ)<input maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 block w-full border border-foreground/30 bg-background px-2 py-1" placeholder="เช่น มติ ครม. 30 ก.ย." /></label>
              <button disabled={busy} className="bg-foreground px-4 py-2 text-background disabled:opacity-50">{busy ? "กำลังบันทึก…" : "เพิ่ม"}</button>
              {msg && <p role="status">{msg}</p>}
              <p className="text-xs text-muted-foreground">ใครก็เพิ่มได้ ลบได้เฉพาะจากเครื่องที่เพิ่ม</p>
            </form>
          </section>
          <section>
            <h2 className="font-display text-xl">กำหนดยื่น/ชำระภาษี</h2>
            <p className="mt-1 text-xs text-muted-foreground">จาก <a href={RD_TAX_URL} target="_blank" rel="noreferrer" className="underline">ปฏิทินภาษีอากร กรมสรรพากร</a> · อ่านวันละครั้ง</p>
            <ul className="mt-4 divide-y divide-foreground/20 border-y border-foreground/20">
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
