// Server-only: official Government Lottery Office results, verified against a second GLO endpoint.
import { politeFetch } from "./http.server";

const H = { "Content-Type": "application/json", accept: "application/json, */*" };
const nums = (tier: any): string[] => (tier?.number ?? []).map((n: any) => String(n.value));

export async function syncLottery(admin: any) {
  const res = await politeFetch("https://www.glo.or.th/api/lottery/getLatestLottery", { method: "POST", headers: H, body: "{}" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const r = (await res.json())?.response;
  const date: string | undefined = r?.date;
  const first = nums(r?.data?.first)[0];
  if (!date || !first || !/^\d{6}$/.test(first)) throw new Error("ไม่พบผลรางวัลที่ 1 ในข้อมูล GLO");

  // verify with the by-date endpoint
  let verified = false;
  try {
    const [y, m, d] = date.split("-");
    const v = await politeFetch("https://www.glo.or.th/api/checking/getLotteryResult", { method: "POST", headers: H, body: JSON.stringify({ date: d, month: m, year: y }) });
    const vr = (await v.json())?.response?.result;
    verified = nums(vr?.data?.first)[0] === first;
  } catch { /* stays unverified */ }

  const row = {
    draw_date: date,
    first,
    last2: nums(r.data.last2)[0] ?? null,
    front3: nums(r.data.last3f),
    back3: nums(r.data.last3b),
    pdf_url: r.pdf_url ?? null,
    video_url: r.youtube_url ?? null,
    verified,
    fetched_at: new Date().toISOString(),
  };
  await admin.from("lottery_draws").upsert(row, { onConflict: "draw_date" });
  if (verified) {
    const th = new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    await admin.from("signals").upsert(
      { family_id: "lottery", metric_id: "lotto", signal_date: date, severity: "medium", title: `สลากกินแบ่งรัฐบาล งวด ${th} รางวัลที่ 1: ${first} · เลขท้าย 2 ตัว ${row.last2 ?? "-"}`, prev_value: null, new_value: Number(first), change_abs: null, change_pct: null, is_demo: false, checks: { rule: "release", trust: "high", source: "GLO", verified: true } },
      { onConflict: "metric_id,signal_date" },
    );
  }
  return { date, first, verified };
}
