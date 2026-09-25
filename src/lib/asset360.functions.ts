import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const assetSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().uuid(),
  serialNumber: z.string().trim().max(100).optional(),
  manufacturer: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  status: z.enum(["active", "in_stock", "assigned", "under_maintenance", "under_repair", "missing", "damaged", "retired", "disposed"]),
  condition: z.enum(["new", "good", "average", "poor", "damaged"]),
  locationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  purchaseValue: z.number().nonnegative().max(999999999999).optional(),
  currentValue: z.number().nonnegative().max(999999999999).optional(),
  warrantyEnd: z.string().date().optional(),
  remarks: z.string().trim().max(1000).optional(),
});

async function getMembership(supabase: Parameters<Parameters<typeof requireSupabaseAuth>[0]>[0] extends never ? never : any, userId: string) {
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

    const departmentRows = ["Finance", "Information Technology", "Facilities", "Operations", "Human Resources"].map((name, index) => ({ organization_id: organizationId, code: `D${String(index + 1).padStart(2, "0")}`, name, location_id: locations[index % locations.length]?.id }));
    const { data: departments, error: departmentError } = await supabaseAdmin.from("departments").insert(departmentRows).select("id,name");
    if (departmentError || !departments) throw new Error(departmentError?.message ?? "Could not create departments");

    const employeeNames = ["Aarav Mehta", "Meera Rao", "Devraj Sen", "Priya Nair", "Kiran Patel", "Ananya Iyer", "Ravi Kumar", "Sana Khan", "Arjun Das", "Neha Gupta", "Vikram Singh", "Ishita Shah"];
    const { data: employees, error: employeeError } = await supabaseAdmin.from("employees").insert(employeeNames.map((full_name, index) => ({ organization_id: organizationId, employee_code: `EMP-${String(index + 1).padStart(4, "0")}`, full_name, email: `${full_name.toLowerCase().replaceAll(" ", ".")}@sharvi.demo`, designation: index % 3 === 0 ? "Manager" : "Specialist", department_id: departments[index % departments.length]?.id, location_id: locations[index % locations.length]?.id }))).select("id");
    if (employeeError || !employees) throw new Error(employeeError?.message ?? "Could not create employees");

    const statuses = ["active", "assigned", "under_maintenance", "active", "active", "missing", "in_stock"] as const;
    const conditions = ["new", "good", "good", "average", "good"] as const;
    const assets = Array.from({ length: 54 }, (_, index) => {
      const category = categories[index % categories.length];
      return {
        organization_id: organizationId,
        category_id: category?.id,
        location_id: locations[index % locations.length]?.id,
        department_id: departments[index % departments.length]?.id,
        assigned_employee_id: index % 3 === 0 ? employees[index % employees.length]?.id : null,
        asset_id: `${category?.prefix}-${String(index + 1).padStart(6, "0")}`,
        name: `${category?.name ?? "Asset"} ${String(index + 1).padStart(2, "0")}`,
        manufacturer: ["Dell", "HP", "Daikin", "Godrej", "Cisco"][index % 5], model: `M-${2020 + (index % 7)}-${index + 11}`,
        serial_number: `SN-${organizationId.slice(0, 4).toUpperCase()}-${String(10000 + index)}`,
        purchase_value: 18000 + index * 3750, current_value: 12000 + index * 2500,
        status: statuses[index % statuses.length], condition: conditions[index % conditions.length], company: "Sharvi Infotech", criticality: index % 8 === 0 ? "high" : "medium",
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
    const [organization, profile, assets, categories, locations, departments, employees, transfers, maintenance, verifications] = await Promise.all([
      context.supabase.from("organizations").select("id,name,mode").eq("id", organizationId).single(),
      context.supabase.from("profiles").select("full_name,job_title,avatar_url").eq("id", context.userId).maybeSingle(),
      context.supabase.from("assets").select("id,asset_id,name,manufacturer,model,serial_number,status,condition,purchase_value,current_value,warranty_end,created_at,asset_categories(name,prefix),locations(name),departments(name),employees(full_name)").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      context.supabase.from("asset_categories").select("id,name,prefix").eq("organization_id", organizationId).order("name"),
      context.supabase.from("locations").select("id,name,type,code").eq("organization_id", organizationId).order("name"),
      context.supabase.from("departments").select("id,name,code").eq("organization_id", organizationId).order("name"),
      context.supabase.from("employees").select("id,full_name,employee_code,designation,status").eq("organization_id", organizationId).order("full_name"),
      context.supabase.from("asset_transfers").select("id,status,transfer_date,reason,assets(asset_id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8),
      context.supabase.from("maintenance_requests").select("id,title,status,maintenance_type,next_maintenance_date,cost,assets(asset_id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8),
      context.supabase.from("asset_verifications").select("id,status,verified_at,assets(asset_id,name)").eq("organization_id", organizationId).order("verified_at", { ascending: false }).limit(8),
    ]);
    const firstError = [organization, profile, assets, categories, locations, departments, employees, transfers, maintenance, verifications].find((result) => result.error)?.error;
    if (firstError) throw new Error(firstError.message);
    return { needsOnboarding: false as const, organization: organization.data, profile: profile.data, role: membership.role, assets: assets.data ?? [], categories: categories.data ?? [], locations: locations.data ?? [], departments: departments.data ?? [], employees: employees.data ?? [], transfers: transfers.data ?? [], maintenance: maintenance.data ?? [], verifications: verifications.data ?? [] };
  });

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await getMembership(context.supabase, context.userId);
    if (!membership) throw new Error("Workspace not found");
    const { data: category, error: categoryError } = await context.supabase.from("asset_categories").select("prefix").eq("id", data.categoryId).eq("organization_id", membership.organization_id).single();
    if (categoryError) throw new Error(categoryError.message);
    const { count } = await context.supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("category_id", data.categoryId);
    const assetId = `${category.prefix}-${String((count ?? 0) + 1).padStart(6, "0")}`;
    const { data: asset, error } = await context.supabase.from("assets").insert({ organization_id: membership.organization_id, asset_id: assetId, name: data.name, category_id: data.categoryId, serial_number: data.serialNumber || null, manufacturer: data.manufacturer || null, model: data.model || null, status: data.status, condition: data.condition, location_id: data.locationId || null, department_id: data.departmentId || null, assigned_employee_id: data.employeeId || null, purchase_value: data.purchaseValue ?? null, current_value: data.currentValue ?? null, warranty_end: data.warrantyEnd ?? null, remarks: data.remarks || null, created_by: context.userId, updated_by: context.userId }).select("id,asset_id").single();
    if (error) throw new Error(error.message);
    const { error: qrError } = await context.supabase.from("asset_qr_codes").insert({ organization_id: membership.organization_id, asset_id: asset.id, generated_by: context.userId });
    if (qrError) throw new Error(qrError.message);
    return asset;
  });
