import { createFileRoute } from "@tanstack/react-router";
import { openApiDocument } from "@/lib/openapi";
export const Route = createFileRoute("/api/public/openapi.json")({ staticData: { sitemap: false }, server: { handlers: { GET: async () => Response.json(openApiDocument, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } }) } } });
