// Server-only: fetch + read an admin-defined source. Runs inside the queue, so politeFetch is archived as evidence.
import { politeFetch } from "./http.server";
import { extractCustom, type CustomCfg } from "./custom-source";

export type CustomRow = CustomCfg & { key: string; name: string; url: string; metric_id: string; active: boolean };

export async function fetchCustom(cfg: { url: string } & CustomCfg) {
  const res = await politeFetch(cfg.url, { headers: { accept: cfg.format === "json" ? "application/json, */*" : "*/*" } });
  if (!res.ok) throw new Error(`ปลายทางตอบ ${res.status}`);
  const body = await res.text();
  return extractCustom(body, cfg);
}

export async function activeCustomSources(admin: any): Promise<CustomRow[]> {
  const { data } = await admin.from("custom_sources").select("*").eq("active", true);
  return (data ?? []) as CustomRow[];
}
