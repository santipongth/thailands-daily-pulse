// Public: latest flood / local-water / Air4Thai / rail detail from station_snapshots and social_posts.
// Every figure shows the source's own timestamp and the station used. Raw files stay private (admin only).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TW = "ThaiWater สถานี กทม.และปริมณฑล";
const BMA = "กทม. ระบายน้ำ (น้ำท่วมถนน)";
const DDPM = "ปภ. แจ้งเตือนสาธารณภัย";
const A4T = "Air4Thai PM2.5 (กรมควบคุมมลพิษ)";
const LINKS: Record<string, string> = {
  [TW]: "https://www.thaiwater.net/water/wl", [BMA]: "https://weather.bangkok.go.th/flood/",
  [DDPM]: "https://www.disaster.go.th/contents/disaster_alert_report", [A4T]: "https://air4thai.pcd.go.th/",
};

type Snap = { source: string; station_id: string; name: string; area: string | null; value: number | null; pct: number | null; status: string | null; observed_at: string | null; received_at: string };
type Post = { post_id: string; source: string; posted_at: string; text: string; url: string };

const when = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." : "—");
const nf = (v: number | null, d = 1) => (v == null ? "—" : Number(v).toLocaleString("th-TH", { maximumFractionDigits: d }));

/** Latest fetch round per source (rows sharing the newest received_at). */
function useLocal() {
  return useQuery({
    queryKey: ["local-conditions"],
    queryFn: async () => {
      const since = new Date(Date.now() - 3 * 86400e3).toISOString();
      const per = await Promise.all([TW, BMA, DDPM, A4T].map(async (src) => {
        const { data: last } = await supabase.from("station_snapshots").select("received_at").eq("source", src).gte("received_at", since).order("received_at", { ascending: false }).limit(1).maybeSingle();
        if (!last) return [src, [] as Snap[]] as const;
        const { data } = await supabase.from("station_snapshots").select("source,station_id,name,area,value,pct,status,observed_at,received_at").eq("source", src).eq("received_at", last.received_at).limit(500);
        return [src, (data ?? []) as Snap[]] as const;
      }));
      const { data: rail } = await supabase.from("social_posts").select("post_id,source,posted_at,text,url").in("source", ["BTS (X)", "MRT (X)"]).gte("posted_at", since).order("posted_at", { ascending: false }).limit(10);
      return { snaps: Object.fromEntries(per) as Record<string, Snap[]>, rail: (rail ?? []) as Post[] };
    },
    staleTime: 5 * 60e3,
  });
}

const box = "border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]";
const Src = ({ s, at }: { s: string; at?: string | null | undefined }) => (
  <p className="mt-1 text-xs text-muted-foreground">ที่มา: <a href={LINKS[s]} target="_blank" rel="noreferrer" className="underline">{s}</a>{at ? ` · ดึงเมื่อ ${when(at)}` : ""}</p>
);

