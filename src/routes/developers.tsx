import { Outlet, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/developers")({ staticData: { sitemap: false }, component: () => <Outlet /> });
