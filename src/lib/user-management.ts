import { z } from "zod";
import { categoryRoles } from "@/lib/category-schema";
import { locationRoles } from "@/lib/location-schema";
import { employeeRoles } from "@/lib/employee-schema";
import { transferRoles } from "@/lib/transfer-schema";

export const appRoles = ["super_admin", "admin", "asset_manager", "facility_manager", "it_manager", "finance", "auditor", "employee", "viewer", "client_tester"] as const;
export type AppRole = (typeof appRoles)[number];

export const roleInfo: Record<AppRole, { label: string; description: string }> = {
  super_admin: { label: "Super admin", description: "Full control of the workspace, including every user and role." },
  admin: { label: "Admin", description: "Runs the workspace and manages users below Admin level." },
  asset_manager: { label: "Asset manager", description: "Owns the asset register, categories, master data and transfers." },
  facility_manager: { label: "Facility manager", description: "Manages locations, employees and transfers for facilities." },
  it_manager: { label: "IT manager", description: "Handles IT assets and approves transfers." },
  finance: { label: "Finance", description: "Works with asset values and registers; no master-data changes." },
  auditor: { label: "Auditor", description: "Reviews assets, history and reports; no master-data changes." },
  employee: { label: "Employee", description: "Day-to-day asset and service request work." },
  viewer: { label: "Viewer", description: "Workspace member with standard asset access; no master-data changes." },
  client_tester: { label: "Client tester", description: "Client testing access, same as asset staff; no master data, transfers or users." },
};

/** Roles allowed by the Users & Access server functions and the workspace-users listing function. */
export const userAdminRoles = new Set<string>(["super_admin", "admin"]);
/** Roles allowed by the category_templates security rule (and the category server checks). */
export const templateRoles = new Set<string>(["super_admin", "admin", "asset_manager"]);

export const canManageUsers = (role?: string | null) => !!role && userAdminRoles.has(role);

export function assignableRoles(callerRole: string): AppRole[] {
  if (callerRole === "super_admin") return [...appRoles];
  if (callerRole === "admin") return appRoles.filter((r) => r !== "super_admin" && r !== "admin");
  return [];
}

export const canManageTarget = (callerRole: string, targetRole: string) =>
  callerRole === "super_admin" || (callerRole === "admin" && targetRole !== "super_admin" && targetRole !== "admin");

type Change = { callerId: string; callerRole: string; targetId: string; targetRole: string; newRole?: string; newActive?: boolean; activeSuperAdmins: number; targetActive: boolean };

/** Returns an error message when the change is not allowed, otherwise null. */
export function changeBlocker(c: Change): string | null {
  if (!canManageUsers(c.callerRole)) return "You do not have permission to manage users";
  const roleChanges = c.newRole !== undefined && c.newRole !== c.targetRole;
  const statusChanges = c.newActive !== undefined && c.newActive !== c.targetActive;
  if (c.callerId === c.targetId && (roleChanges || statusChanges)) return "You cannot change your own role or status";
  if (!canManageTarget(c.callerRole, c.targetRole)) return "You cannot manage this user's role";
  if (roleChanges && !assignableRoles(c.callerRole).includes(c.newRole as AppRole)) return "You cannot assign this role";
  const losesSuperAdmin = c.targetRole === "super_admin" && c.targetActive && (roleChanges || c.newActive === false);
  if (losesSuperAdmin && c.activeSuperAdmins <= 1) return "The workspace must keep at least one active Super admin";
  return null;
}

export const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  role: z.enum(appRoles),
});
export const updateUserSchema = z.object({ userId: z.string().uuid(), fullName: z.string().trim().min(2, "Enter the full name").max(100), role: z.enum(appRoles) });
export const setActiveSchema = z.object({ userId: z.string().uuid(), active: z.boolean() });
export const resendSchema = z.object({ userId: z.string().uuid() });

