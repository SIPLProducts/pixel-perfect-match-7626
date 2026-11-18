import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { SAP_SYNC_STALE_MS } from "@/lib/sap-sync-schedule";

export type SapSyncRun = Database["public"]["Tables"]["sap_sync_runs"]["Row"];
export type SapSyncTrigger = "automatic" | "manual";
export type SapSyncFinish = "completed" | "failed" | "cancelled";
export type SapSyncBatchResult = { inserted: number; updated: number; skipped: number };

/** Starts one run per workspace; stale interrupted runs are closed before retrying. */
export async function beginSapSyncRun(org: string, trigger: SapSyncTrigger, totalRecords: number, createdBy: string | null): Promise<SapSyncRun> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - SAP_SYNC_STALE_MS).toISOString();
  const { error: staleError } = await supabaseAdmin.from("sap_sync_runs").update({
    status: "failed",
    finished_at: now.toISOString(),
    error_message: "The previous sync was interrupted before it finished",
  }).eq("organization_id", org).eq("status", "running").lt("started_at", staleBefore);
  if (staleError) throw new Error("Could not check the previous SAP sync");

  const { data, error } = await supabaseAdmin.from("sap_sync_runs").insert({
    organization_id: org,
    trigger_type: trigger,
    status: "running",
    total_records: totalRecords,
    created_by: createdBy,
  }).select("*").single();
  if (error?.code === "23505") throw new Error("Another SAP sync is already running for this workspace");
  if (error || !data) throw new Error("Could not start SAP sync tracking");
  return data;
}

export async function setSapSyncRunTotal(runId: string, org: string, totalRecords: number) {
  const { error } = await supabaseAdmin.from("sap_sync_runs").update({ total_records: totalRecords }).eq("id", runId).eq("organization_id", org).eq("status", "running");
  if (error) throw new Error("Could not update SAP sync progress");
}

/** Manual and automatic batches are sequential per run, so these accumulated counts cannot race each other. */
export async function recordSapSyncBatch(runId: string, org: string, processed: number, result: SapSyncBatchResult) {
  const { data: run, error: readError } = await supabaseAdmin.from("sap_sync_runs").select("*").eq("id", runId).eq("organization_id", org).eq("status", "running").maybeSingle();
  if (readError || !run) throw new Error("SAP sync run is no longer active");
  const processedRecords = run.processed_records + processed;
  const { error } = await supabaseAdmin.from("sap_sync_runs").update({
    processed_records: run.total_records > 0 ? Math.min(run.total_records, processedRecords) : processedRecords,
    inserted_count: run.inserted_count + result.inserted,
    updated_count: run.updated_count + result.updated,
    skipped_count: run.skipped_count + result.skipped,
  }).eq("id", runId).eq("organization_id", org).eq("status", "running");
  if (error) throw new Error("Could not save SAP sync progress");
}

export async function finishSapSyncRun(runId: string, org: string, status: SapSyncFinish, errorMessage?: string) {
  const { error } = await supabaseAdmin.from("sap_sync_runs").update({
    status,
    finished_at: new Date().toISOString(),
    error_message: errorMessage?.slice(0, 500) ?? null,
  }).eq("id", runId).eq("organization_id", org).eq("status", "running");
  if (error) throw new Error("Could not finish SAP sync tracking");
}
