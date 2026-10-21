import { Fragment, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, LoaderCircle, Mail, Pencil, Power, Search, ShieldCheck, UserPlus, Users as UsersIcon, X, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { accessFor, appRoles, canManageTarget, inviteSchema, permissionModules, roleInfo, roleSummary, userStatus, type AppRole } from "@/lib/user-management";
import { inviteUser, listUsers, resendInvite, setUserActive, updateUser } from "@/lib/user-management.functions";

type User = { user_id: string; email: string; full_name: string; role: AppRole; active: boolean; invited: boolean; last_sign_in_at: string | null };
const statusLabel = { active: "Active", invited: "Invited", deactivated: "Deactivated" } as const;
const statusVariant = { active: "border-success/30 bg-success/10 text-success", invited: "border-warning/30 bg-warning/10 text-warning", deactivated: "border-destructive/30 bg-destructive/10 text-destructive" } as const;
const fmt = (v: string | null) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "Never";

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
      <TabsContent value="users" className="mt-4"><UsersTab users={users} callerId={query.data!.callerId} callerRole={query.data!.callerRole} assignable={query.data!.assignable as AppRole[]}/></TabsContent>
      <TabsContent value="roles" className="mt-4"><RolesTab users={users} onView={(r) => { setFocusRole(r); setTab("matrix"); }}/></TabsContent>
      <TabsContent value="matrix" className="mt-4"><MatrixTab focusRole={focusRole}/></TabsContent>
    </Tabs>
  </div>;
}

