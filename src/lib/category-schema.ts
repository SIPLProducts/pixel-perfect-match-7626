import { z } from "zod";

export const categoryRoles = new Set(["super_admin", "admin", "asset_manager"]);
export const canManageCategories = (role?: string | null) => !!role && categoryRoles.has(role);
export const normalizePrefix = (value: string) => value.trim().toUpperCase();

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be 60 characters or fewer"),
  prefix: z.string().transform(normalizePrefix).pipe(z.string().regex(/^[A-Z0-9]{2,6}$/, "Prefix must be 2–6 letters or digits")),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer").optional().default(""),
});
export const updateCategorySchema = categorySchema.extend({ categoryId: z.string().uuid() });
export const deleteCategorySchema = z.object({ categoryId: z.string().uuid() });

type CategoryRow = { id: string; name: string; prefix: string };
/** Returns which unique field (if any) collides with another category in the workspace. */
export function categoryConflict(rows: CategoryRow[], name: string, prefix: string, ignoreId?: string): "name" | "prefix" | null {
  const others = rows.filter((row) => row.id !== ignoreId);
  if (others.some((row) => row.name.trim().toLowerCase() === name.trim().toLowerCase())) return "name";
  if (others.some((row) => row.prefix.toUpperCase() === normalizePrefix(prefix))) return "prefix";
  return null;
}
