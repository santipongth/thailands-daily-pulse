import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { evidenceUrl } from "@/lib/signals.functions";
import { householdImpact } from "@/lib/impact";

const eventQuery = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const [e, v] = await Promise.all([
        supabase.from("signal_events").select("*, families(name_th, emoji), metrics(name_th, unit)").eq("event_id", id).maybeSingle(),
        supabase.from("signal_versions").select("*").eq("event_id", id).order("version", { ascending: false }),
      ]);
      if (e.error) throw e.error;
      return { event: e.data as any, versions: (v.data ?? []) as any[] };
    },
  });

export const Route = createFileRoute("/events/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.id)),
  head: ({ params }) => ({
    meta: [
      { title: `เหตุการณ์ ${params.id} — Thailand Daily Signals` },
      { name: "description", content: "ทะเบียนเหตุการณ์: รุ่น ค่าเปรียบเทียบ กฎที่ผ่าน หลักฐานต้นทาง สูตรผลกระทบ คำแนะนำ และประวัติการแก้ไข" },
      { property: "og:title", content: `เหตุการณ์ ${params.id} — Thailand Daily Signals` },
      { property: "og:description", content: "ย้อนดูหลักฐานและกฎของสัญญาณนี้ได้ทุกขั้น" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบเหตุการณ์</div>,
});

const KIND_TH: Record<string, string> = { new: "สร้างใหม่", corrected: "แก้ไข", withdrawn: "ถอน", reinstated: "กลับมาใช้" };
const STATUS_TH: Record<string, string> = { active: "ใช้งาน", corrected: "แก้ไขแล้ว", withdrawn: "ถอนแล้ว" };
const QUALITY_TH: Record<string, string> = { verified: "มีหลักฐานต้นทาง", cannot_verify: "ตรวจสอบไม่ได้ (ไม่มีไฟล์ต้นทางของวันนั้น)", demo: "ข้อมูลตัวอย่าง", stale: "แหล่งข้อมูลเก่า" };
const dt = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

function EventPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(eventQuery(id));
  const e = data.event;
  if (!e) return <div className="min-h-screen"><Masthead /><p className="p-8">ไม่พบเหตุการณ์ {id}</p></div>;
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">ทะเบียนเหตุการณ์</p>
        <h1 className="font-display text-3xl">{data.versions[0]?.title ?? id}</h1>
        <dl className="mt-4 grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold">event_id</dt><dd className="font-mono">{e.event_id}</dd>
          <dt className="font-semibold">รุ่นปัจจุบัน</dt><dd>{e.current_version} · {STATUS_TH[e.status] ?? e.status}</dd>
          <dt className="font-semibold">ประเภทเหตุการณ์</dt><dd>{e.event_type} · {e.families?.emoji} {e.families?.name_th} · {e.metrics?.name_th}</dd>
          <dt className="font-semibold">พื้นที่</dt><dd>{e.area}</dd>
          <dt className="font-semibold">วันที่ข้อมูล</dt><dd><Link to="/day/$date" params={{ date: e.signal_date }} className="underline">{e.signal_date}</Link></dd>
          <dt className="font-semibold">พบครั้งแรก</dt><dd>{dt(e.first_seen_at)}</dd>
        </dl>
        <h2 className="mt-8 border-b-2 border-foreground pb-1 font-display text-xl">ทุกรุ่น (ใหม่สุดก่อน)</h2>
        <ol className="mt-2 space-y-4">
          {data.versions.map((v) => {
            const inputs = v.impact?.inputs;
            const recomputed = inputs ? householdImpact(inputs) : null;
            return (
              <li key={v.id} className="border-l-4 border-foreground pl-4 text-sm">
                <p className="font-semibold">รุ่น {v.version} · {KIND_TH[v.change_kind] ?? v.change_kind} · {dt(v.created_at)}</p>
                {v.reason && <p className="text-muted-foreground">{v.reason}</p>}
                <dl className="mt-1 grid gap-1 sm:grid-cols-[10rem_1fr]">
                  <dt>ค่าเปรียบเทียบ</dt><dd>{v.prev_value ?? "—"} ({v.prev_date ?? "—"}) → {v.new_value ?? "—"} ({v.new_date ?? "—"}) {e.metrics?.unit}</dd>
                  <dt>กฎที่ทำให้ผ่าน</dt><dd>{v.rules?.rule ?? "—"}{v.rules?.z != null && ` · z ${v.rules.z} ≥ vol_k ${v.rules.vol_k}`}{v.rules?.ratio != null && ` · เกินเกณฑ์ ${v.rules.ratio} เท่า`}{v.rules?.bands && ` · ระดับ ${v.rules.bands.join("/")}`}</dd>
                  <dt>สถานะคุณภาพ</dt><dd>{QUALITY_TH[v.quality] ?? v.quality}</dd>
                  <dt>หลักฐานต้นทาง</dt>
                  <dd>{v.evidence_ids?.length ? v.evidence_ids.map((eid: number) => (
                    <button key={eid} type="button" className="mr-2 underline" onClick={async () => { const w = window.open("", "_blank"); try { const r = await evidenceUrl({ data: { id: eid } }); if (w) w.location.href = r.url; } catch { w?.close(); } }}>ไฟล์ #{eid}</button>
                  )) : "—"}</dd>
                  <dt>สูตรผลกระทบ</dt>
                  <dd>{v.impact?.text ?? "ไม่มีผลต่อครัวเรือนที่คำนวณได้"}{v.impact?.calc && <span className="block font-mono text-xs">ค่าใช้จ่ายครัวเรือน: {v.impact.calc.formula}</span>}{inputs && <span className="block text-xs text-muted-foreground">อินพุต: เปลี่ยน {inputs.change_abs ?? "—"} ({inputs.prev_value} → {inputs.new_value}) · คำนวณซ้ำตอนนี้: {recomputed === v.impact?.text ? "ตรงกัน ✓" : `ไม่ตรง (${recomputed ?? "—"})`}</span>}</dd>
                  <dt>คำแนะนำ</dt><dd>{v.advice ?? "—"}</dd>
                </dl>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
