import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assignableRoles, canManageMember, inviteUserSchema, isUserAdmin, removesLastSuperAdmin, setUserActiveSchema, updateUserSchema } from "@/lib/user-management";

/** The caller's own active admin membership; the workspace always comes from here. */
async function adminMembership(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !isUserAdmin(data.role)) throw new Error("Only administrators can manage users");
  return data;
}

async function targetMember(organizationId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("user_roles").select("id, role, active").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("User not found in your workspace");
  return { supabaseAdmin, member: data };
}

async function activeSuperAdmins(supabaseAdmin: SupabaseClient<Database>, organizationId: string) {
  const { count, error } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("role", "super_admin").eq("active", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await adminMembership(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("list_workspace_users");
    if (error) throw new Error(error.message);
    return { callerId: context.userId, callerRole: me.role, users: data ?? [] };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => inviteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await adminMembership(context.supabase, context.userId);
    if (!assignableRoles(me.role).includes(data.role)) throw new Error("You cannot assign this role");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${data.redirectOrigin}/reset-password`, data: { full_name: data.fullName } });
    if (error || !invited.user) {
      if (error && /already|registered|exists/i.test(error.message)) throw new Error("An account with this email already exists. Existing accounts are not moved between workspaces.");
      throw new Error("The invitation could not be sent. Please try again.");
    }
    const userId = invited.user.id;
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, organization_id: me.organization_id, role: data.role, active: true });
    if (roleError) { await supabaseAdmin.auth.admin.deleteUser(userId); throw new Error("The invitation could not be completed. Please try again."); }
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({ id: userId, organization_id: me.organization_id, full_name: data.fullName });
    if (profileError) throw new Error(profileError.message);
    return { userId };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => updateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await adminMembership(context.supabase, context.userId);
    const { supabaseAdmin, member } = await targetMember(me.organization_id, data.userId);
    if (!canManageMember({ userId: context.userId, role: me.role }, { userId: data.userId, role: member.role })) throw new Error("You cannot change this user");
    if (!assignableRoles(me.role).includes(data.role)) throw new Error("You cannot assign this role");
    if (removesLastSuperAdmin(await activeSuperAdmins(supabaseAdmin, me.organization_id), member, { role: data.role, active: member.active })) throw new Error("The workspace needs at least one active Super admin");
    const { error } = await supabaseAdmin.from("user_roles").update({ role: data.role }).eq("id", member.id);
    if (error) throw new Error(error.message);
    const { error: profileError } = await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId).eq("organization_id", me.organization_id);
    if (profileError) throw new Error(profileError.message);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => setUserActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await adminMembership(context.supabase, context.userId);
    const { supabaseAdmin, member } = await targetMember(me.organization_id, data.userId);
    if (!canManageMember({ userId: context.userId, role: me.role }, { userId: data.userId, role: member.role })) throw new Error("You cannot change this user");
    if (removesLastSuperAdmin(await activeSuperAdmins(supabaseAdmin, me.organization_id), member, { role: member.role, active: data.active })) throw new Error("The workspace needs at least one active Super admin");
    const { error } = await supabaseAdmin.from("user_roles").update({ active: data.active }).eq("id", member.id);
    if (error) throw new Error(error.message);
    // Extra layer on top of the database check: block or unblock sign-in.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
    if (banError) throw new Error(`Access ${data.active ? "restored" : "removed"}, but the sign-in block could not be updated. Please retry.`);
    return { ok: true };
  });
