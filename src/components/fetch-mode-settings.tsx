import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setFetchMode } from "@/lib/settings.functions";

const ITEMS = [
  { key: "longdo_mode", source: "Longdo Traffic Index", label: "Longdo ดัชนีจราจร" },
  { key: "thaiwater_mode", source: "ThaiWater (สสน.)", label: "ThaiWater เขื่อนเจ้าพระยา" },
] as const;
const MODES = [
  { v: "auto", label: "อัตโนมัติ (ตรงก่อน แล้วค่อย Firecrawl)" },
  { v: "direct", label: "ดึงตรงอย่างเดียว" },
  { v: "firecrawl", label: "ผ่าน Firecrawl อย่างเดียว" },
] as const;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");

export function FetchModeSettings() {
  const qc = useQueryClient();
  const save = useServerFn(setFetchMode);
  const [msg, setMsg] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["fetch-modes"],
    queryFn: async () => {
      const [s, r] = await Promise.all([
        supabase.from("app_settings").select("key,value").in("key", ITEMS.map((i) => i.key)),
        supabase.from("source_runs").select("source,ok,ran_at,last_ok_at,error").in("source", ITEMS.map((i) => i.source)),
      ]);
      return { modes: Object.fromEntries((s.data ?? []).map((x) => [x.key, x.value])), runs: new Map((r.data ?? []).map((x) => [x.source, x])) };
    },
  });
  return (
    <section className="mt-12 border-t-2 border-editorial-ink pt-5">
      <h2 className="font-editorial text-3xl text-editorial-red">วิธีดึงข้อมูล</h2>
      <p className="mt-1 text-sm text-muted-foreground">ใช้กับทั้งเว็บ ไม่ใช่เฉพาะเครื่องนี้ — เปลี่ยนเมื่อแหล่งข้อมูลบล็อกวิธีเดิม</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {ITEMS.map((it) => {
          const cur = (data?.modes[it.key] === "firecrawl_first" ? "auto" : data?.modes[it.key]) ?? "auto";
          const run = data?.runs.get(it.source);
          return (
            <div key={it.key} className="border-t border-editorial-rule bg-editorial-surface p-4">
              <label className="font-semibold" htmlFor={it.key}>{it.label}</label>
              <select id={it.key} value={cur} className="mt-2 w-full border border-editorial-rule bg-background p-2 text-sm"
                onChange={async (e) => {
                  const r = await save({ data: { key: it.key, mode: e.target.value as "auto" } });
                  setMsg(r.ok ? "บันทึกแล้ว จะใช้ในรอบดึงถัดไป" : r.error);
                  qc.invalidateQueries({ queryKey: ["fetch-modes"] });
                }}>
                {MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                รอบล่าสุด {dt(run?.ran_at)} · <span className={run?.ok ? "text-primary" : "text-destructive"}>{run ? (run.ok ? "สำเร็จ" : "ไม่สำเร็จ") : "—"}</span> · สำเร็จล่าสุด {dt(run?.last_ok_at)}
              </p>
              {run && !run.ok && run.error && <p className="mt-1 text-xs">{run.error}</p>}
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
    </section>
  );
}
