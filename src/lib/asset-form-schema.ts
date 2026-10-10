import { z } from "zod";

export const assetSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(120),
  categoryId: z.string().uuid("Select a category"),
  serialNumber: z.string().trim().max(100).optional(),
  manufacturer: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  status: z.enum(["active", "in_stock", "assigned", "under_maintenance", "under_repair", "missing", "damaged", "retired", "disposed"]),
  condition: z.enum(["new", "good", "average", "poor", "damaged"]),
  locationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  purchaseValue: z.number().nonnegative().max(999999999999).optional(),
  currentValue: z.number().nonnegative().max(999999999999).optional(),
  plant: z.string().trim().max(100).optional(),
  companyCode: z.string().trim().max(50).optional(),
  installationDate: z.string().date().optional(),
  warrantyEnd: z.string().date().optional(),
  remarks: z.string().trim().max(1000).optional(),
});

export const updateAssetSchema = assetSchema.extend({ assetId: z.string().uuid() });

export function assetValues(data: z.infer<typeof assetSchema>) {
  return {
    name: data.name, category_id: data.categoryId,
    serial_number: data.serialNumber || null, manufacturer: data.manufacturer || null,
    model: data.model || null, plant: data.plant || null, company_code: data.companyCode || null,
    status: data.status, condition: data.condition,
    location_id: data.locationId || null, department_id: data.departmentId || null,
    assigned_employee_id: data.employeeId || null,
    purchase_value: data.purchaseValue ?? null, current_value: data.currentValue ?? null,
    capitalization_date: data.installationDate || null, warranty_end: data.warrantyEnd || null,
    remarks: data.remarks || null,
  };
}