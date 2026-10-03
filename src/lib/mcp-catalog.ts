// Browser-safe MCP tool catalog: shown on /developers/mcp and used by src/lib/mcp/index.ts for titles/descriptions.
export type McpToolMeta = { name: string; title: string; description: string; args: string; group: string };
const LIST = "limit 1–100 (25), date YYYY-MM-DD?, id?";
export const MCP_TOOLS: McpToolMeta[] = [
  { group: "Brief", name: "get_today_brief", title: "Get today's Daily Brief", description: "Return today's Bangkok Daily Brief, including completeness and cutoff window.", args: "—" },
  { group: "Brief", name: "get_brief_by_date", title: "Get Daily Brief by date", description: "Return Daily Briefs; date filters brief_date (Bangkok calendar date).", args: LIST + " (id ignored)" },
  { group: "Brief", name: "compare_briefs", title: "Compare Daily Briefs", description: "Return two Daily Brief editions for direct comparison.", args: "date, previous_date (YYYY-MM-DD)" },
  { group: "Signals", name: "list_signals", title: "List signals", description: "List detected meaningful changes. date filters signal_date, id filters metric_id. News and social posts are excluded.", args: LIST },
  { group: "Signals", name: "get_signal", title: "Get signal", description: "Get one signal by event ID (metric_id:YYYY-MM-DD) with its event record and version history.", args: "id = event_id, e.g. lpg:2026-10-04" },
  { group: "Signals", name: "list_signal_events", title: "List signal events", description: "List correction and withdrawal-aware signal events. id filters event_id.", args: LIST },
  { group: "Signals", name: "get_household_impact", title: "Get household impact", description: "Return signal versions with their reproducible household-impact fields and advice. id filters event_id.", args: "limit, id?" },
  { group: "Sources", name: "list_sources", title: "List sources", description: "List the public source registry and collection cadence.", args: "limit, id? (source name)" },
  { group: "Sources", name: "get_source_health", title: "Get source health", description: "List recent public source collection outcomes and failure reasons. id filters source.", args: "limit, id?" },
  { group: "Data", name: "get_observations", title: "Get observations", description: "List real and illustrative observations with source timestamps. date filters observed_on, id filters metric_id.", args: LIST },
  { group: "Data", name: "get_dam_levels", title: "Get dam levels", description: "List hourly readings for dams affecting Bangkok. id filters metric_id.", args: "limit, id?" },
  { group: "Data", name: "get_weather_observations", title: "Get weather observations", description: "List Bangkok-area TMD station observations. date filters obs_date, id filters station_id.", args: LIST },
  { group: "Data", name: "get_latest_lottery", title: "Get latest lottery", description: "Return verified GLO draw records, newest first.", args: "limit" },
  { group: "Context", name: "list_social_updates", title: "List social updates", description: "List FM91 and BTS/MRT posts; context only, these records are not signals.", args: "limit" },
  { group: "Context", name: "list_news_mentions", title: "List news mentions", description: "List tagged and general news context; news never creates or ranks signals.", args: "limit" },
  { group: "Calendar", name: "get_calendar", title: "Get public calendar", description: "Return holidays, tax deadlines, and scheduled official releases (soonest first).", args: "limit 1–100 (50)" },
  { group: "Sources", name: "get_evidence_metadata", title: "Get evidence metadata", description: "List public evidence metadata only; raw files and storage paths are never returned. id filters source.", args: "limit, id?" },
];
export function toolMeta(name: string) {
  const m = MCP_TOOLS.find((t) => t.name === name);
  if (!m) throw new Error(`Unknown MCP tool ${name}`);
  return { name: m.name, title: m.title, description: m.description };
}
