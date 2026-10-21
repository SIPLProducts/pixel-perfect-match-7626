import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Pencil, Search, UserPlus, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { inviteUser, listUsers, setUserActive, updateUser } from "@/lib/user-management.functions";
import { assignableRoles, canManageMember, roleLabel, type AppRole } from "@/lib/user-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Member = { user_id: string; email: string; full_name: string; role: string; active: boolean; invited: boolean; last_sign_in_at: string | null };
const when = (v: string | null) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "Never";

export function Users() {
  const client = useQueryClient();
  const list = useServerFn(listUsers);
  const query = useQuery({ queryKey: ["workspace", "users"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [confirm, setConfirm] = useState<Member | null>(null);
  const toggle = useServerFn(setUserActive);
  const status = useMutation({
    mutationFn: (m: Member) => toggle({ data: { userId: m.user_id, active: !m.active } }),
    onSuccess: async (_, m) => { await client.invalidateQueries({ queryKey: ["workspace", "users"] }); toast.success(`${m.full_name || m.email} ${m.active ? "deactivated" : "reactivated"}`); setConfirm(null); },
    onError: e => toast.error(e.message),
  });
  const rows = useMemo(() => (query.data?.users ?? []).filter(u => `${u.full_name} ${u.email} ${roleLabel(u.role)}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);

  if (query.isLoading) return <div className="glass-panel grid place-items-center rounded-2xl p-10"><LoaderCircle className="size-6 animate-spin text-primary" /></div>;
  if (query.isError) return <div className="glass-panel rounded-2xl p-6 text-sm text-destructive" role="alert">{query.error.message} <Button size="sm" variant="outline" className="ml-2" onClick={() => query.refetch()}>Retry</Button></div>;
  const caller = { userId: query.data!.callerId, role: query.data!.callerRole };

  return <div className="glass-panel soft-enter rounded-2xl p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search users" className="bg-glass-strong pl-9" placeholder="Search name, email or role" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Button variant="hero" onClick={() => setEditing("new")}><UserPlus />Invite user</Button>
    </div>
    {rows.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground"><UsersIcon className="mx-auto mb-2 size-8" />{search ? "No users match your search." : "No users yet."}</div> :
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-glass-border text-left text-xs text-muted-foreground"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last sign-in</th><th className="p-3 text-right">Actions</th></tr></thead>
      <tbody>{rows.map(u => { const manageable = canManageMember(caller, { userId: u.user_id, role: u.role }); return <tr key={u.user_id} className="border-b border-glass-border/60">
        <td className="p-3 font-medium">{u.full_name || "—"}{u.user_id === caller.userId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</td>
        <td className="p-3">{u.email}</td><td className="p-3">{roleLabel(u.role)}</td>
        <td className="p-3"><Badge variant={u.active ? (u.invited ? "outline" : "secondary") : "destructive"}>{!u.active ? "Deactivated" : u.invited ? "Invited" : "Active"}</Badge></td>
        <td className="p-3 text-muted-foreground">{when(u.last_sign_in_at)}</td>
        <td className="p-3 text-right">{manageable ? <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(u)}><Pencil />Edit</Button><Button size="sm" variant={u.active ? "outline" : "secondary"} onClick={() => setConfirm(u)}>{u.active ? "Deactivate" : "Reactivate"}</Button></div> : <span className="text-xs text-muted-foreground">—</span>}</td>
      </tr>; })}</tbody></table></div>}
    {editing && <UserDialog member={editing === "new" ? null : editing} roles={assignableRoles(caller.role)} onClose={() => setEditing(null)} />}
    <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}><DialogContent><DialogHeader><DialogTitle>{confirm?.active ? "Deactivate" : "Reactivate"} {confirm?.full_name || confirm?.email}?</DialogTitle><DialogDescription>{confirm?.active ? "They will lose access to this workspace immediately, even if they are signed in. Their history is kept." : "They will be able to sign in and use this workspace again."}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.active ? "destructive" : "hero"} disabled={status.isPending} onClick={() => confirm && status.mutate(confirm)}>{status.isPending && <LoaderCircle className="animate-spin" />}{confirm?.active ? "Deactivate" : "Reactivate"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function UserDialog({ member, roles, onClose }: { member: Member | null; roles: AppRole[]; onClose: () => void }) {
  const client = useQueryClient();
  const invite = useServerFn(inviteUser); const update = useServerFn(updateUser);
  const [fullName, setFullName] = useState(member?.full_name ?? ""); const [email, setEmail] = useState(""); const [role, setRole] = useState<AppRole>((member?.role as AppRole) ?? "client_tester");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: async (): Promise<unknown> => member ? update({ data: { userId: member.user_id, fullName, role } }) : invite({ data: { fullName, email, role, redirectOrigin: window.location.origin } }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["workspace", "users"] }); toast.success(member ? "User updated" : `Invitation sent to ${email}`); onClose(); },
    onError: e => setError(e.message.startsWith("[") ? "Check the highlighted details" : e.message),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setError(""); if (fullName.trim().length < 2) return setError("Enter the full name"); if (!member && !/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email"); save.mutate(); };
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent><form onSubmit={submit} noValidate>
    <DialogHeader><DialogTitle>{member ? "Edit user" : "Invite user"}</DialogTitle><DialogDescription>{member ? member.email : "They'll get an email with a link to set their own password."}</DialogDescription></DialogHeader>
    <fieldset disabled={save.isPending} className="my-5 space-y-4">
      <div><Label htmlFor="user-name" className="mb-2 block">Full name</Label><Input id="user-name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} /></div>
      {!member && <div><Label htmlFor="user-email" className="mb-2 block">Email</Label><Input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} /></div>}
      <div><Label htmlFor="user-role" className="mb-2 block">Role</Label><Select value={role} onValueChange={v => setRole(v as AppRole)}><SelectTrigger id="user-role"><SelectValue /></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent></Select></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </fieldset>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <LoaderCircle className="animate-spin" />}{member ? "Save changes" : "Send invitation"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
