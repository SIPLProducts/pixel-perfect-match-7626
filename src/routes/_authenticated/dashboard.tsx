import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/asset360/workspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Operations Dashboard | Sharvi Asset360" },
    { name: "description", content: "Monitor assets, value, assignments, maintenance, and verification activity." },
    { property: "og:title", content: "Sharvi Asset360 Operations Dashboard" },
    { property: "og:description", content: "A secure command center for the complete asset lifecycle." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Workspace,
});
