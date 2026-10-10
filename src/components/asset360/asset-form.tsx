import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { createAsset, updateAsset } from "@/lib/asset360.functions";
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
  const [form, setForm] = useState({
    ...Object.fromEntries(assetErpFields.map(field => [field.key, asset?.[field.column] == null ? "" : String(asset[field.column])])) as Record<ErpKey, string>,
    name: asset?.name ?? "", categoryId: asset?.category_id ?? "", serialNumber: asset?.serial_number ?? "",
    manufacturer: asset?.manufacturer ?? "", model: asset?.model ?? "", plant: asset?.plant ?? "", companyCode: asset?.company_code ?? "",
    status: asset?.status ?? "active", condition: asset?.condition ?? "good", locationId: asset?.location_id ?? "",
    departmentId: asset?.department_id ?? "", employeeId: asset?.assigned_employee_id ?? "",
    purchaseValue: asset?.purchase_value == null ? "" : String(asset.purchase_value), currentValue: asset?.current_value == null ? "" : String(asset.current_value),
    installationDate: asset?.capitalization_date ?? "", warrantyEnd: asset?.warranty_end ?? "", remarks: asset?.remarks ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const set = (key: keyof typeof form, value: string) => { setForm(current => ({ ...current, [key]: value })); setDirty(true); setErrors(current => ({ ...current, [key]: "" })); };
  const close = () => { if (!dirty || window.confirm("Discard unsaved asset changes?")) onClose(); };
  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = assetSchema.safeParse({ ...form, ...Object.fromEntries(assetErpFields.map(field => [field.key, form[field.key] === "" ? undefined : field.type === "number" ? Number(form[field.key]) : form[field.key]])), locationId: form.locationId || undefined, departmentId: form.departmentId || undefined, employeeId: form.employeeId || undefined, purchaseValue: form.purchaseValue === "" ? undefined : Number(form.purchaseValue), currentValue: form.currentValue === "" ? undefined : Number(form.currentValue), installationDate: form.installationDate || undefined, warrantyEnd: form.warrantyEnd || undefined });
      if (!parsed.success) {
        const next: Record<string, string> = {}; parsed.error.issues.forEach(issue => { next[String(issue.path[0])] = issue.message; }); setErrors(next);
        throw new Error("Please check the highlighted asset details");
      }
      return asset ? update({ data: { ...parsed.data, assetId: asset.id } }) : create({ data: parsed.data });
    },
    onSuccess: async result => { await client.invalidateQueries({ queryKey: ["workspace"] }); toast.success(`${result.asset_id} ${asset ? "updated" : "registered"}`); onClose(); },
    onError: error => toast.error(error.message),
  });
  const field = (key: keyof typeof form, label: string, child: ReactNode) => <div key={key} className="min-w-0"><Label htmlFor={`asset-${key}`} className="mb-2 block">{label}</Label>{child}{errors[key] && <p className="mt-1 text-xs text-destructive" role="alert">{errors[key]}</p>}</div>;
  const input = (key: keyof typeof form, label: string, type = "text", maxLength = 100) => field(key, label, <Input id={`asset-${key}`} aria-invalid={Boolean(errors[key])} value={form[key]} onChange={e => set(key, e.target.value)} type={type} maxLength={maxLength} min={type === "number" && !assetErpFields.some(field => field.key === key) ? 0 : undefined} max={type === "number" ? 999999999999 : undefined} step={type === "number" ? "any" : undefined} className="w-full bg-glass-strong" />);
  const select = (key: keyof typeof form, label: string, options: { id: string; name: string }[], optional = false) => field(key, label, <Select value={form[key] || "none"} onValueChange={value => set(key, value === "none" ? "" : value)}><SelectTrigger id={`asset-${key}`} aria-invalid={Boolean(errors[key])} className="w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{optional ? "Unassigned" : "Select category"}</SelectItem>{options.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>);
  const section = (title: string, children: ReactNode) => <section className="border-b border-glass-border py-6"><h3 className="mb-5 font-display text-base font-bold">{title}</h3><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
  return <div className="soft-enter" aria-label={asset ? "Edit asset form" : "Add asset form"}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border pb-5"><Button variant="ghost" onClick={close} disabled={mutation.isPending}><ArrowLeft />Back to assets</Button><span className="font-mono text-sm font-semibold text-primary">{asset?.asset_id ?? "New asset"}</span></div>
    <form noValidate onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
      <fieldset disabled={mutation.isPending}>
        {section("Asset identification", <>{input("name", "Asset description / name *", "text", 120)}{select("categoryId", "Category *", data.categories)}{input("serialNumber", "Serial number")}{input("manufacturer", "Manufacturer")}{input("model", "Equipment / model")}{input("companyCode", "Company code", "text", 50)}</>)}
        {section("Location & ownership", <>{input("plant", "Plant")}{select("locationId", "Location", data.locations, true)}{select("departmentId", "Department", data.departments, true)}{select("employeeId", "Custodian", data.employees.map(x => ({ id: x.id, name: x.full_name })), true)}</>)}
        {section("Value & lifecycle", <>{input("purchaseValue", "Cumulative acquisition value", "number")}{input("currentValue", "Ending book value", "number")}{input("installationDate", "Capitalized on / installation date", "date")}{input("warrantyEnd", "Warranty end", "date")}{select("status", "Status", assetSchema.shape.status.options.map(id => ({ id, name: id.replaceAll("_", " ") })))}{select("condition", "Condition", assetSchema.shape.condition.options.map(id => ({ id, name: id })))}</>)}
        {["ERP identification", "Depreciation & life", "Financial movements", "Additional references"].map(title => <div key={title}>{section(title, assetErpFields.filter(field => field.section === title).map(field => input(field.key, field.label, field.type)))}</div>)}
        <section className="py-6">{field("remarks", "Remarks", <textarea id="asset-remarks" value={form.remarks} onChange={e => set("remarks", e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border border-input bg-glass-strong p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />)}</section>
      </fieldset>
      {mutation.error && <p role="alert" className="mb-4 text-sm text-destructive">{mutation.error.message}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-glass-border py-5"><Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button><Button type="submit" variant="hero" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}{asset ? "Save changes" : "Register asset"}</Button></div>
    </form>
  </div>;
}
