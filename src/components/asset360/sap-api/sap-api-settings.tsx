import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Eye, EyeOff, LoaderCircle, Pencil, Plug, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createSapEndpoint, deleteSapEndpoint, getSapSettings, saveSapConnection, testSap, updateSapEndpoint } from "@/lib/sap-api.functions";
import { methodTone, sapAuthTypes, sapMethods, sapModules } from "@/lib/sap-api";
import { SapEndpointDetail } from "./sap-endpoint-detail";

export type SapSettings = Awaited<ReturnType<typeof getSapSettings>>;
export type SapEndpoint = SapSettings["endpoints"][number];
export const sapQueryKey = ["sap-api-settings"];

export function MethodBadge({ method }: { method: string }) { return <Badge variant="outline" className={methodTone[method]}>{method}</Badge>; }
export function StatusBadge({ status, running }: { status?: number | undefined; running?: boolean }) {
  if (running) return <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">Pending</Badge>;
  if (status === undefined) return null;
  const ok = status >= 200 && status < 300;
  return <Badge variant="outline" className={ok ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>{status || "Error"}{ok ? " OK" : ""}</Badge>;
}
export function SecretInput({ value, onChange, saved, placeholder }: { value: string; onChange: (v: string) => void; saved: boolean; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return <div><div className="relative mt-2"><Input type={show ? "text" : "password"} className="bg-card/55 pr-10" value={value} onChange={e => onChange(e.target.value)} placeholder={saved ? "Leave blank to keep the saved value" : placeholder} autoComplete="new-password" /><button type="button" aria-label={show ? "Hide" : "Show"} onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{saved && <Badge variant="outline" className="mt-2 bg-success/15 text-success border-success/30">{placeholder?.includes("secret") ? "Secret is saved" : "Password is saved"}</Badge>}</div>;
}

export function SapApiSettings() {
  const fetchSettings = useServerFn(getSapSettings);
  const query = useQuery({ queryKey: sapQueryKey, queryFn: () => fetchSettings() });
  const [editing, setEditing] = useState<string | null>(null);
  if (query.isLoading) return <div className="glass-panel grid place-items-center rounded-2xl p-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div>;
  if (query.error || !query.data) return <div className="glass-panel rounded-2xl p-6 text-sm text-destructive">{(query.error as Error)?.message ?? "SAP settings could not be loaded"}</div>;
  const endpoint = query.data.endpoints.find(e => e.id === editing);
  if (endpoint) return <SapEndpointDetail endpoint={endpoint} onBack={() => setEditing(null)} />;
  return <div className="space-y-5 soft-enter">
    <div className="glass-panel flex items-center gap-4 rounded-2xl p-5"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Plug className="size-5" /></div><div><h2 className="font-display text-lg font-bold">SAP API Settings</h2><p className="text-sm text-muted-foreground">Register dynamic SAP/REST endpoints and configure connection and middleware settings.</p></div></div>
    <Tabs defaultValue="apis"><TabsList><TabsTrigger value="apis">APIs</TabsTrigger><TabsTrigger value="connection">SAP Connection</TabsTrigger><TabsTrigger value="middleware">Middleware Configuration</TabsTrigger></TabsList>
      <TabsContent value="apis"><ApiList endpoints={query.data.endpoints} onEdit={setEditing} /></TabsContent>
      <TabsContent value="connection"><ConnectionTab settings={query.data.connection} /></TabsContent>
      <TabsContent value="middleware"><MiddlewareTab settings={query.data.connection} /></TabsContent>
    </Tabs>
  </div>;
}

function useTest() {
  const run = useServerFn(testSap);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { status: number; latency: number; message: string }>>({});
  async function test(key: string, args: Parameters<typeof run>[0]) {
    setRunning(key);
    try { const r = await run(args); setResults(s => ({ ...s, [key]: r })); r.ok ? toast.success(`${r.message} · ${r.latency} ms`) : toast.error(`${r.message}${r.latency ? ` · ${r.latency} ms` : ""}`); return r; }
    catch (e) { toast.error((e as Error).message); return undefined; } finally { setRunning(null); }
  }
  return { test, running, results };
}

function ApiList({ endpoints, onEdit }: { endpoints: SapEndpoint[]; onEdit: (id: string) => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(""); const [module, setModule] = useState("all");
  const [creating, setCreating] = useState(false); const [deleting, setDeleting] = useState<SapEndpoint | null>(null);
  const update = useServerFn(updateSapEndpoint); const remove = useServerFn(deleteSapEndpoint);
  const { test, running, results } = useTest();
  const q = search.toLowerCase();
  const shown = endpoints.filter(e => (module === "all" || e.module === module) && `${e.name} ${e.path}`.toLowerCase().includes(q));
  async function toggle(e: SapEndpoint, active: boolean) { try { await update({ data: { id: e.id, active } }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success(active ? "Endpoint activated" : "Endpoint deactivated"); } catch (err) { toast.error((err as Error).message); } }
  async function confirmDelete() { if (!deleting) return; try { await remove({ data: { id: deleting.id } }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success("Endpoint deleted"); } catch (err) { toast.error((err as Error).message); } setDeleting(null); }
  return <div className="glass-panel mt-4 overflow-hidden rounded-2xl">
    <div className="flex flex-col gap-3 border-b border-glass-border p-4 lg:flex-row lg:items-center"><Badge variant="outline">{endpoints.length} APIs</Badge><div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="bg-card/60 pl-9" placeholder="Search API name or endpoint path…" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Select value={module} onValueChange={setModule}><SelectTrigger className="w-full bg-card/60 lg:w-44" aria-label="Module"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{sapModules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      <Button onClick={() => setCreating(true)}><Plus />New Endpoint</Button></div>
    {shown.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Name", "Description", "Module", "Method", "Endpoint Path", "Status", "Actions"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>
      {shown.map(e => <tr key={e.id} className="border-t border-glass-border hover:bg-primary/5"><td className="px-4 py-3 font-semibold">{e.name}</td><td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{e.description || "—"}</td><td className="px-4 py-3"><Badge variant="outline">{e.module}</Badge></td><td className="px-4 py-3"><MethodBadge method={e.method} /></td><td className="max-w-72 truncate px-4 py-3 font-mono text-xs">{e.path}</td><td className="px-4 py-3"><Switch checked={e.active} onCheckedChange={v => toggle(e, v)} aria-label="Active" /></td>
        <td className="px-4 py-3"><div className="flex items-center gap-1"><Button size="sm" variant="outline" disabled={running === e.id} onClick={() => test(e.id, { data: { target: "endpoint", endpointId: e.id } })}>{running === e.id ? <LoaderCircle className="animate-spin" /> : <Activity />}{results[e.id] ? `${results[e.id]!.latency} ms` : "Test"}</Button><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(e.id)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => setDeleting(e)}><Trash2 /></Button></div></td></tr>)}
    </tbody></table></div> : <p className="p-10 text-center text-sm text-muted-foreground">{endpoints.length ? "No endpoints match your filters." : "No SAP endpoints registered yet. Click New Endpoint to add one."}</p>}
    <NewEndpointDialog open={creating} onOpenChange={setCreating} onCreated={onEdit} />
    <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the endpoint, its field mappings and test history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label><div className="mt-2">{children}</div></div>; }
export function Pick({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: readonly string[]; label: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="bg-card/55" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o === "oauth" ? "OAuth" : o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}</SelectContent></Select>;
}

function NewEndpointDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient(); const create = useServerFn(createSapEndpoint);
  const empty = { name: "", description: "", module: "COMMON" as (typeof sapModules)[number], path: "", method: "GET" as (typeof sapMethods)[number], auth_type: "basic" as (typeof sapAuthTypes)[number] };
  const [form, setForm] = useState(empty); const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.name.trim() || !form.path.trim()) { toast.error("Name and endpoint path are required"); return; }
    setSaving(true);
    try { const { id } = await create({ data: form }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success("Endpoint registered"); setForm(empty); onOpenChange(false); onCreated(id); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>New Endpoint</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2">
    <Field label="Name"><Input className="bg-card/55" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Module"><Pick label="Module" value={form.module} onChange={v => setForm({ ...form, module: v as never })} options={sapModules} /></Field>
    <div className="sm:col-span-2"><Field label="Description"><Textarea className="bg-card/55" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>
    <div className="sm:col-span-2"><Field label="Endpoint Path"><Input className="bg-card/55 font-mono" placeholder="/service_node/action?client=300" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} /></Field></div>
    <Field label="HTTP Method"><Pick label="HTTP Method" value={form.method} onChange={v => setForm({ ...form, method: v as never })} options={sapMethods} /></Field>
    <Field label="Auth Type"><Pick label="Auth Type" value={form.auth_type} onChange={v => setForm({ ...form, auth_type: v as never })} options={sapAuthTypes} /></Field>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}Save</Button></DialogFooter></DialogContent></Dialog>;
}

function ConnectionTab({ settings }: { settings: SapSettings["connection"] }) {
  const qc = useQueryClient(); const save = useServerFn(saveSapConnection); const { test, running, results } = useTest();
  const [form, setForm] = useState({ environment: settings.environment, base_url: settings.base_url, technical_user: settings.technical_user, password: "" }); const [saving, setSaving] = useState(false);
  async function submit() { setSaving(true); try { await save({ data: { ...form, password: form.password || undefined } }); setForm({ ...form, password: "" }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success("SAP connection saved"); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } }
  const r = results["connection"];
  return <div className="glass-panel mt-4 rounded-2xl p-6"><h3 className="font-display font-bold">Global SAP host</h3><div className="mt-5 grid gap-4 md:grid-cols-2">
    <Field label="SAP Environment"><Input className="bg-card/55" placeholder="Development, Quality, Production" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })} /></Field>
    <Field label="SAP Base URL"><Input className="bg-card/55 font-mono" placeholder="https://sap.example.com:8000" value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} /></Field>
    <Field label="Technical User"><Input className="bg-card/55" value={form.technical_user} onChange={e => setForm({ ...form, technical_user: e.target.value })} autoComplete="off" /></Field>
    <div><Label>SAP Password</Label><SecretInput value={form.password} onChange={v => setForm({ ...form, password: v })} saved={settings.password_set} /></div>
  </div><div className="mt-6 flex flex-wrap items-center gap-3 border-t border-glass-border pt-4"><Button variant="outline" disabled={running === "connection"} onClick={() => test("connection", { data: { target: "connection" } })}>{running === "connection" ? <LoaderCircle className="animate-spin" /> : <Activity />}Test SAP Connection</Button><StatusBadge status={r?.status} running={running === "connection"} />{r && <span className="text-xs text-muted-foreground">{r.latency} ms · {r.message}</span>}<Button className="ml-auto" onClick={submit} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}Save Connection</Button></div></div>;
}

