import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LoaderCircle, Pencil, Plus, Power, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { canManageEmployees, employeeCodeConflict, employeeDeactivationBlocker, employeeSchema, normalizeEmployeeCode, selectableEmployees, wouldCreateManagerLoop } from "@/lib/employee-schema";
import { selectableLocations } from "@/lib/location-schema";
import { createEmployee, setEmployeeStatus, updateEmployee } from "@/lib/employee.functions";
import type { WorkspaceData } from "./workspace";

type Employee = WorkspaceData["employees"][number];

export function Employees({ data }: { data: WorkspaceData }) {
  const canManage = canManageEmployees(data.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [toggling, setToggling] = useState<Employee | null>(null);
  const queryClient = useQueryClient();
  const toggle = useServerFn(setEmployeeStatus);
  const byId = useMemo(() => new Map(data.employees.map((e) => [e.id, e])), [data.employees]);
  const deptName = (id: string | null) => data.departments.find((d) => d.id === id)?.name ?? "";
  const locName = (id: string | null) => data.locations.find((l) => l.id === id)?.name ?? "";
  const assigned = useMemo(() => { const m = new Map<string, number>(); for (const a of data.assets) if (a.assigned_employee_id) m.set(a.assigned_employee_id, (m.get(a.assigned_employee_id) ?? 0) + 1); return m; }, [data.assets]);
  const openCustodians = data.transfers.filter((t) => ["pending", "approved"].includes(t.status)).map((t) => t.to_employee_id ?? "");
  const term = search.trim().toLowerCase();
  const rows = data.employees.filter((e) => (status === "all" || (e.status ?? "active") === status) && (!term || [e.employee_code, e.full_name, e.email ?? "", e.designation ?? "", deptName(e.department_id)].some((v) => v.toLowerCase().includes(term))));
  const mutation = useMutation({
    mutationFn: (e: Employee) => toggle({ data: { employeeId: e.id, status: e.status === "inactive" ? "active" : "inactive" } }),
    onSuccess: (row) => { toast.success(row.status === "active" ? "Employee reactivated" : "Employee deactivated"); setToggling(null); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); },
    onError: (e) => { toast.error(e.message); setToggling(null); },
  });

  if (editing) return <EmployeeForm data={data} employee={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;
  const deactivating = toggling && toggling.status !== "inactive";
  const blocker = deactivating ? employeeDeactivationBlocker(toggling.id, openCustodians) : null;
  const count = toggling ? assigned.get(toggling.id) ?? 0 : 0;

  return <div className="overflow-hidden rounded-lg border border-glass-border bg-glass soft-enter">
    <div className="flex flex-col gap-3 border-b border-glass-border p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search employees" className="h-10 bg-glass-strong pl-9" placeholder="Search code, name, email, designation or department…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40 bg-glass-strong" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      {canManage && <Button variant="hero" onClick={() => setEditing("new")}><Plus />Add employee</Button>}
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm">
      <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Code", "Name", "Designation", "Department", "Location", "Manager", "Status", "Assets", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{rows.map((e) => { const inactive = e.status === "inactive"; return <tr key={e.id} className="border-t border-glass-border">
        <td className="px-4 py-3"><Badge variant="outline">{e.employee_code}</Badge></td>
        <td className="px-4 py-3"><div className="font-medium">{e.full_name}</div>{e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}</td>
        <td className="px-4 py-3">{e.designation || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">{deptName(e.department_id) || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">{locName(e.location_id) || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">{byId.get(e.manager_id ?? "")?.full_name ?? "—"}</td>
        <td className="px-4 py-3"><Badge variant={inactive ? "secondary" : "default"}>{inactive ? "Inactive" : "Active"}</Badge></td>
        <td className="px-4 py-3">{assigned.get(e.id) ?? 0}</td>
        <td className="px-4 py-3 text-right">{canManage && <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(e)} aria-label={`Edit ${e.full_name}`}><Pencil />Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setToggling(e)} aria-label={`${inactive ? "Reactivate" : "Deactivate"} ${e.full_name}`}><Power />{inactive ? "Reactivate" : "Deactivate"}</Button>
        </div>}</td>
      </tr>; })}</tbody>
    </table></div> : <div className="grid place-items-center gap-2 p-10 text-center text-sm text-muted-foreground"><Users className="size-6" />{data.employees.length ? "No employees match your filters." : "No employees yet."}</div>}
    <div className="border-t border-glass-border p-4 text-xs text-muted-foreground">Showing {rows.length} of {data.employees.length} employees{canManage ? "" : " · read-only access"}</div>
    <AlertDialog open={!!toggling} onOpenChange={(open) => !open && !mutation.isPending && setToggling(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{deactivating ? "Deactivate" : "Reactivate"} {toggling?.full_name}?</AlertDialogTitle><AlertDialogDescription>{blocker ?? (deactivating ? `They will be hidden from new assignments and transfers.${count ? ` Their ${count} assigned asset${count > 1 ? "s stay" : " stays"} assigned.` : ""} Existing transfers and history keep this employee.` : "They will be available again for new assignments and transfers.")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={mutation.isPending || !!blocker} onClick={(ev) => { ev.preventDefault(); if (toggling) mutation.mutate(toggling); }}>{mutation.isPending && <LoaderCircle className="animate-spin" />}{deactivating ? "Deactivate" : "Reactivate"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function EmployeeForm({ data, employee, onClose }: { data: WorkspaceData; employee: Employee | null; onClose: () => void }) {
  const [form, setForm] = useState({ code: employee?.employee_code ?? "", fullName: employee?.full_name ?? "", email: employee?.email ?? "", mobile: employee?.mobile ?? "", designation: employee?.designation ?? "", departmentId: employee?.department_id ?? "", locationId: employee?.location_id ?? "", managerId: employee?.manager_id ?? "", status: employee?.status === "inactive" ? "inactive" : "active" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const create = useServerFn(createEmployee); const update = useServerFn(updateEmployee);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const managers = selectableEmployees(data.employees, employee?.manager_id).filter((e) => e.id !== employee?.id && !wouldCreateManagerLoop(data.employees, employee?.id, e.id));
  const mutation = useMutation({
    mutationFn: (values: ReturnType<typeof employeeSchema.parse>) => employee ? update({ data: { ...values, employeeId: employee.id } }) : create({ data: values }),
    onSuccess: () => { toast.success(employee ? "Employee updated" : "Employee added"); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = employeeSchema.safeParse({ ...form, departmentId: form.departmentId || null, locationId: form.locationId || null, managerId: form.managerId || null });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    if (employeeCodeConflict(data.employees, parsed.data.code, employee?.id)) { setErrors({ code: "This employee code is already used in your workspace" }); return; }
    if (wouldCreateManagerLoop(data.employees, employee?.id, parsed.data.managerId)) { setErrors({ managerId: "An employee cannot report to themselves or someone who reports to them" }); return; }
    setErrors({}); mutation.mutate(parsed.data);
  };
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  const text = (k: "code" | "fullName" | "email" | "mobile" | "designation", label: string, max: number) => <div><Label htmlFor={`employee-${k}`}>{label}</Label><Input id={`employee-${k}`} className={`mt-2 bg-glass-strong${k === "code" ? " uppercase" : ""}`} value={form[k]} maxLength={max} onChange={(e) => set(k, k === "code" ? normalizeEmployeeCode(e.target.value) : e.target.value)} aria-invalid={!!errors[k]} />{err(k)}</div>;
  const pick = (k: "departmentId" | "locationId" | "managerId", label: string, options: { id: string; name: string }[]) => <div><Label htmlFor={`employee-${k}`}>{label}</Label><Select value={form[k] || "none"} onValueChange={(v) => set(k, v === "none" ? "" : v)}><SelectTrigger id={`employee-${k}`} className="mt-2 w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select>{err(k)}</div>;
  return <form onSubmit={submit} className="glass-panel max-w-3xl space-y-5 rounded-2xl p-6 soft-enter" noValidate>
    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{employee ? "Edit employee" : "Add employee"}</h2><Button type="button" variant="ghost" onClick={onClose}><ArrowLeft />Back to employees</Button></div>
    <fieldset disabled={mutation.isPending} className="grid gap-5 sm:grid-cols-2">
      {text("code", "Employee code *", 20)}{text("fullName", "Full name *", 100)}{text("email", "Email", 255)}{text("mobile", "Mobile", 20)}{text("designation", "Designation", 100)}
      {pick("departmentId", "Department", data.departments)}
      {pick("locationId", "Location", selectableLocations(data.locations, employee?.location_id))}
      {pick("managerId", "Manager", managers.map((m) => ({ id: m.id, name: `${m.employee_code} · ${m.full_name}` })))}
      <div><Label htmlFor="employee-status">Status</Label><Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger id="employee-status" className="mt-2 w-full bg-glass-strong"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
    </fieldset>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button variant="hero" disabled={mutation.isPending}>{mutation.isPending && <LoaderCircle className="animate-spin" />}{employee ? "Save changes" : "Add employee"}</Button></div>
  </form>;
}
