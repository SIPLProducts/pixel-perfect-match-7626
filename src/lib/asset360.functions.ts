import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

import { assetSchema, updateAssetSchema, assetValues } from "@/lib/asset-form-schema";
import { importAssetsSchema } from "@/lib/asset-import";
import { readAllRows } from "@/lib/read-all-rows";

const transferSchema = z.object({
  assetId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  toEmployeeId: z.string().uuid().optional(),
  transferDate: z.string().date(),
  reason: z.string().trim().min(3).max(200),
  remarks: z.string().trim().max(1000).optional(),
});

const transferRoles = new Set(["super_admin", "admin", "asset_manager", "facility_manager", "it_manager"]);

async function getMembership(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fullName: z.string().trim().min(2).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (membership) return { organizationId: membership.organization_id };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const organizationId = crypto.randomUUID();
    const slug = `demo-${context.userId.slice(0, 8)}-${Date.now().toString(36)}`;
    const { error: orgError } = await supabaseAdmin.from("organizations").insert({ id: organizationId, name: "Sharvi Infotech Demo", slug, mode: "standalone" });
    if (orgError) throw new Error(orgError.message);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, organization_id: organizationId, role: "super_admin" });
    if (roleError) throw new Error(roleError.message);
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({ id: context.userId, organization_id: organizationId, full_name: data.fullName, job_title: "Operations Manager" });
    if (profileError) throw new Error(profileError.message);

    const categorySeeds = [
      ["Laptops", "LAP"], ["Desktops", "DTP"], ["Air Conditioners", "AC"], ["Chairs", "CHR"], ["Tables", "TBL"], ["Printers", "PRN"], ["Mobiles", "MOB"], ["Vehicles", "VEH"], ["Networking Equipment", "NET"],
    ] as const;
    const { data: categories, error: categoryError } = await supabaseAdmin.from("asset_categories").insert(categorySeeds.map(([name, prefix]) => ({ organization_id: organizationId, name, prefix }))).select("id,name,prefix");
    if (categoryError || !categories) throw new Error(categoryError?.message ?? "Could not create categories");

    const locationRows = [
      { organization_id: organizationId, code: "HYD", name: "Hyderabad Campus", type: "plant" },
      { organization_id: organizationId, code: "GNT", name: "Guntur Office", type: "plant" },
      { organization_id: organizationId, code: "HYD-A", name: "Building A", type: "building" },
    ];
    const { data: locations, error: locationError } = await supabaseAdmin.from("locations").insert(locationRows).select("id,name");
    if (locationError || !locations) throw new Error(locationError?.message ?? "Could not create locations");

    const departmentRows = ["Finance", "Information Technology", "Facilities", "Operations", "Human Resources"].map((name, index) => ({ organization_id: organizationId, code: `D${String(index + 1).padStart(2, "0")}`, name, location_id: locations[index % locations.length]?.id ?? null }));
    const { data: departments, error: departmentError } = await supabaseAdmin.from("departments").insert(departmentRows).select("id,name");
    if (departmentError || !departments) throw new Error(departmentError?.message ?? "Could not create departments");

    const employeeNames = ["Aarav Mehta", "Meera Rao", "Devraj Sen", "Priya Nair", "Kiran Patel", "Ananya Iyer", "Ravi Kumar", "Sana Khan", "Arjun Das", "Neha Gupta", "Vikram Singh", "Ishita Shah"];
    const { data: employees, error: employeeError } = await supabaseAdmin.from("employees").insert(employeeNames.map((full_name, index) => ({ organization_id: organizationId, employee_code: `EMP-${String(index + 1).padStart(4, "0")}`, full_name, email: `${full_name.toLowerCase().replaceAll(" ", ".")}@sharvi.demo`, designation: index % 3 === 0 ? "Manager" : "Specialist", department_id: departments[index % departments.length]?.id ?? null, location_id: locations[index % locations.length]?.id ?? null }))).select("id");
    if (employeeError || !employees) throw new Error(employeeError?.message ?? "Could not create employees");

    const statuses = ["active", "assigned", "under_maintenance", "active", "active", "missing", "in_stock"] as const;
    const conditions = ["new", "good", "good", "average", "good"] as const;
    const assets = Array.from({ length: 54 }, (_, index) => {
      const category = categories[index % categories.length];
      return {
        organization_id: organizationId,
        category_id: category?.id ?? null,
        location_id: locations[index % locations.length]?.id ?? null,
        department_id: departments[index % departments.length]?.id ?? null,
        assigned_employee_id: index % 3 === 0 ? employees[index % employees.length]?.id ?? null : null,
        asset_id: `${category?.prefix}-${String(index + 1).padStart(6, "0")}`,
        name: `${category?.name ?? "Asset"} ${String(index + 1).padStart(2, "0")}`,
        manufacturer: ["Dell", "HP", "Daikin", "Godrej", "Cisco"][index % 5] ?? "Sharvi", model: `M-${2020 + (index % 7)}-${index + 11}`,
        serial_number: `SN-${organizationId.slice(0, 4).toUpperCase()}-${String(10000 + index)}`,
        purchase_value: 18000 + index * 3750, current_value: 12000 + index * 2500,
        status: statuses[index % statuses.length] ?? "active", condition: conditions[index % conditions.length] ?? "good", company: "Sharvi Infotech", company_code: "SIPL", plant: locations[index % locations.length]?.name ?? "Main Plant", criticality: index % 8 === 0 ? "high" : "medium",
        capitalization_date: new Date(Date.now() - (90 + index * 47) * 86400000).toISOString().slice(0, 10),
        warranty_end: new Date(Date.now() + (index - 20) * 86400000 * 10).toISOString().slice(0, 10), created_by: context.userId,
      };
    });
    const { data: createdAssets, error: assetError } = await supabaseAdmin.from("assets").insert(assets).select("id,organization_id");
    if (assetError || !createdAssets) throw new Error(assetError?.message ?? "Could not create demo assets");
    const { error: qrError } = await supabaseAdmin.from("asset_qr_codes").insert(createdAssets.map((asset) => ({ organization_id: asset.organization_id, asset_id: asset.id, generated_by: context.userId })));
    if (qrError) throw new Error(qrError.message);
    return { organizationId };
  });

