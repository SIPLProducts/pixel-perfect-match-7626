import { z } from "zod";

export const locationRoles = new Set(["super_admin", "admin", "asset_manager", "facility_manager"]);
export const canManageLocations = (role?: string | null) => !!role && locationRoles.has(role);
export const locationTypes = ["company", "business_unit", "plant", "building", "floor", "room", "area"] as const;
export const locationStatuses = ["active", "inactive"] as const;
export const normalizeCode = (value: string) => value.trim().toUpperCase();

export const locationSchema = z.object({
  code: z.string().transform(normalizeCode).pipe(z.string().regex(/^[A-Z0-9-]{2,20}$/, "Code must be 2–20 letters, digits or dashes")),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
  type: z.enum(locationTypes, { message: "Select a location type" }),
  parentId: z.string().uuid().nullable().optional().transform((v) => v ?? null),
  status: z.enum(locationStatuses).default("active"),
});
export const updateLocationSchema = locationSchema.extend({ locationId: z.string().uuid() });
export const locationStatusSchema = z.object({ locationId: z.string().uuid(), status: z.enum(locationStatuses) });

type Row = { id: string; code: string; parent_id?: string | null; status?: string | null };

export function locationConflict(rows: Row[], code: string, ignoreId?: string) {
  return rows.some((r) => r.id !== ignoreId && r.code.toUpperCase() === normalizeCode(code));
}

/** True when setting `parentId` as the parent of `locationId` would create a loop. */
export function wouldCreateCycle(rows: Row[], locationId: string | undefined, parentId: string | null) {
  if (!parentId || !locationId) return false;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let current: string | null | undefined = parentId;
  while (current) {
    if (current === locationId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.parent_id ?? null;
  }
  return false;
}

/** Reasons a location cannot be deactivated right now, or null when allowed. */
export function deactivationBlocker(locationId: string, locations: Row[], openTransferDestinations: string[]) {
  const activeChildren = locations.filter((l) => l.parent_id === locationId && (l.status ?? "active") === "active").length;
  if (activeChildren) return `Deactivate or move its ${activeChildren} active child location${activeChildren > 1 ? "s" : ""} first`;
  if (openTransferDestinations.includes(locationId)) return "Complete or reject open transfers to this location first";
  return null;
}

/** Active locations for new choices, keeping an already-selected inactive one visible. */
export function selectableLocations<T extends { id: string; status?: string | null }>(locations: T[], keepId?: string | null) {
  return locations.filter((l) => (l.status ?? "active") === "active" || l.id === keepId);
}
