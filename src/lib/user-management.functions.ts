import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAuth } from "@/lib/app-auth";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { createUserSchema, firstLoginPasswordSchema, fullNameOf, mustChangePassword, assignableRoles, canManageTarget, canManageUsers, changeBlocker, inviteSchema, resendSchema, setActiveSchema, updateUserSchema } from "@/lib/user-management";

type Client = SupabaseClient<Database>;

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
  .middleware([requireAppAuth])
  .handler(async ({ context }) => {
    const me = await callerAdmin(context.supabase, context.userId);
    const [{ data: org }, { data: plants }, { data: departments }] = await Promise.all([
      context.supabase.from("organizations").select("name").eq("id", me.organization_id).maybeSingle(),
      context.supabase.from("locations").select("id,code,name").eq("organization_id", me.organization_id).eq("type", "plant").eq("status", "active").order("name"),
      context.supabase.from("departments").select("id,code,name").eq("organization_id", me.organization_id).eq("status", "active").order("name"),
    ]);
    return { plants: plants ?? [], departments: departments ?? [], users: await workspaceUsers(context.supabase), callerRole: me.role, callerId: context.userId, assignable: assignableRoles(me.role), workspaceName: org?.name ?? "Current workspace" };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
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
  .middleware([requireAppAuth])
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
  .middleware([requireAppAuth])
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
  .middleware([requireAppAuth])
  .inputValidator((input) => setActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { me, target, activeSuperAdmins } = await loadChange(context.supabase, context.userId, data.userId);
    const blocker = changeBlocker({ callerId: context.userId, callerRole: me.role, targetId: data.userId, targetRole: target.role, newActive: data.active, activeSuperAdmins, targetActive: target.active });
    if (blocker) throw new Error(blocker);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").update({ active: data.active }).eq("user_id", data.userId).eq("organization_id", me.organization_id);
    if (error) throw new Error("The status could not be saved. Please retry.");
    // Deactivation is workspace-scoped (membership only): an account-wide sign-in ban would also
    // block other workspaces. On reactivation, clear any ban left by earlier versions.
    if (data.active) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
      if (banError) console.error("unban failed", banError);
    }
    return { ok: true };
  });

const errMessage = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "unknown error");

/** Looks up an active Plant / Department in the caller's own workspace; null when not selected. */
async function workspaceRecord(supabase: Client, table: "locations" | "departments", id: string | null, organizationId: string, label: string) {
  if (!id) return null;
  const { data, error } = table === "locations"
    ? await supabase.from("locations").select("id,code,name").eq("id", id).eq("organization_id", organizationId).eq("status", "active").eq("type", "plant").maybeSingle()
    : await supabase.from("departments").select("id,code,name").eq("id", id).eq("organization_id", organizationId).eq("status", "active").maybeSingle();
  if (error || !data) throw new Error(`The selected ${label} is not an active ${label} in your workspace`);
  return data;
}

/**
 * Creates a brand-new account with an administrator-chosen initial password.
 * Existing accounts are never modified: an email already in use is rejected before anything is written.
 * If any later step fails (including ambiguous/timeout failures), every row keyed by the newly created
 * user ID in this workspace is removed and then that new account is deleted.
 */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = await callerAdmin(context.supabase, context.userId);
    if (!assignableRoles(me.role).includes(data.role)) throw new Error("You cannot assign this role");
    const users = await workspaceUsers(context.supabase);
    if (users.some((u) => u.email?.toLowerCase() === data.email)) throw new Error("This person is already a member of your workspace");
    const [plant, department] = await Promise.all([
      workspaceRecord(context.supabase, "locations", data.plantId, me.organization_id, "plant"),
      workspaceRecord(context.supabase, "departments", data.departmentId, me.organization_id, "department"),
    ]);
    const fullName = fullNameOf(data);
    const profileDetails = {
      first_name: data.firstName, last_name: data.lastName || null, username: data.username || null, contact: data.contact || null, info_1: data.info1 || null,
      plant_id: plant?.id ?? null, plant_code: plant?.code ?? null, plant_name: plant?.name ?? null,
      department_id: department?.id ?? null, department_code: department?.code ?? null, department_name: department?.name ?? null,
      profit_centre: data.profitCentre || null, purchase_group: data.purchaseGroup || null, distribution_channel: data.distributionChannel || null,
      created_by: context.userId,
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { must_change_password: data.forcePasswordChange },
    });
    if (authError || !created?.user) {
      const code = (authError as { code?: string } | null)?.code ?? "";
      if (code === "email_exists" || /already (been )?registered|already exists/i.test(authError?.message ?? "")) {
        throw new Error("An account with this email already exists. Existing accounts can't be created again or have their password changed here.");
      }
      if (code === "weak_password") throw new Error("This password appears in known data breaches and can't be used. Choose a different password (8–72 characters).");
      console.error("createUser: account creation failed", code || errMessage(authError));
      throw new Error("The account could not be created. Please retry.");
    }
    const newId = created.user.id; // created by this call only — the sole ID cleanup may touch

    try {
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({ id: newId, organization_id: me.organization_id, full_name: fullName, preferences: { user_details: profileDetails } });
      if (profileError) throw profileError;
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: newId, organization_id: me.organization_id, role: data.role, active: data.status === "active" });
      if (roleError) throw roleError;
    } catch (original) {
      const cleanup: string[] = [];
      const run = async (step: string, fn: () => PromiseLike<{ error: unknown }>) => {
        try { const { error } = await fn(); if (error) cleanup.push(`${step}: ${errMessage(error)}`); } catch (e) { cleanup.push(`${step}: ${errMessage(e)}`); }
      };
      // Unconditional, ID-scoped deletes: safe even when an insert's outcome was unknown.
      await run("membership", () => supabaseAdmin.from("user_roles").delete().eq("user_id", newId).eq("organization_id", me.organization_id));
      await run("profile", () => supabaseAdmin.from("profiles").delete().eq("id", newId));
      await run("account", () => supabaseAdmin.auth.admin.deleteUser(newId));
      console.error("createUser: setup failed", { userId: newId, reason: errMessage(original), cleanupFailures: cleanup });
      throw new Error(cleanup.length ? "The user could not be created and cleanup was incomplete. Please contact your administrator before retrying." : "The user could not be created. Nothing was saved — please retry.");
    }
    return { userId: newId };
  });

/** Status for the first-login screen; uses the plain session check so flagged users can reach it. */
export const passwordChangeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ required: mustChangePassword(context.claims) }));

/** Sets the user's own password and clears the server-only flag. Only flagged accounts may use it. */
export const completeFirstLoginPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => firstLoginPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (readError || !current?.user) throw new Error("Your account could not be verified. Please sign in again.");
    if (current.user.app_metadata?.["must_change_password"] !== true) throw new Error("No password change is pending for this account");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
      app_metadata: { ...current.user.app_metadata, must_change_password: false },
    });
    if (error) {
      if ((error as { code?: string }).code === "same_password") throw new Error("Choose a password different from the one your administrator set");
      console.error("first-login password update failed", (error as { code?: string }).code ?? "unknown");
      throw new Error("Your password could not be saved. Please retry.");
    }
    return { ok: true };
  });