export const getWorkspaceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) return { needsOnboarding: true as const };
    const organizationId = membership.organization_id;
    const [organization, profile, assets, categories, locations, departments] = await Promise.all([
      context.supabase.from("organizations").select("id,name,mode").eq("id", organizationId).single(),
      context.supabase.from("profiles").select("full_name,job_title,avatar_url").eq("id", context.userId).maybeSingle(),
      readAllRows((from, to) => context.supabase.from("assets").select("id,asset_id,name,category_id,remarks,manufacturer,model,serial_number,plant,company_code,status,condition,location_id,department_id,assigned_employee_id,purchase_date,capitalization_date,purchase_value,current_value,warranty_end,created_at,asset_categories(name,prefix),locations(name),departments(name),employees(full_name),asset_qr_codes(token)").eq("organization_id", organizationId).order("created_at", { ascending: false }).order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("asset_categories").select("id,name,prefix").eq("organization_id", organizationId).order("name").order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("locations").select("id,name,type,code").eq("organization_id", organizationId).order("name").order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("departments").select("id,name,code").eq("organization_id", organizationId).order("name").order("id").range(from, to)),
    ]);
    const [employees, transfers, maintenance, verifications, events] = await Promise.all([
      readAllRows((from, to) => context.supabase.from("employees").select("id,full_name,employee_code,designation,status").eq("organization_id", organizationId).order("full_name").order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("asset_transfers").select("id,status,transfer_date,reason,remarks,from_location_id,to_location_id,from_employee_id,to_employee_id,created_at,assets(asset_id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("maintenance_requests").select("id,title,status,maintenance_type,next_maintenance_date,cost,remarks,photo_path,source,created_at,assets(asset_id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("asset_verifications").select("id,status,verified_at,assets(asset_id,name)").eq("organization_id", organizationId).order("verified_at", { ascending: false }).order("id").range(from, to)),
      readAllRows((from, to) => context.supabase.from("asset_events").select("id,event_type,summary,created_at,assets(asset_id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).order("id").range(from, to)),
    ]);
    const firstError = [organization, profile, assets, categories, locations, departments, employees, transfers, maintenance, verifications, events].find((result) => result.error)?.error;
    if (firstError) throw new Error(firstError.message);
    const serviceRequests = [];
    for (let offset = 0; offset < (maintenance.data ?? []).length; offset += 6) {
      const batch = await Promise.all((maintenance.data ?? []).slice(offset, offset + 6).map(async (request) => {
        const photo = request.photo_path ? await context.supabase.storage.from("breakdown-photos").createSignedUrl(request.photo_path, 3600) : null;
        return { ...request, photo_url: photo?.data?.signedUrl ?? null };
      }));
      serviceRequests.push(...batch);
    }
    return { needsOnboarding: false as const, organization: organization.data, profile: profile.data, role: membership.role, assets: assets.data ?? [], categories: categories.data ?? [], locations: locations.data ?? [], departments: departments.data ?? [], employees: employees.data ?? [], transfers: transfers.data ?? [], maintenance: serviceRequests, verifications: verifications.data ?? [], events: events.data ?? [] };
  });

async function validateAssetReferences(supabase: SupabaseClient<Database>, organizationId: string, data: z.infer<typeof assetSchema>) {
  const references = [
    ["asset_categories", data.categoryId], ["locations", data.locationId],
    ["departments", data.departmentId], ["employees", data.employeeId],
  ] as const;
  await Promise.all(references.map(async ([table, id]) => {
    if (!id) return;
    const { data: row, error } = await supabase.from(table).select("id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (error || !row) throw new Error("Select a valid category, location, department and custodian from this workspace");
  }));
}

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) throw new Error("Workspace not found");
    await validateAssetReferences(context.supabase, membership.organization_id, data);
    const { data: category, error: categoryError } = await context.supabase.from("asset_categories").select("prefix").eq("id", data.categoryId).eq("organization_id", membership.organization_id).single();
    if (categoryError) throw new Error(categoryError.message);
    const { count } = await context.supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("category_id", data.categoryId);
    const assetId = `${category.prefix}-${String((count ?? 0) + 1).padStart(6, "0")}`;
    const { data: asset, error } = await context.supabase.from("assets").insert({ ...assetValues(data), organization_id: membership.organization_id, asset_id: assetId, created_by: context.userId, updated_by: context.userId }).select("id,asset_id").single();
    if (error) throw new Error(error.message);
    const { error: qrError } = await context.supabase.from("asset_qr_codes").insert({ organization_id: membership.organization_id, asset_id: asset.id, generated_by: context.userId });
    if (qrError) throw new Error(qrError.message);
    return asset;
  });

