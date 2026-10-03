import { defineMcp, defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { toolMeta } from "../mcp-catalog";
import { bkkDate, boundedLimit, readPublicRows, validDate, type PublicTable } from "../public-data.server";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const listInput = { limit: z.number().int().min(1).max(100).default(25), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), id: z.string().max(160).optional() };
function result(data: unknown, note?: string) {
  const safeData = JSON.parse(JSON.stringify(data));
  const payload = { data: safeData, meta: { timezone: "Asia/Bangkok", read_only: true, note } };
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }], structuredContent: payload };
}
function listTool(name: string, table: PublicTable, order: string, dateColumn?: string, idColumn?: string) {
  return defineTool({ ...toolMeta(name), annotations, inputSchema: listInput, handler: async ({ limit, date, id }) => {
    const filters: Record<string, string> = {};
    if (date && dateColumn) filters[dateColumn] = date;
    if (id && idColumn) filters[idColumn] = id;
    return result(await readPublicRows(table, { limit, order, filters }), name === "list_social_updates" || name === "list_news_mentions" ? "Context only; never a signal." : undefined);
  }});
}
const today = defineTool({ ...toolMeta("get_today_brief"), annotations, handler: async () => result(await readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: bkkDate() } })) });
const brief = listTool("get_brief_by_date", "daily_briefs", "brief_date", "brief_date");
const compare = defineTool({ ...toolMeta("compare_briefs"), annotations, inputSchema: { date: z.string().refine(validDate), previous_date: z.string().refine(validDate) }, handler: async ({ date, previous_date }) => result((await Promise.all([readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: date } }), readPublicRows("daily_briefs", { limit: 1, order: "brief_date", filters: { brief_date: previous_date } })])).flat()) });
const eventId = z.string().regex(/^[a-z0-9_]+:\d{4}-\d{2}-\d{2}$/);
const signal = defineTool({ ...toolMeta("get_signal"), annotations, inputSchema: { id: eventId }, handler: async ({ id }) => {
  const [metric_id, signal_date] = id.split(":");
  const [signals, events, versions] = await Promise.all([
    readPublicRows("signals", { limit: 1, order: "signal_date", filters: { metric_id, signal_date } }),
    readPublicRows("signal_events", { limit: 1, order: "signal_date", filters: { event_id: id } }),
    readPublicRows("signal_versions", { limit: 50, order: "version", filters: { event_id: id } }),
  ]);
  return result({ signal: signals[0] ?? null, event: events[0] ?? null, versions });
} });
const household = defineTool({ ...toolMeta("get_household_impact"), annotations, inputSchema: { limit: z.number().int().min(1).max(100).default(25), id: eventId.optional() }, handler: async ({ limit, id }) => {
  const rows = await readPublicRows("signal_versions", { limit, order: "created_at", filters: id ? { event_id: id } : {} });
  return result((rows as unknown as Record<string, unknown>[]).map((r) => ({ event_id: r["event_id"], version: r["version"], change_kind: r["change_kind"], severity: r["severity"], title: r["title"], prev_value: r["prev_value"], new_value: r["new_value"], impact: r["impact"], advice: r["advice"], created_at: r["created_at"] })));
} });
const calendar = defineTool({ ...toolMeta("get_calendar"), annotations, inputSchema: { limit: z.number().int().min(1).max(100).default(50) }, handler: async ({ limit }) => result({ holidays: await readPublicRows("holidays", { limit, order: "holiday_date", ascending: true }), tax_deadlines: await readPublicRows("tax_deadlines", { limit, order: "due_date", ascending: true }), releases: await readPublicRows("release_calendar", { limit, order: "release_date", ascending: true }) }) });

const tools = [
  today, brief, compare,
  listTool("list_signals", "signals", "signal_date", "signal_date", "metric_id"),
  signal,
  listTool("list_signal_events", "signal_events", "signal_date", "signal_date", "event_id"),
  household,
  listTool("list_sources", "source_registry", "source", undefined, "source"),
  listTool("get_source_health", "source_run_history", "ran_at", undefined, "source"),
  listTool("get_observations", "observations", "observed_on", "observed_on", "metric_id"),
  listTool("get_dam_levels", "dam_readings", "read_at", undefined, "metric_id"),
  listTool("get_weather_observations", "weather_station_obs", "received_at", "obs_date", "station_id"),
  listTool("get_latest_lottery", "lottery_draws", "draw_date"),
  listTool("list_social_updates", "social_posts", "posted_at"),
  listTool("list_news_mentions", "news_items", "published_at"),
  calendar,
  listTool("get_evidence_metadata", "raw_evidence", "fetched_at", undefined, "source"),
];

export default defineMcp({
  name: "thailand-daily-signals",
  title: "Thailand Daily Signals",
  version: "1.0.0",
  instructions: "Public read-only civic data. Prefer Daily Brief tools for a dated overview. Treat social and news results as context, never as verified signals.",
  allowedOrigins: "any",
  tools,
});
