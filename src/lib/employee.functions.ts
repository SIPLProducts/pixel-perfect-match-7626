import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { canManageEmployees, employeeCodeConflict, employeeDeactivationBlocker, employeeSchema, employeeStatusSchema, updateEmployeeSchema, wouldCreateManagerLoop } from "@/lib/employee-schema";

type Client = SupabaseClient<Database>;
type Values = z.infer<typeof employeeSchema>;

async function managerOrg(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error || !data) throw new Error("Workspace not found");
  if (!canManageEmployees(data.role)) throw new Error("You do not have permission to manage employees");
  return data.organization_id;
}

async function orgEmployees(supabase: Client, organizationId: string) {
  const { data, error } = await supabase.from("employees").select("id,employee_code,manager_id,status").eq("organization_id", organizationId);
  if (error) throw new Error("Employees could not be checked. Please retry.");
  return data ?? [];
}

async function checkRules(supabase: Client, organizationId: string, rows: Awaited<ReturnType<typeof orgEmployees>>, v: Values, employeeId?: string) {
  if (employeeCodeConflict(rows, v.code, employeeId)) throw new Error("This employee code is already used in your workspace");
  const current = employeeId ? rows.find((r) => r.id === employeeId) : undefined;
  if (v.managerId) {
    const manager = rows.find((r) => r.id === v.managerId);
    if (!manager) throw new Error("Select a manager from this workspace");
    if (manager.status !== "active" && current?.manager_id !== manager.id) throw new Error("An inactive employee cannot be chosen as manager");
    if (wouldCreateManagerLoop(rows, employeeId, v.managerId)) throw new Error("An employee cannot report to themselves or someone who reports to them");
  }
  for (const [table, id, label] of [["departments", v.departmentId, "department"], ["locations", v.locationId, "location"]] as const) {
    if (!id) continue;
    const { data, error } = await supabase.from(table).select("id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (error || !data) throw new Error(`Select a ${label} from this workspace`);
  }
}

async function assertCanDeactivate(supabase: Client, organizationId: string, employeeId: string) {
  const { data, error } = await supabase.from("asset_transfers").select("to_employee_id").eq("organization_id", organizationId).eq("to_employee_id", employeeId).in("status", ["pending", "approved"]).limit(1);
  if (error) throw new Error("Transfers could not be checked. Please retry.");
  const blocker = employeeDeactivationBlocker(employeeId, (data ?? []).map((t) => t.to_employee_id ?? ""));
  if (blocker) throw new Error(blocker);
}

function friendly(error: { code?: string }) {
  if (error.code === "23505") return new Error("This employee code is already used in your workspace");
  return new Error("Employee could not be saved. Please retry.");
}

const columns = (v: Values) => ({ employee_code: v.code, full_name: v.fullName, email: v.email, mobile: v.mobile, designation: v.designation, department_id: v.departmentId, location_id: v.locationId, manager_id: v.managerId, status: v.status });

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => employeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    await checkRules(context.supabase, organizationId, await orgEmployees(context.supabase, organizationId), data);
    const { data: row, error } = await context.supabase.from("employees").insert({ organization_id: organizationId, ...columns(data) }).select("id,full_name").single();
    if (error || !row) throw friendly(error ?? {});
    return row;
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateEmployeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    const rows = await orgEmployees(context.supabase, organizationId);
    const current = rows.find((r) => r.id === data.employeeId);
    if (!current) throw new Error("Employee not found in this workspace");
    await checkRules(context.supabase, organizationId, rows, data, data.employeeId);
    if (current.status === "active" && data.status === "inactive") await assertCanDeactivate(context.supabase, organizationId, data.employeeId);
    const { data: row, error } = await context.supabase.from("employees").update(columns(data))
      .eq("id", data.employeeId).eq("organization_id", organizationId).select("id,full_name").maybeSingle();
    if (error) throw friendly(error);
    if (!row) throw new Error("Employee not found in this workspace");
    return row;
  });

export const setEmployeeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => employeeStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    if (data.status === "inactive") await assertCanDeactivate(context.supabase, organizationId, data.employeeId);
    const { data: row, error } = await context.supabase.from("employees").update({ status: data.status })
      .eq("id", data.employeeId).eq("organization_id", organizationId).select("id,status").maybeSingle();
    if (error || !row) throw new Error("Employee status could not be changed. Please retry.");
    return row;
  });
