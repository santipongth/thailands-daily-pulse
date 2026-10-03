import { Link } from "@tanstack/react-router";
export function DeveloperNav() {
  return <nav aria-label="เอกสารนักพัฒนา" className="mt-6 flex flex-wrap gap-2 border-y border-border py-3 text-sm"><Link to="/developers" className="border border-border px-3 py-2 hover:bg-muted">ภาพรวม</Link><Link to="/developers/api" className="border border-border px-3 py-2 hover:bg-muted">REST API</Link><Link to="/developers/mcp" className="border border-border px-3 py-2 hover:bg-muted">MCP</Link><a href="/api/public/openapi.json" className="border border-border px-3 py-2 hover:bg-muted">OpenAPI JSON</a></nav>;
}
