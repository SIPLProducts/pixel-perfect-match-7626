import { z } from "zod";

export const transferRoles = ["super_admin", "admin", "asset_manager", "facility_manager", "it_manager"] as const;
export const transferSchema = z.object({
  assetId: z.string().uuid(),
  toLocationId: z.string().uuid("Select a destination location"),
  toEmployeeId: z.string().uuid().optional(),
  transferDate: z.string().date(),
  reason: z.string().trim().min(3, "Enter a reason with at least 3 characters").max(200),
  remarks: z.string().trim().max(1000).optional(),
});
export const editTransferSchema = transferSchema.omit({ assetId: true }).extend({
  transferId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }),
});
export function canEditTransfer(status: string) { return status === "pending" || status === "approved"; }
export function transferActions(status: string) {
  return status === "pending" ? ["approve", "complete", "reject"] as const : status === "approved" ? ["complete", "reject"] as const : [];
}