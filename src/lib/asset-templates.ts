import { z } from "zod";
import itTemplate from "@/assets/templates/IT-Computer-Equipment-Template.xlsx.asset.json";
import plantTemplate from "@/assets/templates/Plant-and-Machinery-Template.xlsx.asset.json";

// Templates are referenced by stable keys; categories link to keys per workspace, never by name or ID in code.
export const assetTemplates = [
  { key: "it_computer", label: "IT / Computer equipment format", filename: "IT-Computer-Equipment-Template.xlsx", url: itTemplate.url },
  { key: "plant_machinery", label: "Plant & Machinery format", filename: "Plant-and-Machinery-Template.xlsx", url: plantTemplate.url },
] as const;
export type TemplateKey = (typeof assetTemplates)[number]["key"];
export const templateKeySchema = z.enum(["it_computer", "plant_machinery"]);
export const setCategoryTemplateSchema = z.object({ categoryId: z.string().uuid(), templateKey: templateKeySchema.nullable() });

type Cat = { id: string; parent_id?: string | null };
type Link = { category_id: string; template_key: string };

export function templateByKey(key?: string | null) {
  return assetTemplates.find((t) => t.key === key) ?? null;
}

/** Own link first, then the parent category's link; null when nothing is configured. */
export function resolveTemplate(categoryId: string, categories: Cat[], links: Link[]) {
  const own = links.find((l) => l.category_id === categoryId);
  if (own) return templateByKey(own.template_key);
  const parentId = categories.find((c) => c.id === categoryId)?.parent_id;
  const parent = parentId ? links.find((l) => l.category_id === parentId) : undefined;
  return parent ? templateByKey(parent.template_key) : null;
}

export async function downloadTemplateFile(template: { url: string; filename: string }) {
  const res = await fetch(template.url);
  if (!res.ok) throw new Error("Template download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = template.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