function MiddlewareTab({ settings }: { settings: SapSettings["connection"] }) {
  const qc = useQueryClient(); const save = useServerFn(saveSapConnection); const { test, running, results } = useTest();
  const [form, setForm] = useState({ connection_mode: settings.connection_mode as "direct" | "proxy", deployment_mode: settings.deployment_mode as "cloud" | "self_hosted", middleware_url: settings.middleware_url, middleware_port: settings.middleware_port, shared_secret: "" }); const [saving, setSaving] = useState(false);
  async function submit() { setSaving(true); try { await save({ data: { ...form, shared_secret: form.shared_secret || undefined } }); setForm({ ...form, shared_secret: "" }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success("Middleware settings saved"); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } }
  const seg = <T extends string>(value: T, options: [T, string][], set: (v: T) => void) => <div className="inline-flex rounded-xl border border-glass-border bg-card/55 p-1">{options.map(([v, l]) => <button key={v} type="button" onClick={() => set(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"}`}>{l}</button>)}</div>;
  const r = results["middleware"];
  return <div className="glass-panel mt-4 rounded-2xl p-6"><h3 className="font-display font-bold">Proxy & security</h3><p className="mt-1 text-sm text-muted-foreground">Route SAP traffic through an on-premise middleware inside your corporate network.</p><div className="mt-5 grid gap-5 md:grid-cols-2">
    <Field label="Connection Mode">{seg(form.connection_mode, [["direct", "Direct"], ["proxy", "Via Proxy (Node.js Middleware)"]], v => setForm({ ...form, connection_mode: v }))}</Field>
    <Field label="Deployment Mode">{seg(form.deployment_mode, [["cloud", "Cloud"], ["self_hosted", "Self-Hosted"]], v => setForm({ ...form, deployment_mode: v }))}</Field>
    <Field label="Middleware URL"><Input className="bg-card/55 font-mono" placeholder="http://10.0.0.5" value={form.middleware_url} onChange={e => setForm({ ...form, middleware_url: e.target.value })} /></Field>
    <Field label="Middleware Port"><Input type="number" className="bg-card/55" value={form.middleware_port} onChange={e => setForm({ ...form, middleware_port: Number(e.target.value) || 3002 })} /></Field>
    <div className="md:col-span-2"><Label>Proxy Shared Secret (x-shared-secret)</Label><SecretInput value={form.shared_secret} onChange={v => setForm({ ...form, shared_secret: v })} saved={settings.secret_set} placeholder="Shared secret" /></div>
  </div><div className="mt-6 flex flex-wrap items-center gap-3 border-t border-glass-border pt-4"><Button variant="outline" disabled={running === "middleware"} onClick={() => test("middleware", { data: { target: "middleware" } })}>{running === "middleware" ? <LoaderCircle className="animate-spin" /> : <Activity />}Test Middleware Health</Button><StatusBadge status={r?.status} running={running === "middleware"} />{r && <span className="text-xs text-muted-foreground">{r.latency} ms · {r.message}</span>}<Button className="ml-auto" onClick={submit} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}Save Middleware Settings</Button></div></div>;
}
