import { createFileRoute } from "@tanstack/react-router";
import { API_SPEC } from "@/lib/openapi";
import { boundedLimit, PUBLIC_TABLES, readPublicRows, validDate, type PublicTable } from "@/lib/public-data.server";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "public, max-age=60", "Content-Type": "application/json; charset=utf-8" };
const map: Record<string, { table: PublicTable; order: string; date?: string; id?: string; note?: string }> = Object.fromEntries(API_SPEC.map((r) => [r.path, r]));
const API_RESOURCES = API_SPEC.map((r) => [r.path] as const);
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: cors }); }
export const Route = createFileRoute("/api/public/v1/$")({ staticData: { sitemap: false }, server: { handlers: {
  OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
  GET: async ({ request, params }) => {
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: allowed } = await supabaseAdmin.rpc("hit_rate_limit", { _bucket: `api:${ip}`, _limit: 120 });
      if (allowed === false) return new Response(JSON.stringify({ error: { code: "rate_limited", message: "Too many requests: max 120 per minute" } }), { status: 429, headers: { ...cors, "Retry-After": "60", "Cache-Control": "no-store" } });
    } catch { /* limiter unavailable: serve anyway */ }
    const resource = params._splat?.replace(/^\/+|\/+$/g, "") ?? "";
    if (!API_RESOURCES.some(([path]) => path === resource) || !map[resource]) return json({ error: { code: "not_found", message: "Unknown public resource" } }, 404);
    const url = new URL(request.url); const limit = boundedLimit(url.searchParams.get("limit")); const date = url.searchParams.get("date"); const id = url.searchParams.get("id");
    if (date && !validDate(date)) return json({ error: { code: "invalid_query", message: "date must use YYYY-MM-DD" } }, 400);
    if (id && id.length > 160) return json({ error: { code: "invalid_query", message: "id is too long" } }, 400);
    const spec = map[resource]; if (!PUBLIC_TABLES.has(spec.table)) return json({ error: { code: "forbidden_resource", message: "Resource is not public" } }, 403);
    const filters: Record<string, string> = {}; if (date && spec.date) filters[spec.date] = date; if (id && spec.id) filters[spec.id] = id;
    try { const data = await readPublicRows(spec.table, { limit, order: spec.order, filters }); return json({ data, meta: { resource, count: data.length, limit, timezone: "Asia/Bangkok", read_only: true, note: spec.note ?? null } }); }
    catch { return json({ error: { code: "read_failed", message: "Public data could not be read" } }, 500); }
  },
} } });
