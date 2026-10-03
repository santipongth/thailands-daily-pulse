export const API_RESOURCES = [
  ["briefs", "Daily Briefs and their data windows"], ["brief-updates", "Updates received after the brief cutoff"],
  ["signals", "Detected meaningful changes"], ["events", "Versioned signal events"],
  ["sources", "Public source registry"], ["source-health", "Latest source collection outcomes"],
  ["observations", "Public numeric observations"], ["dams", "Hourly dam readings"],
  ["weather", "Bangkok-area weather station observations"], ["lottery", "Verified GLO lottery draws"],
  ["social", "FM91 posts selected for Bangkok relevance; not signals"], ["news", "Tagged news mentions; not signals"],
  ["holidays", "Public holidays"], ["tax-deadlines", "Tax filing deadlines"],
  ["calendar", "Official release calendar"], ["evidence", "Raw evidence metadata only"],
] as const;

const itemSchema = { type: "object", additionalProperties: true } as const;
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Thailand Daily Signals Public API",
    version: "1.0.0",
    description: "Read-only public data API. Times are ISO 8601; civic reporting uses Asia/Bangkok. Social and news records never create signals.",
  },
  servers: [{ url: "https://thailands-daily-pulse.lovable.app/api/public/v1" }],
  paths: Object.fromEntries(API_RESOURCES.map(([path, description]) => [`/${path}`, {
    get: {
      summary: description,
      operationId: `list_${path.replaceAll("-", "_")}`,
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
        { name: "date", in: "query", schema: { type: "string", format: "date" } },
        { name: "id", in: "query", schema: { type: "string", maxLength: 160 } },
      ],
      responses: {
        "200": { description: "Public records", content: { "application/json": { schema: { type: "object", required: ["data", "meta"], properties: { data: { type: "array", items: itemSchema }, meta: { type: "object" } } } } } },
        "400": { description: "Invalid query" }, "404": { description: "Unknown resource" }, "500": { description: "Upstream read failed" },
      },
    },
  }])),
} as const;
