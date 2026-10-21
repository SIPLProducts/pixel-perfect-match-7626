import { z } from "zod";

export const allRoles = ["super_admin", "admin", "asset_manager", "finance", "it_manager", "facility_manager", "auditor", "employee", "viewer", "client_tester"] as const;
export type AppRole = typeof allRoles[number];
/** Only these roles may open User Management or change accounts. */
export const userAdminRoles: readonly AppRole[] = ["super_admin", "admin"];

export const roleLabel = (role: string) => role === "client_tester" ? "Client Tester" : role.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
export const isUserAdmin = (role: string | null | undefined) => !!role && (userAdminRoles as readonly string[]).includes(role);

/** Roles a caller may grant. Admins cannot create or manage administrators. */
export function assignableRoles(callerRole: string): AppRole[] {
  if (callerRole === "super_admin") return [...allRoles];
  if (callerRole === "admin") return allRoles.filter(r => !userAdminRoles.includes(r));
  return [];
}

/** Whether the caller may change this member at all (role, name or status). */
export function canManageMember(caller: { userId: string; role: string }, target: { userId: string; role: string }) {
  if (!isUserAdmin(caller.role) || caller.userId === target.userId) return false;
  return assignableRoles(caller.role).includes(target.role as AppRole);
}

/** True when a change would leave the workspace with no active super admin. */
export function removesLastSuperAdmin(activeSuperAdmins: number, target: { role: string; active: boolean }, next: { role: string; active: boolean }) {
  const wasCounted = target.role === "super_admin" && target.active;
  const stillCounted = next.role === "super_admin" && next.active;
  return wasCounted && !stillCounted && activeSuperAdmins <= 1;
}

export const inviteUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  role: z.enum(allRoles),
  redirectOrigin: z.string().url().refine(u => /^https:\/\//.test(u) || /^http:\/\/localhost(:\d+)?$/.test(u), "Invalid origin"),
});
export const updateUserSchema = z.object({ userId: z.string().uuid(), fullName: z.string().trim().min(2, "Enter the full name").max(100), role: z.enum(allRoles) });
export const setUserActiveSchema = z.object({ userId: z.string().uuid(), active: z.boolean() });
