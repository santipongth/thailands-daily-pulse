// Server-only: tracks official datasets on gdcatalog.go.th (national CKAN catalog).
// One snapshot per dataset per Bangkok day; diffs vs the previous snapshot become gov_changes and signals.

const API = "https://gdcatalog.go.th/api/3/action/package_search";

export const CATALOG_AGENCIES = [
  { key: "dld", metric: "cat_dld", agency: "กรมปศุสัตว์", q: "กรมปศุสัตว์" },
  { key: "md", metric: "cat_md", agency: "กรมเจ้าท่า", q: "กรมเจ้าท่า" },
  { key: "bma", metric: "cat_bma", agency: "กรุงเทพมหานคร", q: "organization_title:กรุงเทพมหานคร OR กรุงเทพมหานคร" },
  { key: "pao", metric: "cat_pao", agency: "อบจ./ท้องถิ่น", q: "องค์การบริหารส่วนจังหวัด" },
  { key: "ddc", metric: "cat_ddc", agency: "กรมควบคุมโรค", q: "กรมควบคุมโรค" },
  { key: "dlt", metric: "cat_dlt", agency: "กรมการขนส่งทางบก", q: "กรมการขนส่งทางบก" },
];
export const catalogSourceName = (agency: string) => `ข้อมูลเปิดภาครัฐ: ${agency}`;

const MAX_CSV_DOWNLOADS = 12;
const fmtN = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

