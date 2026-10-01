import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BASKET, basketLines } from "@/lib/impact";

const b2 = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sign = (n: number) => (n > 0.005 ? `+${b2(n)}` : n < -0.005 ? `−${b2(-n)}` : "0.00");

export function HouseholdBasket({ date }: { date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["basket", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("metric_id,observed_on,value")
        .in("metric_id", BASKET.map((b) => b.metric_id)).eq("is_demo", false).lte("observed_on", date)
        .order("observed_on", { ascending: false }).limit(300);
      if (error) throw error;
      return basketLines(data ?? [], date);
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">กำลังคำนวณค่าใช้จ่ายครัวเรือน…</p>;
  const lines = data ?? [];
  if (!lines.length) return null;
  const total = lines.reduce((s, l) => s + l.costCur, 0);
  const delta = lines.reduce((s, l) => s + l.delta, 0);
  return (
    <section className="border-2 border-foreground p-4">
      <h2 className="font-display text-xl">ตัวอย่างค่าใช้จ่ายครัวเรือนต่อวัน</h2>
      <p className="text-xs text-muted-foreground">ตะกร้าอ้างอิงคงที่ × ราคาจริงล่าสุด เทียบราคาครั้งก่อน (คำนวณโดยระบบ ไม่ใช่ AI)</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-1">รายการ</th><th>ปริมาณ/วัน</th><th>ราคาก่อน</th><th>ราคาล่าสุด</th><th>ค่าใช้จ่าย/วัน</th><th>เปลี่ยน/วัน</th></tr></thead>
          <tbody>{lines.map((l) => (
            <tr key={l.metric_id} className="border-b border-border">
              <td className="py-1">{l.label}</td><td>{l.qty} {l.unit}</td>
              <td className="tabular-nums">{l.prev == null ? <span className="text-xs text-muted-foreground">ยังไม่มีข้อมูลเทียบ</span> : <>{b2(l.prev)} <span className="text-xs text-muted-foreground">({l.prevDate})</span></>}</td>
              <td className="tabular-nums font-semibold">{b2(l.cur)} <span className="text-xs font-normal text-muted-foreground">({l.curDate})</span></td>
              <td className="tabular-nums">{b2(l.costCur)} ฿</td>
              <td className={`tabular-nums ${l.delta > 0.005 ? "text-destructive font-semibold" : l.delta < -0.005 ? "text-primary font-semibold" : ""}`}>{l.prev == null ? "—" : `${sign(l.delta)} ฿`}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">รวม <b>{b2(total)} บาท/วัน</b> · เทียบครั้งก่อน <b>{sign(delta)} บาท/วัน</b> ≈ <b>{sign(delta * 30)} บาท/เดือน</b></p>
      <p className="mt-1 text-xs text-muted-foreground">สูตร: (ราคาล่าสุด − ราคาก่อน) × ปริมาณต่อวัน; ต่อเดือน = × 30 · ปริมาณตะกร้าเป็นค่าสมมติของครอบครัว 3–4 คน</p>
    </section>
  );
}
