import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { canManageLocations, deactivationBlocker, locationConflict, locationSchema, locationStatusSchema, updateLocationSchema, wouldCreateCycle } from "@/lib/location-schema";
import { z } from "zod";

type Client = SupabaseClient<Database>;

async function managerOrg(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error || !data) throw new Error("Workspace not found");
  if (!canManageLocations(data.role)) throw new Error("You do not have permission to manage locations");
  return data.organization_id;
}

async function orgLocations(supabase: Client, organizationId: string) {
  const { data, error } = await supabase.from("locations").select("id,code,parent_id,status").eq("organization_id", organizationId);
  if (error) throw new Error("Locations could not be checked. Please retry.");
  return data ?? [];
}

function checkRules(rows: Awaited<ReturnType<typeof orgLocations>>, values: z.infer<typeof locationSchema>, locationId?: string) {
  if (locationConflict(rows, values.code, locationId)) throw new Error("This location code is already used in your workspace");
  if (values.parentId) {
    const parent = rows.find((r) => r.id === values.parentId);
    if (!parent) throw new Error("Select a parent location from this workspace");
    const current = locationId ? rows.find((r) => r.id === locationId) : undefined;
    if (parent.status !== "active" && current?.parent_id !== parent.id) throw new Error("An inactive location cannot be chosen as a parent");
    if (wouldCreateCycle(rows, locationId, values.parentId)) throw new Error("A location cannot be placed under itself or one of its own children");
  }
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === "23505") return new Error("This location code is already used in your workspace");
  return new Error("Location could not be saved. Please retry.");
}

async function assertCanDeactivate(supabase: Client, organizationId: string, locationId: string, rows: Awaited<ReturnType<typeof orgLocations>>) {
  const { data, error } = await supabase.from("asset_transfers").select("to_location_id").eq("organization_id", organizationId).eq("to_location_id", locationId).in("status", ["pending", "approved"]).limit(1);
  if (error) throw new Error("Transfers could not be checked. Please retry.");
  const blocker = deactivationBlocker(locationId, rows, (data ?? []).map((t) => t.to_location_id ?? ""));
  if (blocker) throw new Error(blocker);
}

export const createLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => locationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    checkRules(await orgLocations(context.supabase, organizationId), data);
    const { data: row, error } = await context.supabase.from("locations")
      .insert({ organization_id: organizationId, code: data.code, name: data.name, type: data.type, parent_id: data.parentId, status: data.status })
      .select("id,name").single();
    if (error || !row) throw friendly(error ?? { message: "" });
    return row;
  });

export const updateLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateLocationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    const rows = await orgLocations(context.supabase, organizationId);
    const current = rows.find((r) => r.id === data.locationId);
    if (!current) throw new Error("Location not found in this workspace");
    checkRules(rows, data, data.locationId);
    if (current.status === "active" && data.status === "inactive") await assertCanDeactivate(context.supabase, organizationId, data.locationId, rows);
    const { data: row, error } = await context.supabase.from("locations")
      .update({ code: data.code, name: data.name, type: data.type, parent_id: data.parentId, status: data.status })
      .eq("id", data.locationId).eq("organization_id", organizationId).select("id,name").maybeSingle();
    if (error) throw friendly(error);
    if (!row) throw new Error("Location not found in this workspace");
    return row;
  });

export const setLocationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => locationStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    const rows = await orgLocations(context.supabase, organizationId);
    const current = rows.find((r) => r.id === data.locationId);
    if (!current) throw new Error("Location not found in this workspace");
    if (data.status === "inactive") await assertCanDeactivate(context.supabase, organizationId, data.locationId, rows);
    if (data.status === "active" && current.parent_id && rows.find((r) => r.id === current.parent_id)?.status !== "active") throw new Error("Reactivate its parent location first");
    const { data: row, error } = await context.supabase.from("locations").update({ status: data.status })
      .eq("id", data.locationId).eq("organization_id", organizationId).select("id,status").maybeSingle();
    if (error || !row) throw new Error("Location status could not be changed. Please retry.");
    return row;
  });