export const importAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importAssetsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) throw new Error("Workspace not found");
    const { data: count, error } = await context.supabase.rpc("import_asset_rows", {
      _organization_id: membership.organization_id,
      _rows: data.rows.map(assetValues),
    });
    if (error) throw new Error("Import was not saved. Check for duplicate serial numbers and valid workspace details, then retry.");
    return { count: count ?? 0 };
  });

export const updateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateAssetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) throw new Error("Workspace not found");
    await validateAssetReferences(context.supabase, membership.organization_id, data);
    const { data: asset, error } = await context.supabase.from("assets")
      .update({ ...assetValues(data), updated_by: context.userId })
      .eq("id", data.assetId).eq("organization_id", membership.organization_id)
      .select("id,asset_id").single();
    if (error || !asset) throw new Error("Could not save this asset in your workspace");
    return asset;
  });

export const createTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transferSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) throw new Error("Workspace not found");
    if (!transferRoles.has(membership.role)) throw new Error("You do not have permission to create transfers");

    const [{ data: asset, error: assetError }, { data: location, error: locationError }] = await Promise.all([
      context.supabase.from("assets").select("id,location_id,assigned_employee_id").eq("id", data.assetId).eq("organization_id", membership.organization_id).single(),
      context.supabase.from("locations").select("id").eq("id", data.toLocationId).eq("organization_id", membership.organization_id).single(),
    ]);
    if (assetError || !asset) throw new Error("Asset not found in this workspace");
    if (locationError || !location) throw new Error("Destination location not found");
    if (asset.location_id === data.toLocationId && (asset.assigned_employee_id ?? null) === (data.toEmployeeId ?? null)) throw new Error("Choose a different location or custodian");
    if (data.toEmployeeId) {
      const { data: employee, error: employeeError } = await context.supabase.from("employees").select("id").eq("id", data.toEmployeeId).eq("organization_id", membership.organization_id).single();
      if (employeeError || !employee) throw new Error("Custodian not found in this workspace");
    }
    const { data: existing } = await context.supabase.from("asset_transfers").select("id").eq("asset_id", data.assetId).in("status", ["pending", "approved"]).limit(1).maybeSingle();
    if (existing) throw new Error("This asset already has an open transfer");

    const { data: transfer, error } = await context.supabase.from("asset_transfers").insert({
      organization_id: membership.organization_id,
      asset_id: data.assetId,
      from_location_id: asset.location_id,
      to_location_id: data.toLocationId,
      from_employee_id: asset.assigned_employee_id,
      to_employee_id: data.toEmployeeId ?? null,
      transfer_date: data.transferDate,
      reason: data.reason,
      remarks: data.remarks || null,
      status: "pending",
      created_by: context.userId,
    }).select("id,status").single();
    if (error) throw new Error(error.message);
    return transfer;
  });

export const processTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ transferId: z.string().uuid(), action: z.enum(["approve", "reject", "complete"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership || !transferRoles.has(membership.role)) throw new Error("You do not have permission to process transfers");
    const { data: status, error } = await context.supabase.rpc("process_asset_transfer", { _transfer_id: data.transferId, _action: data.action });
    if (error) throw new Error(error.message);
    return { status };
  });

export const getPublicAsset = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Public asset verification is unavailable");
    const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const { data: asset, error } = await client.rpc("get_public_asset_details", { _token: data.token }).maybeSingle();
    if (error) throw new Error(error.message);
    return asset;
  });
