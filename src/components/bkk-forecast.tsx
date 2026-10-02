import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBkkForecast } from "@/lib/signals.functions";
import { TMD_BKK_URL } from "@/lib/tmd-forecast";

export function BkkForecast() {
  const fn = useServerFn(getBkkForecast);
  const { data, isLoading } = useQuery({ queryKey: ["bkk-forecast"], queryFn: () => fn(), staleTime: 30 * 60e3 });
  if (isLoading) return <div className="border border-foreground/30 p-4 text-sm text-muted-foreground">กำลังโหลดพยากรณ์อากาศ กทม.…</div>;
  if (!data) return <div className="border border-foreground/30 p-4 text-sm text-muted-foreground">ยังดึงพยากรณ์จากกรมอุตุฯ ไม่ได้ — ตรวจสอบไม่ได้ (ไม่ใช่ “ไม่เปลี่ยน”)</div>;
  return (
    <section className="border border-foreground/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-up">พยากรณ์อากาศ กทม.และปริมณฑล</p>
      <p className="mt-2 font-display text-lg leading-snug">{data.conditionTh}{data.rainChanceTh ? ` (${data.rainChanceTh})` : ""}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {data.maxRange && <span>ร้อนสุด <b>{data.maxRange[0]}–{data.maxRange[1]}°C</b></span>}
        {data.minRange && <span>เย็นสุด <b>{data.minRange[0]}–{data.minRange[1]}°C</b></span>}
        {data.windTh && <span>{data.windTh}</span>}
      </div>
      {data.provinces.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {data.provinces.map((p) => <li key={p.name}>{p.name} <span className="tabular-nums">{p.min}–{p.max}°C</span></li>)}
        </ul>
      )}
      {data.advice.length > 0 && <p className="mt-3 text-sm">ควรทำ: {data.advice.join(" · ")}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        ที่มา: <a href={TMD_BKK_URL} target="_blank" rel="noreferrer" className="underline">กรมอุตุนิยมวิทยา</a>
        {data.validFrom ? ` · มีผลตั้งแต่ ${data.validFrom} น. 24 ชม.` : ""}
        {data.from === "archive" ? " · แสดงจากไฟล์ดิบล่าสุดที่เก็บไว้" : ""} · ต้นฉบับ: “{data.conditionEn}”
      </p>
    </section>
  );
}
