import { z } from "zod";

export const employeeRoles = new Set(["super_admin", "admin", "asset_manager", "facility_manager"]);
export const canManageEmployees = (role?: string | null) => !!role && employeeRoles.has(role);
export const employeeStatuses = ["active", "inactive"] as const;
export const normalizeEmployeeCode = (value: string) => value.trim().toUpperCase();

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().transform((v) => v || null);
const optionalId = z.string().uuid().nullable().optional().transform((v) => v ?? null);

export const employeeSchema = z.object({
  code: z.string().transform(normalizeEmployeeCode).pipe(z.string().regex(/^[A-Z0-9-]{2,20}$/, "Code must be 2–20 letters, digits or dashes")),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
  email: z.string().trim().max(255).optional().transform((v) => v || null).pipe(z.string().email("Enter a valid email").nullable()),
  mobile: z.string().trim().optional().transform((v) => v || null).pipe(z.string().regex(/^\+?[0-9 -]{7,20}$/, "Enter a valid mobile number").nullable()),
  designation: optionalText(100, "Designation"),
  departmentId: optionalId,
  locationId: optionalId,
  managerId: optionalId,
  status: z.enum(employeeStatuses).default("active"),
});
export const updateEmployeeSchema = employeeSchema.extend({ employeeId: z.string().uuid() });
export const employeeStatusSchema = z.object({ employeeId: z.string().uuid(), status: z.enum(employeeStatuses) });

type Row = { id: string; employee_code: string; manager_id?: string | null; status?: string | null };

export function employeeCodeConflict(rows: Row[], code: string, ignoreId?: string) {
  return rows.some((r) => r.id !== ignoreId && r.employee_code.toUpperCase() === normalizeEmployeeCode(code));
}

/** True when making `managerId` the manager of `employeeId` would create a reporting loop. */
export function wouldCreateManagerLoop(rows: Row[], employeeId: string | undefined, managerId: string | null) {
  if (!managerId || !employeeId) return false;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let current: string | null | undefined = managerId;
  while (current) {
    if (current === employeeId || seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.manager_id ?? null;
  }
  return false;
}

/** Reason an employee cannot be deactivated, or null when allowed. */
export function employeeDeactivationBlocker(employeeId: string, openTransferCustodians: string[]) {
  return openTransferCustodians.includes(employeeId) ? "Complete or reject open transfers to this employee first" : null;
}

/** Active employees for new choices, keeping an already-selected inactive one visible. */
export function selectableEmployees<T extends { id: string; status?: string | null }>(rows: T[], keepId?: string | null) {
  return rows.filter((r) => (r.status ?? "active") === "active" || r.id === keepId);
}
