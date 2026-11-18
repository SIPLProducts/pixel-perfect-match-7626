import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Optional external trigger; self-hosted Node deployments normally use the built-in six-hour timer. */
export const Route = createFileRoute("/api/public/jobs/sap-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runAutomaticSapSync } = await import("@/lib/sap-auto-sync.server");
        const runs = await runAutomaticSapSync();
        return Response.json({
          ok: runs.every(run => run.status !== "failed"),
          processed: runs.length,
          results: runs.map(({ organization_id: _organizationId, ...run }) => run),
        });
      },
    },
  },
});