async function csvStats(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 ThailandDailySignals" } });
  if (!res.ok) throw new Error(`csv ${res.status}`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > 2_000_000) return null;
  const text = (await res.text()).slice(0, 2_000_000);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let total = 0;
  for (const l of lines.slice(1)) for (const c of l.split(",")) {
    const n = Number(c.replace(/["\s]/g, ""));
    if (c.trim() && Number.isFinite(n)) total += n;
  }
  return { rows: Math.max(0, lines.length - 1), total: +total.toFixed(2) };
}

export async function runCatalog(admin: any, date: string) {
  const runs: any[] = [];
  let downloads = 0;
  for (const a of CATALOG_AGENCIES) {
    const source = catalogSourceName(a.agency);
    const ran_at = new Date().toISOString();
    try {
      const u = new URL(API);
      u.searchParams.set("q", a.q);
      u.searchParams.set("rows", "40");
      u.searchParams.set("sort", "metadata_modified desc");
      const res = await fetch(u, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pkgs: any[] = (await res.json())?.result?.results ?? [];
      const ids = pkgs.map((p) => p.id);
      const { data: known } = await admin.from("gov_datasets").select("id").eq("agency", a.agency);
      const agencyBaseline = (known ?? []).length === 0;
      const { data: today } = await admin.from("gov_snapshots").select("dataset_id").eq("snap_date", date).in("dataset_id", ids);
      const done = new Set((today ?? []).map((r: any) => r.dataset_id));
      let changed = 0;
      const todo = pkgs.filter((p) => !done.has(p.id));
      await admin.from("gov_datasets").upsert(
        todo.map((p) => ({ id: p.id, agency: a.agency, org: p.organization?.title ?? null, title: p.title, url: `https://gdcatalog.go.th/dataset/${p.name}` })),
        { onConflict: "id", ignoreDuplicates: true },
      );
      const { data: prevAll } = await admin.from("gov_snapshots").select("*").in("dataset_id", todo.map((p) => p.id)).lt("snap_date", date).order("snap_date", { ascending: false });
      const prevMap = new Map<string, any>();
      for (const r of prevAll ?? []) if (!prevMap.has(r.dataset_id)) prevMap.set(r.dataset_id, r);
      const snaps: any[] = [];
      const changes: any[] = [];
      for (const p of todo) {
        const res0 = (p.resources ?? []).find((r: any) => String(r.format).toUpperCase() === "CSV");
        const hash = (p.resources ?? []).map((r: any) => `${r.id}:${r.last_modified ?? r.metadata_modified ?? ""}:${r.size ?? ""}`).join("|");
        const prev = prevMap.get(p.id);
        const metaChanged = !prev || prev.metadata_modified !== p.metadata_modified || prev.resource_hash !== hash;
        let rows: number | null = prev?.row_count ?? null, total: number | null = prev?.numeric_total ?? null;
        if (res0?.url && metaChanged && !agencyBaseline && downloads < MAX_CSV_DOWNLOADS) {
          downloads++;
          try { const st = await csvStats(res0.url); if (st) { rows = st.rows; total = st.total; } } catch { /* keep previous stats */ }
        }
        snaps.push({ dataset_id: p.id, snap_date: date, metadata_modified: p.metadata_modified, resource_hash: hash, row_count: rows, numeric_total: total, csv_url: res0?.url ?? null });

        let change: { kind: string; before: string | null; after: string | null; reason: string } | null = null;
        const who = `${a.agency}${p.organization?.title && !p.organization.title.includes(a.agency) ? ` (${p.organization.title})` : ""}`;
        if (!prev) {
          const created = String(p.metadata_created ?? "").slice(0, 10);
          if (!agencyBaseline && created >= prevDay(date)) {
            change = { kind: "new", before: null, after: rows != null ? `${fmtN(rows)} แถว` : null, reason: `${who} เผยแพร่ชุดข้อมูลใหม่ "${p.title}" (สร้างเมื่อ ${created})` };
          }
        } else if (metaChanged) {
          const parts: string[] = [`อัปเดตไฟล์เมื่อ ${String(p.metadata_modified).slice(0, 10)}`];
          let kind = "updated";
          if (prev.row_count != null && rows != null && rows !== prev.row_count) { parts.push(`จำนวนแถว ${fmtN(prev.row_count)} → ${fmtN(rows)} (${rows > prev.row_count ? "+" : ""}${fmtN(rows - prev.row_count)})`); kind = "rows"; }
          if (prev.numeric_total != null && total != null && Number(total) !== Number(prev.numeric_total)) { parts.push(`ผลรวมตัวเลข ${fmtN(Number(prev.numeric_total))} → ${fmtN(total)}`); if (kind !== "rows") kind = "value"; }
          change = {
            kind,
            before: prev.row_count != null ? `${fmtN(prev.row_count)} แถว${prev.numeric_total != null ? ` · รวม ${fmtN(Number(prev.numeric_total))}` : ""}` : String(prev.metadata_modified ?? "").slice(0, 10),
            after: rows != null ? `${fmtN(rows)} แถว${total != null ? ` · รวม ${fmtN(total)}` : ""}` : String(p.metadata_modified).slice(0, 10),
            reason: `${who} อัปเดตชุดข้อมูล "${p.title}" — ${parts.join(", ")}`,
          };
        }
        if (change) {
          changed++;
          changes.push({ dataset_id: p.id, agency: a.agency, change_date: date, kind: change.kind, before_text: change.before, after_text: change.after, reason_th: change.reason });
        }
      }
      if (snaps.length) await admin.from("gov_snapshots").upsert(snaps, { onConflict: "dataset_id,snap_date" });
      if (changes.length) await admin.from("gov_changes").upsert(changes, { onConflict: "dataset_id,change_date" });
      await writeSignal(admin, a, date);
      runs.push({ source, url: u.toString(), kind: "catalog", ok: true, rows: pkgs.length, error: null, ran_at, last_ok_at: ran_at,
        sample: agencyBaseline ? `เก็บฐานข้อมูลเริ่มต้น ${pkgs.length} ชุด (เริ่มเทียบพรุ่งนี้)` : `ติดตาม ${pkgs.length} ชุด · เปลี่ยนรอบนี้ ${changed}` });
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      runs.push({ source, url: API, kind: "catalog", ok: false, rows: 0, ran_at, error: /timed out|timeout|abort/i.test(m) ? "ศูนย์ข้อมูลภาครัฐไม่ตอบสนองภายใน 20 วินาที" : m.slice(0, 200) });
    }
  }
  return runs;
}

function prevDay(d: string) {
  return new Date(new Date(`${d}T00:00:00Z`).getTime() - 86400e3).toISOString().slice(0, 10);
}

async function writeSignal(admin: any, a: (typeof CATALOG_AGENCIES)[number], date: string) {
  const { data: ch } = await admin.from("gov_changes").select("kind,reason_th,gov_datasets(title)").eq("agency", a.agency).eq("change_date", date);
  const list: any[] = ch ?? [];
  if (!list.length) return;
  const strong = list.some((c) => c.kind !== "updated");
  const title = `${a.agency}: ชุดข้อมูลทางการเปลี่ยน ${list.length} ชุด — ${list[0].gov_datasets?.title ?? ""}`.slice(0, 200);
  await admin.from("signals").upsert(
    { family_id: "govdata", metric_id: a.metric, signal_date: date, severity: strong ? "medium" : "low", title, prev_value: 0, new_value: list.length, change_abs: list.length, change_pct: null, is_demo: false },
    { onConflict: "metric_id,signal_date" },
  );
}
