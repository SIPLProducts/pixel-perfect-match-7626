import { z } from "zod";

export const categoryRoles = new Set(["super_admin", "admin", "asset_manager"]);
export const canManageCategories = (role?: string | null) => !!role && categoryRoles.has(role);
export const normalizePrefix = (value: string) => value.trim().toUpperCase();

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be 60 characters or fewer"),
  prefix: z.string().transform(normalizePrefix).pipe(z.string().regex(/^[A-Z0-9]{2,6}$/, "Prefix must be 2–6 letters or digits")),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer").optional().default(""),
  parentId: z.string().uuid().nullable().optional().transform((v) => v ?? null),
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

type TreeRow = { id: string; name: string; parent_id?: string | null };

/** Categories assets may use: subcategories and top-level categories without subcategories. */
export function assignableCategories<T extends TreeRow>(rows: T[]): T[] {
  const parents = new Set(rows.map((r) => r.parent_id).filter(Boolean));
  return rows.filter((r) => !parents.has(r.id));
}

export function parentCategoryName(rows: TreeRow[], categoryId: string | null | undefined): string | null {
  const row = rows.find((r) => r.id === categoryId);
  return rows.find((r) => r.id === row?.parent_id)?.name ?? null;
}

export const categoryPath = (parent?: string | null, name?: string | null) => (name ? (parent ? `${parent} › ${name}` : name) : "—");

/** Why `parentId` can't be the parent of `categoryId`, or null when allowed (two levels, no loops, no assets on parents). */
export function parentBlocker(rows: TreeRow[], categoryId: string | undefined, parentId: string | null, usedIds: Set<string>): string | null {
  if (!parentId) return null;
  if (parentId === categoryId) return "A category cannot be its own parent";
  const parent = rows.find((r) => r.id === parentId);
  if (!parent) return "Parent category not found in this workspace";
  if (parent.parent_id) return "Choose a top-level parent category";
  if (categoryId && rows.some((r) => r.parent_id === categoryId)) return "A category with subcategories cannot become a subcategory";
  if (usedIds.has(parentId)) return "That category is used by assets, so it cannot become a parent";
  return null;
}

/** Parents first (alphabetical), each followed by its subcategories. */
export function categoryTree<T extends TreeRow>(rows: T[]): { row: T; depth: 0 | 1 }[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const ids = new Set(rows.map((r) => r.id));
  const tops = rows.filter((r) => !r.parent_id || !ids.has(r.parent_id)).sort(byName);
  return tops.flatMap((top) => [{ row: top, depth: 0 as const }, ...rows.filter((r) => r.parent_id === top.id).sort(byName).map((row) => ({ row, depth: 1 as const }))]);
}