export type Access = { view: boolean; edit: boolean | null };
const all = () => true;
export const permissionModules: { id: string; label: string; view: (r: string) => boolean; edit: ((r: string) => boolean) | null }[] = [
  { id: "dashboard", label: "Dashboard", view: all, edit: null },
  { id: "assets", label: "Assets", view: all, edit: all },
  { id: "qr", label: "QR labels", view: all, edit: all },
  { id: "excel", label: "Excel import / export", view: all, edit: all },
  { id: "categories", label: "Categories", view: all, edit: (r) => categoryRoles.has(r) },
  { id: "locations", label: "Locations", view: all, edit: (r) => locationRoles.has(r) },
  { id: "employees", label: "Employees", view: all, edit: (r) => employeeRoles.has(r) },
  { id: "templates", label: "Excel template links", view: all, edit: (r) => templateRoles.has(r) },
  { id: "transfers", label: "Transfers (create, edit, approve)", view: all, edit: (r) => (transferRoles as readonly string[]).includes(r) },
  { id: "service", label: "Service requests", view: all, edit: all },
  { id: "qrmycar", label: "QRmyCAR", view: all, edit: all },
  { id: "reports", label: "Reports", view: all, edit: null },
  { id: "audit", label: "Audit trail", view: all, edit: null },
  { id: "users", label: "Users & Access", view: (r) => userAdminRoles.has(r), edit: (r) => userAdminRoles.has(r) },
];

export const accessFor = (role: string, moduleId: string): Access => {
  const m = permissionModules.find((x) => x.id === moduleId);
  if (!m) return { view: false, edit: false };
  return { view: m.view(role), edit: m.edit ? m.edit(role) : null };
};

/** Modules every active workspace member can edit (no role check in the server functions). */
export const operationalModuleIds = new Set(["assets", "qr", "excel", "service", "qrmycar"]);
export const editableModuleCount = permissionModules.filter((m) => m.edit).length;

/** Counts derived from the same matrix rows the Permission matrix renders. */
export function roleSummary(role: string) {
  const views = permissionModules.filter((m) => m.view(role));
  const edits = permissionModules.filter((m) => m.edit && m.edit(role));
  const restricted = edits.filter((m) => !operationalModuleIds.has(m.id)).map((m) => m.label);
  return { viewCount: views.length, editCount: edits.length, edits: edits.map((m) => m.label), restricted };
}

export type UserStatus = "active" | "invited" | "deactivated";
export const userStatus = (u: { active: boolean; invited: boolean }): UserStatus => (!u.active ? "deactivated" : u.invited ? "invited" : "active");

/** Server-only flag (Auth app_metadata) set when an administrator chose the initial password. */
export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";
export function mustChangePassword(claims: unknown): boolean {
  const meta = (claims as { app_metadata?: Record<string, unknown> } | null | undefined)?.app_metadata;
  return meta?.["must_change_password"] === true;
}

/** Supabase Auth hashes passwords with bcrypt, which only uses the first 72 bytes. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const passwordSchema = z.string().min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`).max(PASSWORD_MAX, `Password cannot exceed ${PASSWORD_MAX} characters`)
  .refine((v) => new TextEncoder().encode(v).length <= PASSWORD_MAX, `Password cannot exceed ${PASSWORD_MAX} bytes`);
export const usernameSchema = z.string().trim().max(30).refine((v) => v === "" || /^[A-Za-z0-9_.]{3,30}$/.test(v), "Username must be 3–30 letters, numbers, underscores (_) or periods (.)");
const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`).default("");

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name").max(50, "Use at most 50 characters"),
  lastName: optionalText(50),
  username: usernameSchema.default(""),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  contact: z.string().trim().max(20).refine((v) => v === "" || /^\+?[0-9 ()-]{7,20}$/.test(v), "Enter a valid contact number").default(""),
  info1: optionalText(255),
  plantId: z.string().uuid().nullable().default(null),
  departmentId: z.string().uuid().nullable().default(null),
  profitCentre: optionalText(50),
  purchaseGroup: optionalText(50),
  distributionChannel: optionalText(50),
  status: z.enum(["active", "inactive"]),
  role: z.enum(appRoles),
  password: passwordSchema,
  confirmPassword: z.string(),
  forcePasswordChange: z.boolean().default(true),
}).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
export type CreateUserInput = z.input<typeof createUserSchema>;
export const firstLoginPasswordSchema = z.object({ password: passwordSchema });
export const fullNameOf = (v: { firstName: string; lastName: string }) => [v.firstName, v.lastName].filter(Boolean).join(" ");
