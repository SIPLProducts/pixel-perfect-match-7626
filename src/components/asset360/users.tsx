import { Fragment, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, Eye, EyeOff, Lock, LoaderCircle, Mail, Pencil, Plus, Power, Search, ShieldCheck, UserPlus, Users as UsersIcon, X, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { accessFor, appRoles, canManageTarget, editableModuleCount, createUserSchema, PASSWORD_MAX, permissionModules, roleInfo, roleSummary, userStatus, type AppRole } from "@/lib/user-management";
import { createUser, listUsers, resendInvite, setUserActive, updateUser } from "@/lib/user-management.functions";

type Option = { id: string; code: string; name: string };
type User = { user_id: string; email: string; full_name: string; role: AppRole; active: boolean; invited: boolean; last_sign_in_at: string | null; created_at: string };
const statusLabel = { active: "Active", invited: "Invited", deactivated: "Deactivated" } as const;
const statusVariant = { active: "border-success/30 bg-success/10 text-success", invited: "border-warning/30 bg-warning/10 text-warning", deactivated: "border-destructive/30 bg-destructive/10 text-destructive" } as const;
const fmtDate = (v: string | null) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)) : "—";
const initials = (u: User) => (u.full_name || u.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

export function UsersAccess() {
  const list = useServerFn(listUsers);
  const query = useQuery({ queryKey: ["workspace-users"], queryFn: () => list() });
  const [tab, setTab] = useState("users");
  const [focusRole, setFocusRole] = useState<string | null>(null);
  const users = (query.data?.users ?? []) as User[];
  const counts = { total: users.length, active: users.filter(u => userStatus(u) === "active").length, invited: users.filter(u => userStatus(u) === "invited").length, deactivated: users.filter(u => !u.active).length };

  if (query.isLoading) return <div className="glass-panel grid place-items-center rounded-2xl p-12"><LoaderCircle className="size-6 animate-spin text-primary"/><p className="mt-2 text-sm text-muted-foreground">Loading users…</p></div>;
  if (query.error) return <div className="glass-panel rounded-2xl p-8 text-center"><p className="text-sm text-destructive">{query.error.message}</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Retry</Button></div>;

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([["Total users", counts.total], ["Active", counts.active], ["Invited", counts.invited], ["Deactivated", counts.deactivated]] as const).map(([label, value]) =>
        <div key={label} className="glass-panel rounded-2xl p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div>)}
    </div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="roles">Roles</TabsTrigger><TabsTrigger value="matrix">Permission matrix</TabsTrigger></TabsList>
      <TabsContent value="users" className="mt-4"><UsersTab users={users} callerId={query.data!.callerId} callerRole={query.data!.callerRole} assignable={query.data!.assignable as AppRole[]} workspace={query.data!.workspaceName} plants={query.data!.plants} departments={query.data!.departments}/></TabsContent>
      <TabsContent value="roles" className="mt-4"><RolesTab users={users} onView={(r) => { setFocusRole(r); setTab("matrix"); }}/></TabsContent>
      <TabsContent value="matrix" className="mt-4"><MatrixTab focusRole={focusRole}/></TabsContent>
    </Tabs>
  </div>;
}

function UsersTab({ users, callerId, callerRole, assignable, workspace, plants, departments }: { users: User[]; callerId: string; callerRole: string; assignable: AppRole[]; workspace: string; plants: Option[]; departments: Option[] }) {
  const [search, setSearch] = useState(""); const [role, setRole] = useState("all"); const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<User | "new" | null>(null); const [toggling, setToggling] = useState<User | null>(null);
  const qc = useQueryClient(); const setActiveFn = useServerFn(setUserActive); const resendFn = useServerFn(resendInvite);
  const refresh = () => qc.invalidateQueries({ queryKey: ["workspace-users"] });
  const toggle = useMutation({ mutationFn: (u: User) => setActiveFn({ data: { userId: u.user_id, active: !u.active } }), onSuccess: (_, u) => { toast.success(u.active ? "User deactivated" : "User reactivated"); setToggling(null); void refresh(); }, onError: (e) => toast.error(e.message) });
  const resend = useMutation({ mutationFn: (u: User) => resendFn({ data: { userId: u.user_id } }), onSuccess: () => toast.success("Invitation re-sent"), onError: (e) => toast.error(e.message) });
  const rows = useMemo(() => users.filter(u => (role === "all" || u.role === role) && (status === "all" || userStatus(u) === status) && `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())), [users, role, status, search]);

  return <div className="glass-panel rounded-2xl">
    <div className="flex items-center justify-between gap-3 border-b p-4"><div><h2 className="font-display font-semibold">Users</h2><p className="text-sm text-muted-foreground">{rows.length === users.length ? `${users.length} ${users.length === 1 ? "user" : "users"}` : `${rows.length} of ${users.length} users`}</p></div><Button onClick={() => setEditing("new")}><UserPlus/>Create user</Button></div>
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input aria-label="Search users" className="pl-9" placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <Select value={role} onValueChange={setRole}><SelectTrigger className="lg:w-48" aria-label="Filter by role"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{appRoles.map(r => <SelectItem key={r} value={r}>{roleInfo[r].label}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="lg:w-40" aria-label="Filter by status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent></Select>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm [&_td]:whitespace-nowrap">
      <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Access scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><UsersIcon className="mx-auto mb-2 size-6"/>No users match these filters.</td></tr> : rows.map(u => {
        const s = userStatus(u); const self = u.user_id === callerId; const manageable = canManageTarget(callerRole, u.role);
        return <tr key={u.user_id} className="border-t">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(u)}</span><div className="min-w-0"><p className="font-medium">{u.full_name || "—"}{self && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div></div></td>
          <td className="px-4 py-3"><Badge variant="secondary">{roleInfo[u.role]?.label ?? u.role}</Badge></td>
          <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-3.5"/>{workspace}</span></td>
          <td className="px-4 py-3"><Badge variant="outline" className={statusVariant[s]}>{statusLabel[s]}</Badge></td>
          <td className="px-4 py-3 text-muted-foreground" title={u.last_sign_in_at ? `Last sign-in ${fmtDate(u.last_sign_in_at)}` : "Never signed in"}>{fmtDate(u.created_at)}</td>
          <td className="px-4 py-3"><div className="flex justify-end gap-1">
            {s === "invited" && manageable && <Button size="sm" variant="ghost" disabled={resend.isPending} onClick={() => resend.mutate(u)}><Mail/>Resend</Button>}
            <Button size="sm" variant="ghost" disabled={!manageable && !self} onClick={() => setEditing(u)}><Pencil/>Edit</Button>
            <Button size="sm" variant="ghost" disabled={self || !manageable} title={self ? "You cannot change your own status" : undefined} onClick={() => setToggling(u)}><Power/>{u.active ? "Deactivate" : "Activate"}</Button>
          </div></td></tr>; })}</tbody>
    </table></div>
    {editing === "new" && <CreateUserDialog assignable={assignable} workspace={workspace} plants={plants} departments={departments} onClose={() => setEditing(null)}/>}
    {editing && editing !== "new" && <UserDialog user={editing} self={editing.user_id === callerId} assignable={assignable} workspace={workspace} onClose={() => setEditing(null)}/>}
    <AlertDialog open={!!toggling} onOpenChange={o => !o && setToggling(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{toggling?.active ? "Deactivate" : "Reactivate"} {toggling?.full_name || toggling?.email}?</AlertDialogTitle><AlertDialogDescription>{toggling?.active ? "They lose access to this workspace. Membership in any other workspace is not affected, and their history stays." : "They can sign in again with their current role."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={toggle.isPending} onClick={e => { e.preventDefault(); if (toggling) toggle.mutate(toggling); }}>{toggle.isPending && <LoaderCircle className="animate-spin"/>}{toggling?.active ? "Deactivate" : "Reactivate"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

const editSchema = z.object({ fullName: z.string().trim().min(2, "Enter the full name").max(100) });

function UserDialog({ user, self, assignable, workspace, onClose }: { user: User | null; self: boolean; assignable: AppRole[]; workspace: string; onClose: () => void }) {
  const [fullName, setFullName] = useState(user?.full_name ?? ""); const [email, setEmail] = useState(""); const [role, setRole] = useState<AppRole>(user?.role ?? "client_tester");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient(); const updateFn = useServerFn(updateUser);
  const roles = user && !assignable.includes(user.role) ? [user.role, ...assignable] : assignable;
  const save = useMutation({
    mutationFn: async () => updateFn({ data: { userId: user!.user_id, fullName, role } }),
    onSuccess: () => { toast.success(user ? "User updated" : `Invitation sent to ${email.trim()}`); void qc.invalidateQueries({ queryKey: ["workspace-users"] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = editSchema.safeParse({ fullName });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); save.mutate();
  }
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto"><form onSubmit={submit} noValidate>
    <DialogHeader><DialogTitle>{user ? "Edit user" : "Create user"}</DialogTitle><DialogDescription>{user ? user.email : "They'll get an email link to set their own password and join this workspace."}</DialogDescription></DialogHeader>
    <fieldset disabled={save.isPending} className="my-5 space-y-4">
      <div><Label htmlFor="u-name">Full name</Label><Input id="u-name" className="mt-1.5" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100}/>{errors["fullName"] && <p className="mt-1 text-xs text-destructive">{errors["fullName"]}</p>}</div>
      {!user && <div><Label htmlFor="u-email">Email</Label><Input id="u-email" type="email" className="mt-1.5" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} autoComplete="off"/>{errors["email"] && <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>}</div>}
      <div><Label>Role</Label><Select value={role} onValueChange={v => setRole(v as AppRole)} disabled={self}><SelectTrigger className="mt-1.5" aria-label="Role"><SelectValue/></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleInfo[r].label}</SelectItem>)}</SelectContent></Select>{self && <p className="mt-1 text-xs text-muted-foreground">You cannot change your own role.</p>}</div>
      <div><Label>Assigned access scope</Label><div className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"><Building2 className="size-4 text-muted-foreground"/>{workspace}</div><p className="mt-1 text-xs text-muted-foreground">Users join the workspace you're signed in to.</p></div>
      {!user && <p className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">No password is set here. The user gets a secure email link to create their own password.</p>}
    </fieldset>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <LoaderCircle className="animate-spin"/>}{user ? "Save changes" : "Create user"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

const emptyCreate = { firstName: "", lastName: "", username: "", email: "", contact: "", info1: "", plantId: "", departmentId: "", profitCentre: "", purchaseGroup: "", distributionChannel: "", status: "active", role: "", password: "", confirmPassword: "" };

function CreateUserDialog({ assignable, workspace, plants, departments, onClose }: { assignable: AppRole[]; workspace: string; plants: Option[]; departments: Option[]; onClose: () => void }) {
  const [form, setForm] = useState({ ...emptyCreate, role: assignable.includes("client_tester") ? "client_tester" : assignable[0] ?? "" });
  const [force, setForce] = useState(true); const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient(); const createFn = useServerFn(createUser);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const payload = () => ({ ...form, plantId: form.plantId || null, departmentId: form.departmentId || null, forcePasswordChange: force });
  const save = useMutation({
    mutationFn: async () => createFn({ data: payload() as never }),
    onSuccess: () => { toast.success(`User ${form.email.trim()} created`); void qc.invalidateQueries({ queryKey: ["workspace-users"] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = createUserSchema.safeParse(payload());
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); save.mutate();
  }
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  const text = (k: keyof typeof form, label: string, max: number, opts: { required?: boolean; type?: string; auto?: string } = {}) => <div><Label htmlFor={`cu-${k}`}>{label}{opts.required && " *"}</Label><Input id={`cu-${k}`} className="mt-1.5" type={opts.type ?? "text"} value={form[k]} maxLength={max} autoComplete={opts.auto ?? "off"} aria-invalid={!!errors[k]} onChange={e => set(k, e.target.value)}/>{err(k)}</div>;
  const pick = (k: "plantId" | "departmentId", label: string, items: Option[]) => <div><Label>{label}</Label><Select value={form[k] || "none"} onValueChange={v => set(k, v === "none" ? "" : v)}><SelectTrigger className="mt-1.5" aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Not assigned</SelectItem>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>)}</SelectContent></Select>{err(k)}</div>;
  const pw = (k: "password" | "confirmPassword", label: string) => <div><Label htmlFor={`cu-${k}`}>{label} *</Label><div className="relative mt-1.5"><Input id={`cu-${k}`} className="pr-11" type={show ? "text" : "password"} value={form[k]} maxLength={PASSWORD_MAX} autoComplete="new-password" aria-invalid={!!errors[k]} onChange={e => set(k, e.target.value)}/><Button type="button" size="icon" variant="ghost" className="absolute right-0.5 top-0.5 size-8" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff/> : <Eye/>}</Button></div>{err(k)}</div>;
  const section = (title: string, body: ReactNode) => <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0"><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3><div className="grid gap-4 sm:grid-cols-2">{body}</div></section>;
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} noValidate>
    <DialogHeader><DialogTitle>Create user</DialogTitle><DialogDescription>Joins <span className="font-medium text-foreground">{workspace}</span>. Fields marked * are required.</DialogDescription></DialogHeader>
    <fieldset disabled={save.isPending} className="my-5 space-y-5">
      {section("Basic information", <>{text("firstName", "First name", 50, { required: true })}{text("lastName", "Last name", 50)}{text("username", "Username", 30)}{text("email", "Email", 255, { required: true, type: "email" })}{text("contact", "Contact", 20, { type: "tel" })}{text("info1", "Info 1", 255)}</>)}
      {section("Contact & organisation", <>{pick("plantId", "Plant", plants)}{text("profitCentre", "Profit centre", 50)}{pick("departmentId", "Department", departments)}{text("purchaseGroup", "Purchase group", 50)}{text("distributionChannel", "Distribution channel", 50)}<div><Label>Status *</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1.5" aria-label="Status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div></>)}
      {section("Access", <><div className="sm:col-span-2"><Label>Role *</Label><Select value={form.role} onValueChange={v => set("role", v)}><SelectTrigger className="mt-1.5" aria-label="Role"><SelectValue placeholder="Select role"/></SelectTrigger><SelectContent>{assignable.map(r => <SelectItem key={r} value={r}>{roleInfo[r].label}</SelectItem>)}</SelectContent></Select>{err("role")}</div>{pw("password", "Password")}{pw("confirmPassword", "Confirm password")}<label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={force} onCheckedChange={v => setForce(v === true)}/>Require a password change at first sign-in</label></>)}
      <p className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">Share the initial password privately. It is never stored or shown in Asset360. Existing accounts can't be created again.</p>
    </fieldset>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <LoaderCircle className="animate-spin"/>}Create user</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function RolesTab({ users, onView }: { users: User[]; onView: (r: string) => void }) {
  return <TooltipProvider><div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-display font-semibold">Roles</h2><p className="text-sm text-muted-foreground">{appRoles.length} system roles</p></div>
      <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button disabled><Plus/>Create role</Button></span></TooltipTrigger><TooltipContent>Custom roles are a future enhancement. System roles are protected.</TooltipContent></Tooltip></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{appRoles.map(r => {
      const n = users.filter(u => u.role === r).length; const s = roleSummary(r);
      return <div key={r} className="glass-panel flex flex-col rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/><h3 className="font-display font-semibold">{roleInfo[r].label}</h3></div><Badge variant="outline" className="mt-2"><Lock className="size-3"/>System</Badge></div>
          <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button size="icon" variant="ghost" disabled aria-label={`Edit ${roleInfo[r].label}`}><Pencil/></Button></span></TooltipTrigger><TooltipContent>System roles are protected by backend policy</TooltipContent></Tooltip></div>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{roleInfo[r].description}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2"><p className="font-display text-lg font-bold">{s.viewCount}</p><p className="text-[11px] text-muted-foreground">View of {permissionModules.length}</p></div>
          <div className="rounded-lg bg-muted/50 p-2"><p className="font-display text-lg font-bold">{s.editCount}</p><p className="text-[11px] text-muted-foreground">Edit of {editableModuleCount}</p></div>
          <div className="rounded-lg bg-muted/50 p-2"><p className="font-display text-lg font-bold">{n}</p><p className="text-[11px] text-muted-foreground">{n === 1 ? "User" : "Users"}</p></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{s.restricted.length ? `Restricted access: ${s.restricted.join(", ")}` : "Operational access only; master data and users locked."}</p>
        <Button variant="outline" size="sm" className="mt-4 self-start" onClick={() => onView(r)}><Eye/>View permissions</Button>
      </div>; })}</div>
  </div></TooltipProvider>;
}

function Cell({ allowed }: { allowed: boolean | null }) {
  if (allowed === null) return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not applicable"/>;
  return allowed ? <Check className="mx-auto size-4 text-success" aria-label="Allowed"/> : <X className="mx-auto size-4 text-destructive/70" aria-label="Denied"/>;
}

function MatrixTab({ focusRole }: { focusRole: string | null }) {
  return <div className="glass-panel rounded-2xl">
    <div className="border-b p-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Lock className="size-3.5"/>System role permissions are locked. They show what the server and database currently enforce. V = view, E = edit, — = no edit action.</span></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm">
      <thead><tr className="text-xs"><th className="sticky left-0 bg-background px-4 py-3 text-left uppercase tracking-wider text-muted-foreground">Module</th>{appRoles.map(r => <th key={r} colSpan={2} className={`px-2 py-3 text-center font-semibold ${focusRole === r ? "bg-primary/10 text-primary" : ""}`}>{roleInfo[r].label}</th>)}</tr>
        <tr className="text-[10px] text-muted-foreground"><th className="sticky left-0 bg-background"/>{appRoles.map(r => <Fragment key={r}><th className={`pb-2 ${focusRole === r ? "bg-primary/10" : ""}`}>V</th><th className={`pb-2 ${focusRole === r ? "bg-primary/10" : ""}`}>E</th></Fragment>)}</tr></thead>
      <tbody>{permissionModules.map(m => <tr key={m.id} className="border-t"><td className="sticky left-0 bg-background px-4 py-2.5 font-medium">{m.label}</td>{appRoles.map(r => { const a = accessFor(r, m.id); return <Fragment key={r}><td className={`py-2.5 ${focusRole === r ? "bg-primary/5" : ""}`}><Cell allowed={a.view}/></td><td className={`py-2.5 ${focusRole === r ? "bg-primary/5" : ""}`}><Cell allowed={a.edit}/></td></Fragment>; })}</tr>)}</tbody>
    </table></div>
  </div>;
}
