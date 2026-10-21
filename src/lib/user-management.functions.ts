import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assignableRoles, canManageTarget, canManageUsers, changeBlocker, inviteSchema, resendSchema, setActiveSchema, updateUserSchema } from "@/lib/user-management";

type Client = SupabaseClient<Database>;
const BAN = "876000h";

async function callerAdmin(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error || !data) throw new Error("Workspace access required");
  if (!canManageUsers(data.role)) throw new Error("You do not have permission to manage users");
  return data;
}

async function workspaceUsers(supabase: Client) {
  const { data, error } = await supabase.rpc("list_workspace_users");
  if (error) throw new Error("Users could not be loaded. Please retry.");
  return data ?? [];
}

function redirectUrl() {
  const origin = getRequestHeader("origin") ?? "https://qrmyassets.siplproducts.com";
  return `${origin}/reset-password`;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await callerAdmin(context.supabase, context.userId);
    return { users: await workspaceUsers(context.supabase), callerRole: me.role, callerId: context.userId, assignable: assignableRoles(me.role) };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await callerAdmin(context.supabase, context.userId);
    if (!assignableRoles(me.role).includes(data.role)) throw new Error("You cannot assign this role");
    const users = await workspaceUsers(context.supabase);
    if (users.some((u) => u.email?.toLowerCase() === data.email)) throw new Error("This person is already a member of your workspace");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: redirectUrl(), data: { full_name: data.fullName } });
    if (error || !invited.user) {
      if (error?.message?.toLowerCase().includes("already")) throw new Error("This email already has an Asset360 account and can't be invited");
      console.error("invite failed", error);
      throw new Error("The invitation could not be sent. Please retry.");
    }
    const newId = invited.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({ id: newId, organization_id: me.organization_id, full_name: data.fullName });
    const { error: roleError } = profileError ? { error: profileError } : await supabaseAdmin.from("user_roles").insert({ user_id: newId, organization_id: me.organization_id, role: data.role, active: true });
    if (profileError || roleError) {
      await supabaseAdmin.auth.admin.deleteUser(newId);
      console.error("invite setup failed", profileError ?? roleError);
      throw new Error("The invitation could not be completed. Please retry.");
    }
    return { userId: newId };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await callerAdmin(context.supabase, context.userId);
    const target = (await workspaceUsers(context.supabase)).find((u) => u.user_id === data.userId);
    if (!target || !target.email) throw new Error("User not found in this workspace");
    if (!target.invited || !target.active) throw new Error("Only pending invitations can be re-sent");
    if (!canManageTarget(me.role, target.role)) throw new Error("You cannot manage this user");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(target.email, { redirectTo: redirectUrl() });
    if (error) { console.error("resend failed", error); throw new Error("The invitation could not be re-sent. Please retry later."); }
    return { ok: true };
  });

async function loadChange(supabase: Client, callerId: string, targetId: string) {
  const me = await callerAdmin(supabase, callerId);
  const users = await workspaceUsers(supabase);
  const target = users.find((u) => u.user_id === targetId);
  if (!target) throw new Error("User not found in this workspace");
  const activeSuperAdmins = users.filter((u) => u.role === "super_admin" && u.active).length;
  return { me, target, activeSuperAdmins };
}

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { me, target, activeSuperAdmins } = await loadChange(context.supabase, context.userId, data.userId);
    const blocker = data.userId === context.userId && data.role === target.role
      ? null
      : changeBlocker({ callerId: context.userId, callerRole: me.role, targetId: data.userId, targetRole: target.role, newRole: data.role, activeSuperAdmins, targetActive: target.active });
    if (blocker) throw new Error(blocker);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: pErr } = await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId).eq("organization_id", me.organization_id);
    if (pErr) throw new Error("The name could not be saved. Please retry.");
    if (data.role !== target.role) {
      const { error } = await supabaseAdmin.from("user_roles").update({ role: data.role }).eq("user_id", data.userId).eq("organization_id", me.organization_id);
      if (error) throw new Error("The role could not be saved. Please retry.");
    }
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { me, target, activeSuperAdmins } = await loadChange(context.supabase, context.userId, data.userId);
    const blocker = changeBlocker({ callerId: context.userId, callerRole: me.role, targetId: data.userId, targetRole: target.role, newActive: data.active, activeSuperAdmins, targetActive: target.active });
    if (blocker) throw new Error(blocker);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").update({ active: data.active }).eq("user_id", data.userId).eq("organization_id", me.organization_id);
    if (error) throw new Error("The status could not be saved. Please retry.");
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : BAN });
    if (banError) console.error("ban update failed", banError);
    return { ok: true };
  });
