// Server-only: EPPO renders LPG prices client-side, so the page is opened via Firecrawl and an AI
// reads the PTT 15 kg cooking gas price + effective date; parseLpgAiResult verifies the quotes.
import { aiUrl } from "./ai-endpoint";
import { firecrawlMarkdown } from "./http.server";
import { EPPO_LPG_PAGE, parseLpgAiResult, type LpgAi } from "./daily-prices";

const MODEL = "openai/gpt-6-astra";

async function askAi(page: string): Promise<LpgAi> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY ไม่ได้ตั้งค่า");
  const prompt = `อ่านตารางราคาขายปลีก LPG จากหน้าเว็บ สนพ. ด้านล่าง หาราคา "ก๊าซหุงต้ม ถัง 15 กก." ของ PTT (คอลัมน์ PTT) และ "วันที่มีผลบังคับใช้ / Effective Date" ของคอลัมน์ PTT และวันที่ในหัวข้อ "ราคาขายปลีก LPG ณ วันที่ ..."
ตอบ JSON อย่างเดียว: {"price_15kg": number, "effective_date": "YYYY-MM-DD" | null, "as_of_date": "YYYY-MM-DD" | null, "price_quote": "คัดลอกข้อความแถว 15 กก. ตรงตัวจากหน้า เช่น '- 15 กก. (kg.) | 423'", "date_quote": "คัดลอกวันที่มีผลของ PTT ตรงตัว เช่น '1 Mar 2023'"}
ห้ามเดา ถ้าไม่พบให้ใส่ null
หน้าเว็บ:
${page}`;
  const r = await fetch(aiUrl("/responses"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: MODEL, input: prompt, stream: true, store: false, reasoning: { effort: "low" } }),
  });
  if (!r.ok || !r.body) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      let ev: any;
      try { ev = JSON.parse(d); } catch { continue; }
      if (ev.type === "response.output_text.delta") text += ev.delta;
      if (ev.type === "response.refusal.delta" || ev.type === "error") throw new Error(`AI ปฏิเสธ/ผิดพลาด: ${JSON.stringify(ev).slice(0, 160)}`);
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI ไม่ได้ตอบเป็น JSON");
  return JSON.parse(m[0]) as LpgAi;
}

/** Returns verified price, page effective date and the date EPPO lists the price "as of". */
export async function readLpgWithAi(today: string, admin?: any) {
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "lpg_ai_paused").maybeSingle();
    if (data?.value === "1") throw new Error("AI อ่านราคา LPG ถูกพักไว้ (เครดิต AI หมด/ถูกปฏิเสธ) — กดเปิดใหม่เมื่อพร้อม");
  }
  const md = await firecrawlMarkdown(EPPO_LPG_PAGE, 8000);
  const i = md.indexOf("ราคาขายปลีก LPG ณ วันที่");
  const page = i >= 0 ? md.slice(i, i + 4000) : md.slice(0, 12000);
  if (!/15\s*กก/.test(page)) throw new Error("หน้า สนพ. ยังไม่แสดงตารางราคาถัง 15 กก. (โหลดไม่ครบ)");
  try {
    return parseLpgAiResult(await askAi(page), page, today);
  } catch (e: any) {
    if (admin && (e?.status === 402 || e?.status === 403)) await admin.from("app_settings").upsert({ key: "lpg_ai_paused", value: "1" });
    throw e;
  }
}
