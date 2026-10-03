// OpenAI-compatible AI endpoint. Defaults to the Lovable AI gateway; self-hosters set AI_BASE_URL (+ AI_API_KEY).
export function aiUrl(path: string) {
  const base = (process.env["AI_BASE_URL"] || "https://ai.gateway.lovable.dev/v1").replace(/\/+$/, "");
  return base + path;
}
export function aiKey() { return process.env["AI_API_KEY"] || process.env["LOVABLE_API_KEY"]; }
