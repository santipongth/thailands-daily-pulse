import { defineMcp, defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bkkDate, boundedLimit, readPublicRows, validDate, type PublicTable } from "../public-data.server";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const listInput = { limit: z.number().int().min(1).max(100).default(25), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), id: z.string().max(160).optional() };
function result(data: unknown, note?: string) {
  const safeData = JSON.parse(JSON.stringify(data));
  const payload = { data: safeData, meta: { timezone: "Asia/Bangkok", read_only: true, note } };
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }], structuredContent: payload };
}
function listTool(name: string, title: string, description: string, table: PublicTable, order: string, dateColumn?: string, idColumn?: string) {
  return defineTool({ name, title, description, annotations, inputSchema: listInput, handler: async ({ limit, date, id }) => {
    const filters: Record<string, string> = {};
    if (date && dateColumn) filters[dateColumn] = date;
    if (id && idColumn) filters[idColumn] = id;
    return result(await readPublicRows(table, { limit, order, filters }));
  }});
}
const today = defineTool({ name: "get_today_brief", title: "Get today's Daily Brief", description: "Return today's Bangkok Daily Brief, including completeness and cutoff window.", annotations, handler: async () => result(await readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: bkkDate() } })) });
const brief = listTool("get_brief_by_date", "Get Daily Brief by date", "Return one Daily Brief for a Bangkok calendar date.", "daily_briefs", "brief_date", "brief_date");
const compare = defineTool({ name: "compare_briefs", title: "Compare Daily Briefs", description: "Return two Daily Brief editions for direct comparison.", annotations, inputSchema: { date: z.string().refine(validDate), previous_date: z.string().refine(validDate) }, handler: async ({ date, previous_date }) => result((await Promise.all([readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: date } }), readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: previous_date } })])).flat()) });
const household = defineTool({ name: "get_household_impact", title: "Get household impact", description: "Return signal records with their reproducible household-impact fields.", annotations, inputSchema: listInput, handler: async ({ limit, date, id }) => { const rows = await readPublicRows("signals", { limit, order: "signal_date", filters: { ...(date ? { signal_date: date } : {}), ...(id ? { event_id: id } : {}) } }); return result((rows as unknown as Record<string, unknown>[]).map((row) => ({ event_id: row["event_id"], metric_id: row["metric_id"], signal_date: row["signal_date"], impact: row["impact"], checks: row["checks"] }))); } });
const calendar = defineTool({ name: "get_calendar", title: "Get public calendar", description: "Return holidays, tax deadlines, and scheduled official releases.", annotations, inputSchema: { limit: z.number().int().min(1).max(100).default(50) }, handler: async ({ limit }) => result({ holidays: await readPublicRows("holidays", { limit, order: "holiday_date", ascending: true }), tax_deadlines: await readPublicRows("tax_deadlines", { limit, order: "due_date", ascending: true }), releases: await readPublicRows("release_calendar", { limit, order: "release_date", ascending: true }) }) });

const tools = [
  today, brief, compare,
  listTool("list_signals", "List signals", "List detected meaningful changes. News and social posts are excluded.", "signals", "signal_date", "signal_date", "event_id"),
  listTool("get_signal", "Get signal", "Get a signal by event ID.", "signals", "signal_date", undefined, "event_id"),
  listTool("list_signal_events", "List signal events", "List correction and withdrawal-aware signal events.", "signal_events", "signal_date", "signal_date", "event_id"),
  household,
  listTool("list_sources", "List sources", "List the public source registry and collection cadence.", "source_registry", "source"),
  listTool("get_source_health", "Get source health", "List recent public source collection outcomes and failure reasons.", "source_run_history", "ran_at", undefined, "source"),
  listTool("get_observations", "Get observations", "List real and illustrative observations with source timestamps.", "observations", "observed_on", "observed_on", "metric_id"),
  listTool("get_dam_levels", "Get dam levels", "List hourly readings for dams affecting Bangkok.", "dam_readings", "read_at", undefined, "metric_id"),
  listTool("get_weather_observations", "Get weather observations", "List Bangkok-area TMD station observations.", "weather_station_obs", "received_at", "obs_date", "station_id"),
  listTool("get_latest_lottery", "Get latest lottery", "Return verified GLO draw records, newest first.", "lottery_draws", "draw_date"),
  listTool("list_social_updates", "List social updates", "List FM91 Bangkok-relevant context; these records are not signals.", "social_posts", "posted_at"),
  listTool("list_news_mentions", "List news mentions", "List tagged news context; news never creates or ranks signals.", "news_items", "published_at"),
  calendar,
  listTool("get_evidence_metadata", "Get evidence metadata", "List public evidence metadata only; raw files and storage paths are never returned.", "raw_evidence", "fetched_at", undefined, "source"),
];

export default defineMcp({
  name: "thailand-daily-signals",
  title: "Thailand Daily Signals",
  version: "1.0.0",
  instructions: "Public read-only civic data. Prefer Daily Brief tools for a dated overview. Treat social and news results as context, never as verified signals.",
  allowedOrigins: "any",
  tools,
});
