import { z } from "zod";

export const qrPrintSchema = z.object({
  operationId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(500).refine(ids => new Set(ids).size === ids.length, "Duplicate assets"),
  action: z.enum(["print", "pdf", "png"]),
});

export function qrPrintCounts(rows: { asset_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.asset_id, (counts.get(row.asset_id) ?? 0) + 1);
  return counts;
}

// Retry tracking only, never deliver another label on a transient tracking failure.
export async function deliverTrackedLabels(deliver: () => void | Promise<void>, record: () => Promise<unknown>) {
  await deliver();
  try { await record(); }
  catch { await record(); }
}