import { createFileRoute } from "@tanstack/react-router";

/** Social share image for a brief: the day's AI hero illustration (no text, public by design) streamed from the private bucket. */
export const Route = createFileRoute("/api/public/og/brief/$date")({
  staticData: { sitemap: false },
  server: { handlers: {
    GET: async ({ params }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) return new Response("bad date", { status: 400 });
      const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
      const { data: row } = await a.from("brief_images").select("storage_path").eq("brief_date", params.date).order("slot").limit(1).maybeSingle();
      let path = row?.storage_path;
      if (!path) {
        const { data: latest } = await a.from("brief_images").select("storage_path").lte("brief_date", params.date).order("brief_date", { ascending: false }).limit(1).maybeSingle();
        path = latest?.storage_path;
      }
      if (!path) return new Response("no image", { status: 404 });
      const { data, error } = await a.storage.from("brief-images").download(path);
      if (error || !data) return new Response("no image", { status: 404 });
      return new Response(data, { headers: { "Content-Type": data.type || "image/png", "Cache-Control": "public, max-age=86400" } });
    },
  } },
});
