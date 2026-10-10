import { z } from "zod";

export const serviceStatuses = ["draft", "pending", "approved", "rejected", "completed", "cancelled"] as const;
const optionalDate = z.union([z.literal(""), z.string().date()]);
export const serviceRequestSchema = z.object({
  requestId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  title: z.string().trim().min(3, "Enter a title with at least 3 characters").max(160),
  status: z.enum(serviceStatuses),
  remarks: z.string().trim().max(2000),
  serviceProvider: z.string().trim().max(160),
  technician: z.string().trim().max(160),
  partsUsed: z.string().trim().max(2000),
  cost: z.number().finite().min(0).max(999999999999),
  startDate: optionalDate,
  completionDate: optionalDate,
  nextMaintenanceDate: optionalDate,
}).refine(v => !v.startDate || !v.completionDate || v.completionDate >= v.startDate, {
  message: "Completion date cannot be before the start date", path: ["completionDate"],
});
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
export function serviceRequestValues(input: ServiceRequestInput) {
  return {
    title: input.title, status: input.status, remarks: input.remarks || null,
    service_provider: input.serviceProvider || null, technician: input.technician || null,
    parts_used: input.partsUsed || null, cost: input.cost,
    start_date: input.startDate || null, completion_date: input.completionDate || null,
    next_maintenance_date: input.nextMaintenanceDate || null,
  };
}