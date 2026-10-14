import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, LoaderCircle, Pencil, Plus, Search, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { canManageCategories, categoryConflict, categorySchema, normalizePrefix } from "@/lib/category-schema";
import { createCategory, deleteCategory, updateCategory } from "@/lib/category.functions";
import type { WorkspaceData } from "./workspace";

type Category = WorkspaceData["categories"][number];

export function Categories({ data }: { data: WorkspaceData }) {
  const canManage = canManageCategories(data.role);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const queryClient = useQueryClient();
  const remove = useServerFn(deleteCategory);
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of data.assets) if (asset.category_id) map.set(asset.category_id, (map.get(asset.category_id) ?? 0) + 1);
    return map;
  }, [data.assets]);
  const term = search.trim().toLowerCase();
  const rows = data.categories.filter((c) => !term || [c.name, c.prefix, c.description ?? ""].some((v) => v.toLowerCase().includes(term)));
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { categoryId: id } }),
    onSuccess: () => { toast.success("Category deleted"); setDeleting(null); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); },
    onError: (error) => { toast.error(error.message); setDeleting(null); },
  });

  if (editing) return <CategoryForm data={data} category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;

  return <div className="overflow-hidden rounded-lg border border-glass-border bg-glass soft-enter">
    <div className="flex flex-col gap-3 border-b border-glass-border p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search categories" className="h-10 bg-glass-strong pl-9" placeholder="Search name, prefix or description…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {canManage && <Button variant="hero" onClick={() => setEditing("new")}><Plus />Add category</Button>}
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
      <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Name", "Prefix", "Description", "Assets", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{rows.map((c) => { const used = usage.get(c.id) ?? 0; return <tr key={c.id} className="border-t border-glass-border">
        <td className="px-4 py-3 font-medium">{c.name}</td>
        <td className="px-4 py-3"><Badge variant="outline">{c.prefix}</Badge></td>
        <td className="max-w-md px-4 py-3 text-muted-foreground">{c.description || "—"}</td>
        <td className="px-4 py-3">{used}</td>
        <td className="px-4 py-3 text-right">{canManage && <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil />Edit</Button>
          <Button size="sm" variant="ghost" disabled={used > 0} title={used ? `Used by ${used} assets` : undefined} onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Trash2 />{used ? `Used by ${used}` : "Delete"}</Button>
        </div>}</td>
      </tr>; })}</tbody>
    </table></div> : <div className="grid place-items-center gap-2 p-10 text-center text-sm text-muted-foreground"><Archive className="size-6" />{data.categories.length ? "No categories match your search." : "No categories yet."}</div>}
    <div className="border-t border-glass-border p-4 text-xs text-muted-foreground">Showing {rows.length} of {data.categories.length} categories{canManage ? "" : " · read-only access"}</div>
    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleting(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This category is not used by any asset. Deleting it cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(e) => { e.preventDefault(); if (deleting) deleteMutation.mutate(deleting.id); }}>{deleteMutation.isPending && <LoaderCircle className="animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function CategoryForm({ data, category, onClose }: { data: WorkspaceData; category: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [prefix, setPrefix] = useState(category?.prefix ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const create = useServerFn(createCategory);
  const update = useServerFn(updateCategory);
  const mutation = useMutation({
    mutationFn: (values: { name: string; prefix: string; description: string }) => category ? update({ data: { ...values, categoryId: category.id } }) : create({ data: values }),
    onSuccess: () => { toast.success(category ? "Category updated" : "Category added"); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); onClose(); },
    onError: (error) => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = categorySchema.safeParse({ name, prefix, description });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    const conflict = categoryConflict(data.categories, parsed.data.name, parsed.data.prefix, category?.id);
    if (conflict) { setErrors({ [conflict]: conflict === "name" ? "A category with this name already exists" : "This prefix is already used by another category" }); return; }
    setErrors({});
    mutation.mutate(parsed.data);
  };
  return <form onSubmit={submit} className="glass-panel max-w-2xl space-y-5 rounded-2xl p-6 soft-enter" noValidate>
    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{category ? "Edit category" : "Add category"}</h2><Button type="button" variant="ghost" onClick={onClose}><ArrowLeft />Back to categories</Button></div>
    <div><Label htmlFor="category-name">Name *</Label><Input id="category-name" className="mt-2 bg-glass-strong" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors["name"]} />{errors["name"] && <p className="mt-1 text-xs text-destructive">{errors["name"]}</p>}</div>
    <div><Label htmlFor="category-prefix">Prefix *</Label><Input id="category-prefix" className="mt-2 bg-glass-strong uppercase" value={prefix} maxLength={6} onChange={(e) => setPrefix(normalizePrefix(e.target.value))} aria-invalid={!!errors["prefix"]} />{errors["prefix"] ? <p className="mt-1 text-xs text-destructive">{errors["prefix"]}</p> : <p className="mt-1 text-xs text-muted-foreground">2–6 letters or digits, used for new asset IDs (e.g. LAP-000001).{category && " Existing asset IDs and QR labels never change."}</p>}</div>
    <div><Label htmlFor="category-description">Description</Label><Textarea id="category-description" className="mt-2 bg-glass-strong" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />{errors["description"] && <p className="mt-1 text-xs text-destructive">{errors["description"]}</p>}</div>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button variant="hero" disabled={mutation.isPending}>{mutation.isPending && <LoaderCircle className="animate-spin" />}{category ? "Save changes" : "Add category"}</Button></div>
  </form>;
}
