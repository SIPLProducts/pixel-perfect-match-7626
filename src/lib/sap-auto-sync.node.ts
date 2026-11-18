import { definePlugin } from "nitro";
import { runAutomaticSapSync } from "@/lib/sap-auto-sync.server";
import { nextSapSyncBoundary, sapSyncDelay } from "@/lib/sap-sync-schedule";

/** Node-server-only Nitro plugin; the hosted Worker build does not include this timer. */
export default definePlugin((nitro) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  const schedule = () => {
    const now = new Date();
    const next = nextSapSyncBoundary(now);
    timer = setTimeout(() => {
      if (running) { schedule(); return; }
      running = true;
      void runAutomaticSapSync()
        .then(runs => console.info(`[SAP auto-sync] Finished ${runs.length} workspace(s)`))
        .catch(error => console.error(`[SAP auto-sync] ${(error as Error).message}`))
        .finally(() => { running = false; schedule(); });
    }, sapSyncDelay(now));
    timer.unref();
    console.info(`[SAP auto-sync] Next all-plant sync: ${next.toISOString()}`);
  };

  nitro.hooks.hook("close", () => { if (timer) clearTimeout(timer); });
  schedule();
});
