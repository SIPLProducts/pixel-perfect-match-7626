import { redirect, createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { Workspace } from "@/components/asset360/workspace";
import { workspaceQueryOptions } from "@/lib/workspace-query";
import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  // Administrator-set initial passwords must be replaced before the app opens (server enforces it too).
  beforeLoad: ({ context }) => { if (context.user.app_metadata?.["must_change_password"] === true) throw redirect({ to: "/reset-password" }); },
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(workspaceQueryOptions(context.user.id)); },
  pendingComponent: () => <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Preparing your workspace…</main>,
  errorComponent: WorkspaceError,
  notFoundComponent: () => <main className="p-8">Workspace not found.</main>,
  head: () => ({ meta: [
    { title: "Operations Dashboard | HBL Asset360" },
    { name: "description", content: "Monitor assets, value, assignments, maintenance, and verification activity." },
    { property: "og:title", content: "HBL Asset360 Operations Dashboard" },
    { property: "og:description", content: "A secure command center for the complete asset lifecycle." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Workspace,
});

function WorkspaceError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const failedPageDownload = /failed to fetch dynamically imported module|importing a module script failed|loading chunk .* failed/i.test(error instanceof Error ? error.message : String(error));
  return <main className="grid min-h-screen place-items-center bg-background"><div className="space-y-4 text-center"><h1 className="text-xl font-semibold">Workspace unavailable</h1><Button onClick={() => {
    if (failedPageDownload) { window.location.reload(); return; }
    void router.invalidate();
    reset();
  }}>Try again</Button></div></main>;
}
