import { assignableCategories } from "@/lib/category-schema";
import { selectableEmployees } from "@/lib/employee-schema";
import { selectableLocations } from "@/lib/location-schema";
import { useState, useRef, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Info, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { createAsset, updateAsset } from "@/lib/asset360.functions";
import { AssetDocumentPicker, type PendingDocument } from "./asset-documents";
import { SapAssetEntry } from "./sap-asset-entry";
import { uploadAssetDocument } from "@/lib/asset-documents.functions";
import { assetErpFields } from "@/lib/asset-erp-fields";
import { assetSchema } from "@/lib/asset-form-schema";
import type { WorkspaceData } from "./workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ErpKey = typeof assetErpFields[number]["key"];
type Asset = WorkspaceData["assets"][number];
export function AssetForm({ data, asset, onClose }: { data: WorkspaceData; asset: Asset | null; onClose: () => void }) {
  const client = useQueryClient();
  const create = useServerFn(createAsset); const update = useServerFn(updateAsset);
  const initialForm = () => ({
    ...Object.fromEntries(assetErpFields.map(field => [field.key, asset?.[field.column] == null ? "" : String(asset[field.column])])) as Record<ErpKey, string>,
    name: asset?.name ?? "", categoryId: asset?.category_id ?? "", serialNumber: asset?.serial_number ?? "",
    manufacturer: asset?.manufacturer ?? "", model: asset?.model ?? "", plant: asset?.plant ?? "", companyCode: asset?.company_code ?? "",
    status: asset?.status ?? "active", condition: asset?.condition ?? "good", locationId: asset?.location_id ?? "",
    departmentId: asset?.department_id ?? "", employeeId: asset?.assigned_employee_id ?? "",
    purchaseValue: asset?.purchase_value == null ? "" : String(asset.purchase_value), currentValue: asset?.current_value == null ? "" : String(asset.current_value),
    installationDate: asset?.capitalization_date ?? "", warrantyEnd: asset?.warranty_end ?? "", remarks: asset?.remarks ?? "",
  });
  const [form, setForm] = useState(initialForm);
  const [sapFilled, setSapFilled] = useState<Set<string>>(new Set());
  const upload = useServerFn(uploadAssetDocument);
  const savedAsset = useRef<{ id: string; asset_id: string } | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"manual" | "sap">("manual");
  const set = (key: keyof typeof form, value: string) => { setForm(current => ({ ...current, [key]: value })); setDirty(true); setErrors(current => ({ ...current, [key]: "" })); };
  const close = () => { if (!dirty || window.confirm("Discard unsaved asset changes?")) onClose(); };
  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = assetSchema.safeParse({ ...form, ...Object.fromEntries(assetErpFields.map(field => [field.key, form[field.key] === "" ? undefined : field.type === "number" ? Number(form[field.key]) : form[field.key]])), locationId: form.locationId || undefined, departmentId: form.departmentId || undefined, employeeId: form.employeeId || undefined, purchaseValue: form.purchaseValue === "" ? undefined : Number(form.purchaseValue), currentValue: form.currentValue === "" ? undefined : Number(form.currentValue), installationDate: form.installationDate || undefined, warrantyEnd: form.warrantyEnd || undefined });
      if (!parsed.success) {
        const next: Record<string, string> = {}; parsed.error.issues.forEach(issue => { next[String(issue.path[0])] = issue.message; }); setErrors(next);
        throw new Error("Please check the highlighted asset details");
      }
      const existingId = asset?.id ?? savedAsset.current?.id;
      const result = existingId ? await update({ data: { ...parsed.data, assetId: existingId } }) : await create({ data: parsed.data });
      savedAsset.current = result;
      for (const document of pendingDocuments) {
        setUploadProgress(`Uploading ${document.file.name}…`);
        const payload = new FormData();
        payload.set("assetId", result.id); payload.set("documentType", document.type); payload.set("file", document.file);
        try { await upload({ data: payload }); }
        catch (error) {
          await client.invalidateQueries({ queryKey: ["workspace"] });
          throw new Error(`Asset saved. ${document.file.name} was not uploaded: ${error instanceof Error ? error.message : "Please retry"}. Save again to retry remaining attachments.`);
        }
        setPendingDocuments(current => current.filter(item => item.id !== document.id));
      }
      setUploadProgress("");
      return result;
    },
    onSuccess: async result => { await client.invalidateQueries({ queryKey: ["workspace"] }); toast.success(`${result.asset_id} ${asset ? "updated" : "registered"}`); onClose(); },
    onError: error => { setUploadProgress(""); toast.error(error.message); },
  });
  const sap = mode === "sap" && !asset;
  const locked = (key: string) => sap && sapFilled.has(key);
  const field = (key: keyof typeof form, label: string, child: ReactNode) => <div key={key} className="min-w-0"><Label htmlFor={`asset-${key}`} className="mb-2 flex items-center gap-2">{label}{locked(key) && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">From SAP</span>}</Label>{child}{errors[key] && <p className="mt-1 text-xs text-destructive" role="alert">{errors[key]}</p>}</div>;
  const input = (key: keyof typeof form, label: string, type = "text", maxLength = 100) => field(key, label, <Input id={`asset-${key}`} readOnly={locked(key)} aria-invalid={Boolean(errors[key])} value={form[key]} onChange={e => set(key, e.target.value)} type={type} maxLength={maxLength} min={type === "number" && !assetErpFields.some(field => field.key === key) ? 0 : undefined} max={type === "number" ? 999999999999 : undefined} step={type === "number" ? "any" : undefined} className="w-full bg-glass-strong" />);
  const select = (key: keyof typeof form, label: string, options: { id: string; name: string }[], optional = false) => field(key, label, <Select disabled={locked(key)} value={form[key] || "none"} onValueChange={value => set(key, value === "none" ? "" : value)}><SelectTrigger id={`asset-${key}`} aria-invalid={Boolean(errors[key])} className="w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{optional ? "Unassigned" : "Select category"}</SelectItem>{options.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>);
  const section = (title: string, children: ReactNode) => <section className="border-b border-glass-border py-6"><h3 className="mb-5 font-display text-base font-bold">{title}</h3><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
  const switchMode = (next: "manual" | "sap") => { if (next === mode) return; if (dirty && !window.confirm("Discard unsaved asset changes?")) return; setForm(initialForm()); setSapFilled(new Set()); setPendingDocuments([]); setErrors({}); setDirty(false); setMode(next); };
  const applySap = (values: Record<string, string> | null) => {
    setForm(current => { const next = { ...current }; sapFilled.forEach(key => { (next as Record<string, string>)[key] = (initialForm() as Record<string, string>)[key]; }); return values ? { ...next, ...values } : next; });
    setSapFilled(new Set(values ? Object.keys(values) : []));
  };
  return <div className="soft-enter" aria-label={asset ? "Edit asset form" : "Add asset form"}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border pb-5">
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto"><Button variant="ghost" onClick={close} disabled={mutation.isPending}><ArrowLeft />Back to assets</Button>
        {!asset && <div role="group" aria-label="Asset entry workflow" className="grid w-full grid-cols-2 gap-1 rounded-lg border border-glass-border bg-glass-strong p-1 sm:w-auto">
          <Button type="button" size="sm" variant={mode === "manual" ? "hero" : "ghost"} aria-pressed={mode === "manual"} onClick={() => switchMode("manual")} disabled={mutation.isPending}>Without SAP</Button>
          <Button type="button" size="sm" variant={mode === "sap" ? "hero" : "ghost"} aria-pressed={mode === "sap"} onClick={() => switchMode("sap")} disabled={mutation.isPending}>With SAP</Button>
        </div>}
      </div>
      <span className="font-mono text-sm font-semibold text-primary">{asset?.asset_id ?? "New asset"}</span></div>
    {sap && <SapAssetEntry formKeys={Object.keys(form)} onValues={applySap} />}
    <form noValidate onSubmit={event => { event.preventDefault(); if (!sap) mutation.mutate(); }}>
      <fieldset disabled={mutation.isPending}>
        {section("Asset identification", <>{input("name", "Asset description / name *", "text", 120)}{select("categoryId", "Category *", categoryGroups(data.categories, form.categoryId))}{input("serialNumber", "Serial number")}{input("manufacturer", "Manufacturer")}{input("model", "Equipment / model")}{input("companyCode", "Company code", "text", 50)}</>)}
        {section("Location & ownership", <>{input("plant", "Plant")}{select("locationId", "Location", selectableLocations(data.locations, asset?.location_id), true)}{select("departmentId", "Department", data.departments, true)}{select("employeeId", "Custodian", selectableEmployees(data.employees, asset?.assigned_employee_id).map(x => ({ id: x.id, name: x.full_name })), true)}</>)}
        {section("Value & lifecycle", <>{input("purchaseValue", "Cumulative acquisition value", "number")}{input("currentValue", "Ending book value", "number")}{input("installationDate", "Capitalized on / installation date", "date")}{input("warrantyEnd", "Warranty end", "date")}{select("status", "Status", assetSchema.shape.status.options.map(id => ({ id, name: id.replaceAll("_", " ") })))}{select("condition", "Condition", assetSchema.shape.condition.options.map(id => ({ id, name: id })))}</>)}
        {["ERP identification", "Depreciation & life", "Financial movements", "Additional references"].map(title => <div key={title}>{section(title, assetErpFields.filter(field => field.section === title).map(field => input(field.key, field.label, field.type)))}</div>)}
        <AssetDocumentPicker pending={pendingDocuments} onChange={documents => { setPendingDocuments(documents); setDirty(true); }} existing={data.attachments.filter(document => document.asset_id === (asset?.id ?? savedAsset.current?.id))} />
        <section className="py-6">{field("remarks", "Remarks", <textarea id="asset-remarks" value={form.remarks} onChange={e => set("remarks", e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border border-input bg-glass-strong p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />)}</section>
      </fieldset>
      {uploadProgress && <p role="status" className="mb-4 text-sm text-primary">{uploadProgress}</p>}
      {mutation.error && <p role="alert" className="mb-4 text-sm text-destructive">{mutation.error.message}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-glass-border py-5">{sap && <p className="mr-auto flex items-center gap-2 text-sm text-muted-foreground"><Info className="size-4" />Saving SAP assets will be enabled once the save workflow is confirmed.</p>}<Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button>{!sap && <Button type="submit" variant="hero" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}{asset ? "Save changes" : "Register asset"}</Button>}</div>
    </form>
  </div>;
}

/** Assignable categories labelled "Parent › Subcategory", sorted so each parent's group stays together. */
function categoryGroups(categories: { id: string; name: string; parent_id?: string | null }[], keepId?: string) {
  const allowed = assignableCategories(categories);
  const kept = categories.find((c) => c.id === keepId && !allowed.includes(c));
  return [...allowed, ...(kept ? [kept] : [])].map((c) => {
    const parent = categories.find((p) => p.id === c.parent_id)?.name;
    return { id: c.id, name: parent ? `${parent} › ${c.name}` : c.name };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