/** Key-data summary: Bangkok flood box, PM2.5 GISTDA vs Air4Thai, rail notices. */
export function LocalSummary({ gistda }: { gistda?: { value: number; date: string } | null | undefined }) {
  const { data, isLoading } = useLocal();
  if (isLoading || !data) return <p className="mt-6 text-sm text-muted-foreground">กำลังโหลดข้อมูลน้ำท่วมและอากาศ…</p>;
  const tw = [...(data.snaps[TW] ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const bma = data.snaps[BMA] ?? [];
  const flooded = bma.filter((r) => (r.status ?? "").startsWith("น้ำท่วม"));
  const ddpm = data.snaps[DDPM] ?? [];
  const a4t = [...(data.snaps[A4T] ?? [])].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const a4tAvg = a4t.length ? a4t.reduce((s, r) => s + Number(r.value ?? 0), 0) / a4t.length : null;
  const latestAt = (rs: Snap[]) => rs.map((r) => r.observed_at ?? "").sort().at(-1) ?? null;
  return (
    <section className="mt-10">
      <h2 className="section-heading text-2xl">น้ำท่วม กทม. · อากาศ · รถไฟฟ้า (รอบล่าสุด)</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className={box}>
          <h3 className="font-semibold">น้ำท่วมถนน (เซนเซอร์ กทม.)</h3>
          {bma.length ? <>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{flooded.length} <span className="text-base font-normal">จุด จาก {bma.length} จุดวัด</span></p>
            {flooded.length > 0 && <p className="text-sm">{flooded.slice(0, 5).map((r) => r.name).join(" · ")}</p>}
            <p className="text-xs text-muted-foreground">ค่าที่จุดวัดรายงานล่าสุด {when(latestAt(bma))}</p>
          </> : <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีข้อมูลรอบ 3 วันล่าสุด</p>}
          <Src s={BMA} at={bma[0]?.received_at} />
        </article>
        <article className={box}>
          <h3 className="font-semibold">ระดับน้ำสถานี กทม.และปริมณฑล</h3>
          {tw.length ? <>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{nf(tw[0]!.pct)}% <span className="text-base font-normal">ของตลิ่ง</span></p>
            <p className="text-sm">สถานีสูงสุด: {tw[0]!.name} ({tw[0]!.area}) · {when(tw[0]!.observed_at)}</p>
            <p className="text-sm">ล้นตลิ่ง {tw.filter((r) => (r.pct ?? 0) >= 100).length} จาก {tw.length} สถานี</p>
          </> : <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีข้อมูลรอบ 3 วันล่าสุด</p>}
          <Src s={TW} at={tw[0]?.received_at} />
        </article>
        <article className={box}>
          <h3 className="font-semibold">ประกาศเฝ้าระวังน้ำท่วม (ปภ.)</h3>
          {ddpm.length ? <ul className="mt-1 list-disc pl-5 text-sm">{ddpm.slice(0, 3).map((r) => <li key={r.station_id}>{r.name}</li>)}</ul>
            : <p className="mt-1 text-sm text-muted-foreground">ไม่มีประกาศเฝ้าระวังน้ำท่วมในรอบล่าสุด</p>}
          <Src s={DDPM} at={(data.snaps[DDPM] ?? [])[0]?.received_at} />
        </article>
        <article className={box}>
          <h3 className="font-semibold">PM2.5 กรุงเทพฯ: GISTDA เทียบ Air4Thai</h3>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
            <div><div className="text-xs text-muted-foreground">GISTDA (ดาวเทียม เฉลี่ย 24 ชม.)</div><div className="text-2xl font-semibold tabular-nums">{gistda ? nf(gistda.value) : "—"}</div>{gistda && <div className="text-xs text-muted-foreground">{gistda.date}</div>}</div>
            <div><div className="text-xs text-muted-foreground">Air4Thai (เฉลี่ย {a4t.length} สถานี)</div><div className="text-2xl font-semibold tabular-nums">{nf(a4tAvg)}</div>{a4t[0] && <div className="text-xs text-muted-foreground">สูงสุด {a4t[0].name} {nf(a4t[0].value)} · {when(a4t[0].observed_at)}</div>}</div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">หน่วย µg/m³ · ใช้ค่า GISTDA สำหรับสัญญาณ ค่า Air4Thai แสดงเพื่อเทียบเท่านั้น</p>
          <Src s={A4T} at={a4t[0]?.received_at} />
        </article>
        <article className={`${box} md:col-span-2`}>
          <h3 className="font-semibold">รถไฟฟ้า BTS / MRT — ประกาศเหตุขัดข้อง (3 วันล่าสุด)</h3>
          {data.rail.length ? <ul className="mt-1 space-y-1 text-sm">{data.rail.map((p) => (
            <li key={p.post_id}><b>{p.source.split(" ")[0]}</b> · {when(p.posted_at)} — <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">{p.text.slice(0, 160)}</a></li>
          ))}</ul> : <p className="mt-1 text-sm text-muted-foreground">ไม่พบประกาศเหตุขัดข้องจากบัญชีทางการของ BTS และ MRT</p>}
          <p className="mt-1 text-xs text-muted-foreground">คัดจากโพสต์บน X ของ BTS SkyTrain และ BEM ด้วยคำสำคัญ (ขัดข้อง/ล่าช้า/หยุดให้บริการ) · ไม่นับเป็นสัญญาณ</p>
        </article>
      </div>
    </section>
  );
}

/** All-data: full station/road tables for the latest round of each source. */
export function LocalTables() {
  const { data } = useLocal();
  if (!data) return null;
  const tw = [...(data.snaps[TW] ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const bma = [...(data.snaps[BMA] ?? [])].sort((a, b) => Number((b.status ?? "").startsWith("น้ำท่วม")) - Number((a.status ?? "").startsWith("น้ำท่วม")));
  const a4t = [...(data.snaps[A4T] ?? [])].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const ddpm = data.snaps[DDPM] ?? [];
  const th = "py-1 pr-3 text-left";
  return (
    <section className="mt-8">
      <h2 className="section-heading text-2xl">น้ำท่วม / น้ำท้องถิ่น / ฝุ่นรายสถานี</h2>
      <p className="mt-1 text-sm text-muted-foreground">ค่าทุกจุดจากรอบดึงล่าสุดของแต่ละแหล่ง พร้อมเวลาที่สถานีรายงาน</p>

      <h3 className="mt-4 font-semibold">ระดับน้ำ ThaiWater (กทม. นนทบุรี ปทุมธานี สมุทรปราการ) · {tw.length} สถานี</h3>
      <div className="overflow-x-auto"><table className="mt-1 w-full min-w-[640px] text-sm">
        <thead><tr><th className={th}>สถานี</th><th className={th}>จังหวัด</th><th className={th}>ระดับ (ม.รทก.)</th><th className={th}>% ตลิ่ง</th><th className={th}>สถานะ</th><th className={th}>เวลาสถานี</th></tr></thead>
        <tbody>{tw.map((r) => <tr key={r.station_id} className="border-t border-border"><td className="pr-3">{r.name}</td><td className="pr-3">{r.area}</td><td className="pr-3 tabular-nums">{nf(r.value, 2)}</td><td className={`pr-3 tabular-nums ${(r.pct ?? 0) >= 100 ? "font-semibold text-destructive" : ""}`}>{nf(r.pct)}</td><td className="pr-3">{r.status}</td><td className="pr-3">{when(r.observed_at)}</td></tr>)}</tbody>
      </table></div>
      <Src s={TW} at={tw[0]?.received_at} />

      <h3 className="mt-6 font-semibold">เซนเซอร์น้ำท่วมถนน กทม. · {bma.length} จุด</h3>
      <div className="max-h-96 overflow-auto"><table className="mt-1 w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 bg-background"><tr><th className={th}>รหัส</th><th className={th}>จุดวัด</th><th className={th}>ถนน</th><th className={th}>ระดับ (ซม.)</th><th className={th}>สถานะ</th><th className={th}>เวลา</th></tr></thead>
        <tbody>{bma.map((r) => <tr key={r.station_id} className="border-t border-border"><td className="pr-3">{r.station_id}</td><td className="pr-3">{r.name}</td><td className="pr-3">{r.area}</td><td className="pr-3 tabular-nums">{nf(r.value)}</td><td className={`pr-3 ${(r.status ?? "").startsWith("น้ำท่วม") ? "font-semibold text-destructive" : ""}`}>{r.status}</td><td className="pr-3">{when(r.observed_at)}</td></tr>)}</tbody>
      </table></div>
      <Src s={BMA} at={bma[0]?.received_at} />

      <h3 className="mt-6 font-semibold">ประกาศ ปภ. วันนี้</h3>
      {ddpm.length ? <ul className="mt-1 list-disc pl-5 text-sm">{ddpm.map((r) => <li key={r.station_id}>{r.name}</li>)}</ul> : <p className="text-sm text-muted-foreground">ไม่มีประกาศเฝ้าระวังน้ำท่วม</p>}
      <Src s={DDPM} at={ddpm[0]?.received_at} />

      <h3 className="mt-6 font-semibold">PM2.5 รายสถานี Air4Thai (กทม.) · {a4t.length} สถานี</h3>
      <div className="max-h-96 overflow-auto"><table className="mt-1 w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 bg-background"><tr><th className={th}>สถานี</th><th className={th}>พื้นที่</th><th className={th}>PM2.5 (µg/m³)</th><th className={th}>AQI</th><th className={th}>เวลา</th></tr></thead>
        <tbody>{a4t.map((r) => <tr key={r.station_id} className="border-t border-border"><td className="pr-3">{r.name}</td><td className="pr-3">{r.area}</td><td className="pr-3 tabular-nums">{nf(r.value)}</td><td className="pr-3">{r.status?.replace("AQI ", "") ?? "—"}</td><td className="pr-3">{when(r.observed_at)}</td></tr>)}</tbody>
      </table></div>
      <Src s={A4T} at={a4t[0]?.received_at} />
    </section>
  );
}