function UsersTab({ users, callerId, callerRole, assignable }: { users: User[]; callerId: string; callerRole: string; assignable: AppRole[] }) {
  const [search, setSearch] = useState(""); const [role, setRole] = useState("all"); const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<User | "new" | null>(null); const [toggling, setToggling] = useState<User | null>(null);
  const qc = useQueryClient(); const setActiveFn = useServerFn(setUserActive); const resendFn = useServerFn(resendInvite);
  const refresh = () => qc.invalidateQueries({ queryKey: ["workspace-users"] });
  const toggle = useMutation({ mutationFn: (u: User) => setActiveFn({ data: { userId: u.user_id, active: !u.active } }), onSuccess: (_, u) => { toast.success(u.active ? "User deactivated" : "User reactivated"); setToggling(null); void refresh(); }, onError: (e) => toast.error(e.message) });
  const resend = useMutation({ mutationFn: (u: User) => resendFn({ data: { userId: u.user_id } }), onSuccess: () => toast.success("Invitation re-sent"), onError: (e) => toast.error(e.message) });
  const rows = useMemo(() => users.filter(u => (role === "all" || u.role === role) && (status === "all" || userStatus(u) === status) && `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())), [users, role, status, search]);

  return <div className="glass-panel rounded-2xl">
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input aria-label="Search users" className="pl-9" placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <Select value={role} onValueChange={setRole}><SelectTrigger className="lg:w-48" aria-label="Filter by role"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{appRoles.map(r => <SelectItem key={r} value={r}>{roleInfo[r].label}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="lg:w-40" aria-label="Filter by status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent></Select>
      <Button onClick={() => setEditing("new")}><UserPlus/>Invite user</Button>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
      <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground"><UsersIcon className="mx-auto mb-2 size-6"/>No users match these filters.</td></tr> : rows.map(u => {
        const s = userStatus(u); const self = u.user_id === callerId; const manageable = canManageTarget(callerRole, u.role);
        return <tr key={u.user_id} className="border-t">
          <td className="px-4 py-3"><p className="font-medium">{u.full_name || "—"}{self && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
          <td className="px-4 py-3"><Badge variant="secondary">{roleInfo[u.role]?.label ?? u.role}</Badge></td>
          <td className="px-4 py-3"><Badge variant="outline" className={statusVariant[s]}>{statusLabel[s]}</Badge></td>
          <td className="px-4 py-3 text-muted-foreground">{fmt(u.last_sign_in_at)}</td>
          <td className="px-4 py-3"><div className="flex justify-end gap-1">
            {s === "invited" && manageable && <Button size="sm" variant="ghost" disabled={resend.isPending} onClick={() => resend.mutate(u)}><Mail/>Resend</Button>}
            <Button size="sm" variant="ghost" disabled={!manageable && !self} onClick={() => setEditing(u)}><Pencil/>Edit</Button>
            <Button size="sm" variant="ghost" disabled={self || !manageable} title={self ? "You cannot change your own status" : undefined} onClick={() => setToggling(u)}><Power/>{u.active ? "Deactivate" : "Reactivate"}</Button>
          </div></td></tr>; })}</tbody>
    </table></div>
    {editing && <UserDialog user={editing === "new" ? null : editing} self={editing !== "new" && editing.user_id === callerId} assignable={assignable} onClose={() => setEditing(null)}/>}
    <AlertDialog open={!!toggling} onOpenChange={o => !o && setToggling(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{toggling?.active ? "Deactivate" : "Reactivate"} {toggling?.full_name || toggling?.email}?</AlertDialogTitle><AlertDialogDescription>{toggling?.active ? "They lose access to this workspace immediately and can't sign in. Their history stays." : "They can sign in again with their current role."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={toggle.isPending} onClick={e => { e.preventDefault(); if (toggling) toggle.mutate(toggling); }}>{toggle.isPending && <LoaderCircle className="animate-spin"/>}{toggling?.active ? "Deactivate" : "Reactivate"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function UserDialog({ user, self, assignable, onClose }: { user: User | null; self: boolean; assignable: AppRole[]; onClose: () => void }) {
  const [fullName, setFullName] = useState(user?.full_name ?? ""); const [email, setEmail] = useState(""); const [role, setRole] = useState<AppRole>(user?.role ?? "client_tester");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient(); const inviteFn = useServerFn(inviteUser); const updateFn = useServerFn(updateUser);
  const roles = user && !assignable.includes(user.role) ? [user.role, ...assignable] : assignable;
  const save = useMutation({
    mutationFn: async () => user ? updateFn({ data: { userId: user.user_id, fullName, role } }) : inviteFn({ data: { fullName, email, role } }),
    onSuccess: () => { toast.success(user ? "User updated" : `Invitation sent to ${email.trim()}`); void qc.invalidateQueries({ queryKey: ["workspace-users"] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = inviteSchema.safeParse({ fullName, email: user ? user.email : email, role });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); save.mutate();
  }
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent><form onSubmit={submit} noValidate>
    <DialogHeader><DialogTitle>{user ? "Edit user" : "Invite user"}</DialogTitle><DialogDescription>{user ? user.email : "They'll get an email link to set their own password and join this workspace."}</DialogDescription></DialogHeader>
    <fieldset disabled={save.isPending} className="my-5 space-y-4">
      <div><Label htmlFor="u-name">Full name</Label><Input id="u-name" className="mt-1.5" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100}/>{errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}</div>
      {!user && <div><Label htmlFor="u-email">Email</Label><Input id="u-email" type="email" className="mt-1.5" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} autoComplete="off"/>{errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}</div>}
      <div><Label>Role</Label><Select value={role} onValueChange={v => setRole(v as AppRole)} disabled={self}><SelectTrigger className="mt-1.5" aria-label="Role"><SelectValue/></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleInfo[r].label}</SelectItem>)}</SelectContent></Select>{self && <p className="mt-1 text-xs text-muted-foreground">You cannot change your own role.</p>}</div>
    </fieldset>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <LoaderCircle className="animate-spin"/>}{user ? "Save changes" : "Send invitation"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function RolesTab({ users, onView }: { users: User[]; onView: (r: string) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{appRoles.map(r => {
    const n = users.filter(u => u.role === r).length; const s = roleSummary(r);
    return <div key={r} className="glass-panel flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/><h3 className="font-display font-semibold">{roleInfo[r].label}</h3></div><Badge variant="outline">System role</Badge></div>
      <p className="mt-2 text-sm text-muted-foreground">{roleInfo[r].description}</p>
      <p className="mt-3 text-xs font-medium">{n} {n === 1 ? "user" : "users"} · can edit {s.editCount} of {permissionModules.filter(m => m.edit).length} areas</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.edits.join(", ")}</p>
      <Button variant="outline" size="sm" className="mt-4 self-start" onClick={() => onView(r)}>View permissions</Button>
    </div>; })}</div>;
}

function Cell({ allowed }: { allowed: boolean | null }) {
  if (allowed === null) return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not applicable"/>;
  return allowed ? <Check className="mx-auto size-4 text-success" aria-label="Allowed"/> : <X className="mx-auto size-4 text-destructive/70" aria-label="Denied"/>;
}

function MatrixTab({ focusRole }: { focusRole: string | null }) {
  return <div className="glass-panel rounded-2xl">
    <div className="border-b p-4 text-sm text-muted-foreground">Read-only. These are the permissions the server and database currently enforce. V = view, E = edit.</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm">
      <thead><tr className="text-xs"><th className="sticky left-0 bg-background px-4 py-3 text-left uppercase tracking-wider text-muted-foreground">Module</th>{appRoles.map(r => <th key={r} colSpan={2} className={`px-2 py-3 text-center font-semibold ${focusRole === r ? "bg-primary/10 text-primary" : ""}`}>{roleInfo[r].label}</th>)}</tr>
        <tr className="text-[10px] text-muted-foreground"><th className="sticky left-0 bg-background"/>{appRoles.map(r => <Fragment key={r}><th className={`pb-2 ${focusRole === r ? "bg-primary/10" : ""}`}>V</th><th className={`pb-2 ${focusRole === r ? "bg-primary/10" : ""}`}>E</th></Fragment>)}</tr></thead>
      <tbody>{permissionModules.map(m => <tr key={m.id} className="border-t"><td className="sticky left-0 bg-background px-4 py-2.5 font-medium">{m.label}</td>{appRoles.map(r => { const a = accessFor(r, m.id); return <Fragment key={r}><td className={`py-2.5 ${focusRole === r ? "bg-primary/5" : ""}`}><Cell allowed={a.view}/></td><td className={`py-2.5 ${focusRole === r ? "bg-primary/5" : ""}`}><Cell allowed={a.edit}/></td></Fragment>; })}</tr>)}</tbody>
    </table></div>
  </div>;
}
