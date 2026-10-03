import { createFileRoute } from "@tanstack/react-router";
import { API_RESOURCES } from "@/lib/openapi";
import { boundedLimit, PUBLIC_TABLES, readPublicRows, validDate, type PublicTable } from "@/lib/public-data.server";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "public, max-age=60", "Content-Type": "application/json; charset=utf-8" };
const map: Record<string, { table: PublicTable; order: string; date?: string; id?: string; note?: string }> = {
  briefs: { table: "daily_briefs", order: "brief_date", date: "brief_date" }, "brief-updates": { table: "brief_updates", order: "created_at", date: "brief_date" },
  signals: { table: "signals", order: "signal_date", date: "signal_date", id: "event_id" }, events: { table: "signal_events", order: "signal_date", date: "signal_date", id: "event_id" },
  sources: { table: "source_registry", order: "source", id: "source" }, "source-health": { table: "source_run_history", order: "ran_at", id: "source" }, observations: { table: "observations", order: "observed_on", date: "observed_on", id: "metric_id" },
  dams: { table: "dam_readings", order: "read_at", id: "metric_id" }, weather: { table: "weather_station_obs", order: "received_at", date: "obs_date", id: "station_id" }, lottery: { table: "lottery_draws", order: "draw_date" },
  social: { table: "social_posts", order: "posted_at", note: "Context only; not a verified signal." }, news: { table: "news_items", order: "published_at", note: "Context only; never creates or ranks a signal." },
  holidays: { table: "holidays", order: "holiday_date" }, "tax-deadlines": { table: "tax_deadlines", order: "due_date" }, calendar: { table: "release_calendar", order: "release_date" }, evidence: { table: "raw_evidence", order: "fetched_at", id: "source" },
};
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: cors }); }
export const Route = createFileRoute("/api/public/v1/$")({ staticData: { sitemap: false }, server: { handlers: {
  OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
  GET: async ({ request, params }) => {
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
