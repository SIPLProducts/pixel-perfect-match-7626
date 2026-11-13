import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAuth } from "@/lib/app-auth";
import type { Database } from "@/integrations/supabase/types";
import { canManageCategories, categoryConflict, parentBlocker, categorySchema, deleteCategorySchema, updateCategorySchema } from "@/lib/category-schema";
import { setCategoryTemplateSchema } from "@/lib/asset-templates";

async function managerOrg(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error || !data) throw new Error("Workspace not found");
  if (!canManageCategories(data.role)) throw new Error("You do not have permission to manage categories");
  return data.organization_id;
}

async function assertValid(supabase: SupabaseClient<Database>, organizationId: string, name: string, prefix: string, parentId: string | null, ignoreId?: string) {
  const { data, error } = await supabase.from("asset_categories").select("id,name,prefix,parent_id").eq("organization_id", organizationId);
  if (error) throw new Error("Categories could not be checked. Please retry.");
  const conflict = categoryConflict(data ?? [], name, prefix, ignoreId);
  if (conflict === "name") throw new Error("A category with this name already exists");
  if (conflict === "prefix") throw new Error("This prefix is already used by another category");
  if (parentId) {
    const { count } = await supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("category_id", parentId);
    const blocker = parentBlocker(data ?? [], ignoreId, parentId, new Set(count ? [parentId] : []));
    if (blocker) throw new Error(blocker);
  }
}

function friendly(error: { code?: string; message: string }): Error {
  if (error.code === "23505") return new Error(error.message.includes("prefix") ? "This prefix is already used by another category" : "A category with this name already exists");
  if (error.code === "23503") return new Error(error.message.includes("subcategories") ? "Move or delete its subcategories first" : "This category is used by assets and cannot be deleted");
  if (error.code === "23514") return new Error(error.message);
  return new Error("Category could not be saved. Please retry.");
}

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    await assertValid(context.supabase, organizationId, data.name, data.prefix, data.parentId);
    const { data: row, error } = await context.supabase.from("asset_categories")
      .insert({ organization_id: organizationId, name: data.name, prefix: data.prefix, description: data.description || null, parent_id: data.parentId })
      .select("id,name").single();
    if (error || !row) throw friendly(error ?? { message: "" });
    return row;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input) => updateCategorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    await assertValid(context.supabase, organizationId, data.name, data.prefix, data.parentId, data.categoryId);
    const { data: row, error } = await context.supabase.from("asset_categories")
      .update({ name: data.name, prefix: data.prefix, description: data.description || null, parent_id: data.parentId })
      .eq("id", data.categoryId).eq("organization_id", organizationId).select("id,name").maybeSingle();
    if (error) throw friendly(error);
    if (!row) throw new Error("Category not found in this workspace");
    return row;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input) => deleteCategorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    const { count, error: countError } = await context.supabase.from("assets").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("category_id", data.categoryId);
    if (countError) throw new Error("Category usage could not be checked. Please retry.");
    if ((count ?? 0) > 0) throw new Error(`This category is used by ${count} asset${count === 1 ? "" : "s"} and cannot be deleted`);
    // The database trigger re-checks atomically, so a concurrent asset save can never be unlinked.
    const { data: rows, error } = await context.supabase.from("asset_categories").delete()
      .eq("id", data.categoryId).eq("organization_id", organizationId).select("id");
    if (error) throw friendly(error);
    if (!rows?.length) throw new Error("Category not found in this workspace");
    return { id: data.categoryId };
  });

export const setCategoryTemplate = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input) => setCategoryTemplateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const organizationId = await managerOrg(context.supabase, context.userId);
    const { data: cat } = await context.supabase.from("asset_categories").select("id").eq("id", data.categoryId).eq("organization_id", organizationId).maybeSingle();
    if (!cat) throw new Error("Category not found in this workspace");
    const table = context.supabase.from("category_templates");
    const { error } = data.templateKey
      ? await table.upsert({ category_id: data.categoryId, organization_id: organizationId, template_key: data.templateKey, updated_by: context.userId, updated_at: new Date().toISOString() })
      : await table.delete().eq("category_id", data.categoryId).eq("organization_id", organizationId);
    if (error) throw new Error("Excel template setting could not be saved. Please retry.");
    return { categoryId: data.categoryId, templateKey: data.templateKey };
  });
