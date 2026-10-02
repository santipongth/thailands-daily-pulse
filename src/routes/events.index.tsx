import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CutEventsList } from "@/components/cut-events";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";

const listQuery = queryOptions({
  queryKey: ["events-list"],
  queryFn: async () => {
    const [e, v] = await Promise.all([
      supabase.from("signal_events").select("event_id,family_id,signal_date,status,current_version,is_demo,first_seen_at,updated_at,families(name_th,emoji)").order("signal_date", { ascending: false }).order("updated_at", { ascending: false }).limit(500),
      supabase.from("signal_versions").select("event_id,version,title,quality,prev_date,new_date").order("version", { ascending: false }).limit(2000),
    ]);
    if (e.error) throw e.error;
    const latest = new Map<string, any>();
    for (const x of v.data ?? []) if (!latest.has(x.event_id)) latest.set(x.event_id, x);
    return (e.data ?? []).map((x: any) => ({ ...x, v: latest.get(x.event_id) }));
  },
});

export const Route = createFileRoute("/events/")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  head: () => ({
    meta: [
      { title: "เหตุการณ์ที่ผ่านมา — Thailand Daily Signals" },
      { name: "description", content: "ติดตามทุกเหตุการณ์ย้อนหลัง: ใช้งาน แก้ไข ถอน พร้อมวันที่ข้อมูลเปลี่ยนจริง" },
      { property: "og:title", content: "เหตุการณ์ที่ผ่านมา — Thailand Daily Signals" },
      { property: "og:description", content: "ทะเบียนเหตุการณ์ย้อนหลัง รวมรายการที่ถูกแก้ไขและถอน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบ</div>,
});

const STATUS_TH: Record<string, string> = { active: "ใช้งาน", corrected: "แก้ไขแล้ว", withdrawn: "ถอนแล้ว" };
const QUALITY_TH: Record<string, string> = { verified: "มีหลักฐาน", cannot_verify: "ตรวจสอบไม่ได้", demo: "ตัวอย่าง" };
const FILTERS = ["all", "active", "corrected", "withdrawn"] as const;
const dt = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

function EventsPage() {
  const { data } = useSuspenseQuery(listQuery);
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const [fam, setFam] = useState("all");
  const fams = [...new Map(data.map((e: any) => [e.family_id, e.families])).entries()];
  const rows = data.filter((e: any) => (f === "all" || e.status === f) && (fam === "all" || e.family_id === fam));
  const count = (s: string) => data.filter((e: any) => s === "all" || e.status === s).length;
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl">เหตุการณ์ที่ผ่านมา</h1>
        <p className="text-sm text-muted-foreground">ทุกเหตุการณ์ในทะเบียน — "วันที่ข้อมูล" คือวันที่ค่าเปลี่ยนจริง ไม่ใช่วันที่ระบบดึง</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {FILTERS.map((x) => (
            <button key={x} type="button" onClick={() => setF(x)} className={`border px-3 py-1 ${f === x ? "border-foreground bg-foreground text-background" : "border-border"}`}>
              {x === "all" ? "ทั้งหมด" : STATUS_TH[x]} ({count(x)})
            </button>
          ))}
          <select value={fam} onChange={(e) => setFam(e.target.value)} className="border border-border bg-background px-2 py-1">
            <option value="all">ทุกกลุ่ม</option>
            {fams.map(([id, fa]: any) => <option key={id} value={id}>{fa?.emoji} {fa?.name_th ?? id}</option>)}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">เหตุการณ์</th><th>วันที่ข้อมูล</th><th>พบครั้งแรก</th><th>รุ่น</th><th>สถานะ</th><th>คุณภาพ</th></tr></thead>
            <tbody>
              {rows.map((e: any) => (
                <tr key={e.event_id} className="border-b border-border align-top">
                  <td className="py-1"><Link to="/events/$id" params={{ id: e.event_id }} className="underline">{e.families?.emoji} {e.v?.title ?? e.event_id}</Link></td>
                  <td className="whitespace-nowrap">{e.signal_date}</td>
                  <td className="whitespace-nowrap">{dt(e.first_seen_at)}</td>
                  <td>{e.current_version}</td>
                  <td className={e.status === "withdrawn" ? "text-destructive" : e.status === "corrected" ? "font-semibold" : ""}>{STATUS_TH[e.status] ?? e.status}</td>
                  <td>{QUALITY_TH[e.v?.quality] ?? e.v?.quality ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="py-4 text-muted-foreground">ไม่มีเหตุการณ์</td></tr>}
            </tbody>
          </table>
        </div>
        <CutEventsList />
      </main>
    </div>
  );
}
