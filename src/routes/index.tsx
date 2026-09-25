import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
  head: () => ({ meta: [
    { title: "Sharvi Asset360 | Asset Lifecycle Management" },
    { name: "description", content: "Scan, track, verify, and manage every enterprise asset securely." },
    { property: "og:title", content: "Sharvi Asset360" },
    { property: "og:description", content: "QR-powered asset lifecycle management for modern enterprises." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => null,
});
