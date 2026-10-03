// AI illustrations for the Daily Brief front page. Images carry no text/numbers; labelled as AI on screen.
// Generated once per brief date (missing slots only); 402/403 pauses via app_settings.brief_images_paused.
const MODEL = "openai/gpt-image-2.5-sunburst";
const BUCKET = "brief-images";

const SCENE: Record<string, string> = {
  oil: "a Thai petrol station forecourt at dawn with fuel pumps and motorbikes queueing",
  gold: "a traditional Yaowarat gold shop window in Bangkok Chinatown with gold jewellery on red velvet",
  food: "a busy Thai fresh market stall with pork, eggs, chicken, rice and morning glory, vendor's hands",
  farm: "Thai farmers in a rice field with rubber and palm plantations behind, golden morning light",
  fx: "Thai baht banknotes and coins on a counter at a money exchange booth, Bangkok street behind",
  water: "a large concrete dam on the Pasak river releasing water through spillway gates, central Thailand",
  weather: "dramatic monsoon clouds over the Bangkok skyline with people holding umbrellas on a street",
  air: "hazy Bangkok skyline at morning with commuters wearing face masks on a skywalk",
  traffic: "Bangkok rush-hour traffic on an expressway with red tail lights, aerial view",
  lottery: "a Thai street lottery ticket vendor with a wooden display of tickets on a sidewalk",
  calm: "a calm early morning in Bangkok, Chao Phraya river with boats and temples at sunrise, people starting their day",
};

const prompt = (fam: string) =>
  `Photorealistic Thai newspaper front-page news photo: ${SCENE[fam] ?? SCENE["calm"]}. Documentary photojournalism style, natural colours, sharp, 35mm. Absolutely no text, letters, numbers, signs with writing, logos or watermarks anywhere in the image.`;

async function generate(p: string, key: string): Promise<Uint8Array> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: MODEL, prompt: p, size: "1536x1024", quality: "medium" }),
    });
    if (res.ok) {
      const j: any = await res.json();
      const b64 = j?.data?.[0]?.b64_json;
      if (!b64) throw new Error("ไม่มีรูปในคำตอบ");
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
    const msg = `${res.status} ${(await res.text()).slice(0, 200)}`;
    if (res.status === 402 || res.status === 403) { const e: any = new Error(msg); e.pause = true; throw e; }
    if (!(res.status === 429 || res.status >= 500) || attempt === 1) throw new Error(msg);
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error("unreachable");
}

export async function ensureBriefImages(admin: any, date: string): Promise<{ made: number; error?: string | undefined }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { made: 0, error: "no LOVABLE_API_KEY" };
  const { data: paused } = await admin.from("app_settings").select("value").eq("key", "brief_images_paused").maybeSingle();
  if (paused?.value) return { made: 0, error: `paused: ${paused.value}` };
  const { data: lock } = await admin.from("job_locks").select("locked_until").eq("name", "brief_images_run").maybeSingle();
  if (lock && new Date(lock.locked_until) > new Date()) return { made: 0, error: "running" };
  await admin.from("job_locks").upsert({ name: "brief_images_run", locked_until: new Date(Date.now() + 5 * 60e3).toISOString() });

  const { data: b } = await admin.from("daily_briefs").select("items").eq("brief_date", date).maybeSingle();
  if (!b) return { made: 0, error: "no brief" };
  const fams = [...new Set(((b.items ?? []) as any[]).map((i) => i.family as string))];
  const slots = [{ slot: "hero", fam: fams[0] ?? "calm" }, ...fams.slice(1, 4).map((f, i) => ({ slot: `s${i + 1}`, fam: f }))];
  const { data: have } = await admin.from("brief_images").select("slot,family_id").eq("brief_date", date);
  const todo = slots.filter((s) => !have?.some((h: any) => h.slot === s.slot && h.family_id === s.fam));
  let made = 0, error: string | undefined;
  await Promise.all(todo.map(async (s) => {
    try {
      const p = prompt(s.fam);
      const bytes = await generate(p, key);
      const path = `${date}/${s.slot}-${s.fam}-${Date.now()}.png`;
      const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      await admin.from("brief_images").upsert({ brief_date: date, slot: s.slot, family_id: s.fam, storage_path: path, prompt: p }, { onConflict: "brief_date,slot" });
      made++;
    } catch (e: any) {
      error = String(e?.message ?? e);
      if (e?.pause) await admin.from("app_settings").upsert({ key: "brief_images_paused", value: error });
    }
  }));
  await admin.from("job_locks").delete().eq("name", "brief_images_run");
  return { made, error };
}
