import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, LoaderCircle, Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { canManageLocations, deactivationBlocker, locationConflict, locationSchema, locationTypes, normalizeCode, wouldCreateCycle } from "@/lib/location-schema";
import { createLocation, setLocationStatus, updateLocation } from "@/lib/location.functions";
import type { WorkspaceData } from "./workspace";

type Location = WorkspaceData["locations"][number];
const pretty = (v: string) => v.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export function Locations({ data }: { data: WorkspaceData }) {
  const canManage = canManageLocations(data.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const [toggling, setToggling] = useState<Location | null>(null);
  const queryClient = useQueryClient();
  const toggle = useServerFn(setLocationStatus);
  const byId = useMemo(() => new Map(data.locations.map((l) => [l.id, l])), [data.locations]);
  const usage = useMemo(() => {
    const assets = new Map<string, number>(); const children = new Map<string, number>();
    for (const a of data.assets) if (a.location_id) assets.set(a.location_id, (assets.get(a.location_id) ?? 0) + 1);
    for (const l of data.locations) if (l.parent_id) children.set(l.parent_id, (children.get(l.parent_id) ?? 0) + 1);
    return { assets, children };
  }, [data.assets, data.locations]);
  const openDestinations = data.transfers.filter((t) => ["pending", "approved"].includes(t.status)).map((t) => t.to_location_id ?? "");
  const term = search.trim().toLowerCase();
  const rows = data.locations.filter((l) => (status === "all" || (l.status ?? "active") === status) && (!term || [l.code, l.name, l.type, byId.get(l.parent_id ?? "")?.name ?? ""].some((v) => v.toLowerCase().includes(term))));
  const mutation = useMutation({
    mutationFn: (l: Location) => toggle({ data: { locationId: l.id, status: l.status === "inactive" ? "active" : "inactive" } }),
    onSuccess: (row) => { toast.success(row.status === "active" ? "Location reactivated" : "Location deactivated"); setToggling(null); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); },
    onError: (e) => { toast.error(e.message); setToggling(null); },
  });

  if (editing) return <LocationForm data={data} location={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;
  const blocker = toggling && toggling.status !== "inactive" ? deactivationBlocker(toggling.id, data.locations, openDestinations) : null;

  return <div className="overflow-hidden rounded-lg border border-glass-border bg-glass soft-enter">
    <div className="flex flex-col gap-3 border-b border-glass-border p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search locations" className="h-10 bg-glass-strong pl-9" placeholder="Search code, name, type or parent…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40 bg-glass-strong" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      {canManage && <Button variant="hero" onClick={() => setEditing("new")}><Plus />Add location</Button>}
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
      <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Code", "Name", "Type", "Parent location", "Status", "Assets", "Children", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{rows.map((l) => { const inactive = l.status === "inactive"; return <tr key={l.id} className="border-t border-glass-border">
        <td className="px-4 py-3"><Badge variant="outline">{l.code}</Badge></td>
        <td className="px-4 py-3 font-medium">{l.name}</td>
        <td className="px-4 py-3">{pretty(l.type)}</td>
        <td className="px-4 py-3 text-muted-foreground">{byId.get(l.parent_id ?? "")?.name ?? "—"}</td>
        <td className="px-4 py-3"><Badge variant={inactive ? "secondary" : "default"}>{inactive ? "Inactive" : "Active"}</Badge></td>
        <td className="px-4 py-3">{usage.assets.get(l.id) ?? 0}</td>
        <td className="px-4 py-3">{usage.children.get(l.id) ?? 0}</td>
        <td className="px-4 py-3 text-right">{canManage && <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(l)} aria-label={`Edit ${l.name}`}><Pencil />Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setToggling(l)} aria-label={`${inactive ? "Reactivate" : "Deactivate"} ${l.name}`}><Power />{inactive ? "Reactivate" : "Deactivate"}</Button>
        </div>}</td>
      </tr>; })}</tbody>
    </table></div> : <div className="grid place-items-center gap-2 p-10 text-center text-sm text-muted-foreground"><Building2 className="size-6" />{data.locations.length ? "No locations match your filters." : "No locations yet."}</div>}
    <div className="border-t border-glass-border p-4 text-xs text-muted-foreground">Showing {rows.length} of {data.locations.length} locations{canManage ? "" : " · read-only access"}</div>
    <AlertDialog open={!!toggling} onOpenChange={(open) => !open && !mutation.isPending && setToggling(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{toggling?.status === "inactive" ? "Reactivate" : "Deactivate"} {toggling?.name}?</AlertDialogTitle><AlertDialogDescription>{blocker ?? (toggling?.status === "inactive" ? "It will be available again for new assets and transfers." : "It will be hidden from new assets and transfers. Existing assets, transfers and history keep this location.")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={mutation.isPending || !!blocker} onClick={(e) => { e.preventDefault(); if (toggling) mutation.mutate(toggling); }}>{mutation.isPending && <LoaderCircle className="animate-spin" />}{toggling?.status === "inactive" ? "Reactivate" : "Deactivate"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function LocationForm({ data, location, onClose }: { data: WorkspaceData; location: Location | null; onClose: () => void }) {
  const [form, setForm] = useState({ code: location?.code ?? "", name: location?.name ?? "", type: location?.type ?? "", parentId: location?.parent_id ?? "", status: location?.status === "inactive" ? "inactive" : "active" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const create = useServerFn(createLocation); const update = useServerFn(updateLocation);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const parents = data.locations.filter((l) => l.id !== location?.id && (l.status !== "inactive" || l.id === location?.parent_id) && !wouldCreateCycle(data.locations, location?.id, l.id));
  const mutation = useMutation({
    mutationFn: (values: ReturnType<typeof locationSchema.parse>) => location ? update({ data: { ...values, locationId: location.id } }) : create({ data: values }),
    onSuccess: () => { toast.success(location ? "Location updated" : "Location added"); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = locationSchema.safeParse({ ...form, parentId: form.parentId || null });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    if (locationConflict(data.locations, parsed.data.code, location?.id)) { setErrors({ code: "This location code is already used in your workspace" }); return; }
    if (wouldCreateCycle(data.locations, location?.id, parsed.data.parentId)) { setErrors({ parentId: "A location cannot be placed under itself or one of its own children" }); return; }
    setErrors({}); mutation.mutate(parsed.data);
  };
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  return <form onSubmit={submit} className="glass-panel max-w-2xl space-y-5 rounded-2xl p-6 soft-enter" noValidate>
    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{location ? "Edit location" : "Add location"}</h2><Button type="button" variant="ghost" onClick={onClose}><ArrowLeft />Back to locations</Button></div>
    <fieldset disabled={mutation.isPending} className="grid gap-5 sm:grid-cols-2">
      <div><Label htmlFor="location-code">Code *</Label><Input id="location-code" className="mt-2 bg-glass-strong uppercase" value={form.code} maxLength={20} onChange={(e) => set("code", normalizeCode(e.target.value))} aria-invalid={!!errors["code"]} />{err("code")}</div>
      <div><Label htmlFor="location-name">Name *</Label><Input id="location-name" className="mt-2 bg-glass-strong" value={form.name} maxLength={100} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors["name"]} />{err("name")}</div>
      <div><Label htmlFor="location-type">Type *</Label><Select value={form.type} onValueChange={(v) => set("type", v)}><SelectTrigger id="location-type" className="mt-2 w-full bg-glass-strong"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{locationTypes.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent></Select>{err("type")}</div>
      <div><Label htmlFor="location-parent">Parent location</Label><Select value={form.parentId || "none"} onValueChange={(v) => set("parentId", v === "none" ? "" : v)}><SelectTrigger id="location-parent" className="mt-2 w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No parent</SelectItem>{parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent></Select>{err("parentId")}</div>
      <div><Label htmlFor="location-status">Status</Label><Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger id="location-status" className="mt-2 w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
    </fieldset>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button variant="hero" disabled={mutation.isPending}>{mutation.isPending && <LoaderCircle className="animate-spin" />}{location ? "Save changes" : "Add location"}</Button></div>
  </form>;
}
