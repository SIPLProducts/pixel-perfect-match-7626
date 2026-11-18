import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callSapEndpoint, findSapRows } from "@/lib/sap-api.server";
import { mapSapRows, SAP_SYNC_BATCH, type SapRow } from "@/lib/sap-asset-sync";
import { selectAssetQrEndpoint } from "@/lib/sap-sync-schedule";
import { beginSapSyncRun, finishSapSyncRun, recordSapSyncBatch, setSapSyncRunTotal, type SapSyncRun } from "@/lib/sap-sync-runs.server";

export type SapAutoSyncSummary = {
  organization_id: string;
  status: "completed" | "failed" | "skipped";
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  message?: string;
};

/** Runs every configured workspace sequentially, keeping outbound requests below runtime limits. */
export async function runAutomaticSapSync(): Promise<SapAutoSyncSummary[]> {
  const { data: connections, error } = await supabaseAdmin.from("sap_connection_settings").select("*").order("organization_id");
  if (error) throw new Error("Could not load SAP connections for automatic sync");
  const summaries: SapAutoSyncSummary[] = [];

  for (const connection of connections ?? []) {
    const org = connection.organization_id;
    let run: SapSyncRun | null = null;
    const totals = { inserted: 0, updated: 0, skipped: 0, total: 0 };
    try {
      const { data: endpoints, error: endpointError } = await supabaseAdmin.from("sap_endpoints").select("id,name,path").eq("organization_id", org).eq("active", true).order("name");
      if (endpointError) throw new Error("Could not load the active SAP API");
      const endpoint = selectAssetQrEndpoint(endpoints ?? []);
      if (!endpoint) {
        summaries.push({ organization_id: org, status: "skipped", ...totals, message: "No active Asset QR API is configured" });
        continue;
      }

      run = await beginSapSyncRun(org, "automatic", 0, null);
      const result = await callSapEndpoint(supabaseAdmin, org, connection, endpoint.id, 60_000_000);
      await supabaseAdmin.from("sap_test_logs").insert({
        organization_id: org,
        endpoint_id: endpoint.id,
        target: "endpoint",
        status: result.status || null,
        latency_ms: result.latency,
        message: `Automatic sync: ${result.message}`,
        actor_id: null,
      });
      if (!result.ok) throw new Error(`SAP request failed: ${result.message}`);

      let rawRows: SapRow[];
      try { rawRows = findSapRows(JSON.parse(result.body)) as SapRow[]; }
      catch { throw new Error("SAP response was not valid JSON"); }
      const mapped = mapSapRows(rawRows);
      totals.total = mapped.length;
      await setSapSyncRunTotal(run.id, org, mapped.length);

      for (let index = 0; index < mapped.length; index += SAP_SYNC_BATCH) {
        const batch = mapped.slice(index, index + SAP_SYNC_BATCH);
        const { data: saved, error: syncError } = await supabaseAdmin.rpc("sync_sap_asset_rows", { _organization_id: org, _rows: batch as never });
        if (syncError) throw new Error(`SAP sync batch was not saved: ${syncError.message}`);
        const resultCounts = saved as { inserted: number; updated: number; skipped: number };
        totals.inserted += resultCounts.inserted;
        totals.updated += resultCounts.updated;
        totals.skipped += resultCounts.skipped;
        await recordSapSyncBatch(run.id, org, batch.length, resultCounts);
      }

      await finishSapSyncRun(run.id, org, "completed");
      summaries.push({ organization_id: org, status: "completed", ...totals });
    } catch (error) {
      const message = (error as Error).message.slice(0, 500);
      if (run) {
        try { await finishSapSyncRun(run.id, org, "failed", message); }
        catch (finishError) { console.error(`[SAP auto-sync] Could not close run ${run.id}: ${(finishError as Error).message}`); }
      }
      console.error(`[SAP auto-sync] Workspace ${org} failed: ${message}`);
      summaries.push({ organization_id: org, status: "failed", ...totals, message });
    }
  }
  return summaries;
}
