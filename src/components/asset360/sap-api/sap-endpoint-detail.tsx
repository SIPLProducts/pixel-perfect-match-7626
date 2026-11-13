import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowDown, ArrowLeft, ArrowUp, FileJson, LoaderCircle, Play, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSapTestLogs, testSap, updateSapEndpoint } from "@/lib/sap-api.functions";
import { flattenJson, mergeFieldNames, parseHeaders, sapAuthTypes, sapMethods, sapModules, type RequestField, type ResponseField } from "@/lib/sap-api";
import { Field, MethodBadge, Pick, SecretInput, StatusBadge, sapQueryKey, type SapEndpoint } from "./sap-api-settings";

type Update = { id: string; [k: string]: unknown };

export function SapEndpointDetail({ endpoint, onBack }: { endpoint: SapEndpoint; onBack: () => void }) {
  const qc = useQueryClient(); const update = useServerFn(updateSapEndpoint); const run = useServerFn(testSap); const logsFn = useServerFn(getSapTestLogs);
  const logs = useQuery({ queryKey: ["sap-test-logs", endpoint.id], queryFn: () => logsFn({ data: { endpointId: endpoint.id } }) });
  const [running, setRunning] = useState(false); const [result, setResult] = useState<Awaited<ReturnType<typeof run>> | null>(null);
  async function save(patch: Omit<Update, "id">, msg = "Endpoint saved") { try { await update({ data: { id: endpoint.id, ...patch } as never }); await qc.invalidateQueries({ queryKey: sapQueryKey }); toast.success(msg); return true; } catch (e) { toast.error((e as Error).message); return false; } }
  async function runTest() { setRunning(true); try { const r = await run({ data: { target: "endpoint", endpointId: endpoint.id } }); setResult(r); r.ok ? toast.success(`${r.message} · ${r.latency} ms`) : toast.error(r.message); await logs.refetch(); } catch (e) { toast.error((e as Error).message); } finally { setRunning(false); } }
  return <div className="space-y-5 soft-enter">
    <div className="glass-panel rounded-2xl p-5"><button onClick={onBack} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" />SAP API Settings / APIs</button>
      <div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-bold">{endpoint.name}</h2><MethodBadge method={endpoint.method} /><Badge variant="outline">{endpoint.module}</Badge><div className="flex items-center gap-2 text-sm"><Switch checked={endpoint.active} onCheckedChange={v => save({ active: v }, v ? "Endpoint activated" : "Endpoint deactivated")} aria-label="Active" />{endpoint.active ? "Active" : "Inactive"}</div><Button className="ml-auto" variant="outline" onClick={runTest} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Activity />}Test Endpoint</Button></div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{endpoint.path}</p></div>
    <Tabs defaultValue="config"><TabsList className="flex-wrap"><TabsTrigger value="config">Configuration</TabsTrigger><TabsTrigger value="request">Request Fields</TabsTrigger><TabsTrigger value="response">Response Fields</TabsTrigger><TabsTrigger value="credentials">Credentials & Headers</TabsTrigger><TabsTrigger value="test">Test Runner</TabsTrigger></TabsList>
      <TabsContent value="config"><ConfigTab endpoint={endpoint} save={save} /></TabsContent>
      <TabsContent value="request"><RequestTab endpoint={endpoint} save={save} /></TabsContent>
      <TabsContent value="response"><ResponseTab endpoint={endpoint} save={save} /></TabsContent>
      <TabsContent value="credentials"><CredentialsTab endpoint={endpoint} save={save} /></TabsContent>
      <TabsContent value="test"><div className="glass-panel mt-4 rounded-2xl p-6"><div className="flex flex-wrap items-center gap-3"><Button onClick={runTest} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}Run Test</Button><StatusBadge status={result?.status} running={running} />{result && <span className="text-sm text-muted-foreground">{result.latency} ms · {result.message}</span>}</div>
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-glass-border bg-card/55 p-4 font-mono text-xs">{result ? prettyBody(result.body) || result.message : "Run a test to see the response."}</pre>
        <h3 className="mt-6 font-display font-bold">Execution log</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Time</th><th>Status</th><th>Latency</th><th>Message</th></tr></thead><tbody>{(logs.data ?? []).map(l => <tr key={l.id} className="border-t border-glass-border"><td className="py-2">{new Date(l.created_at).toLocaleString("en-IN")}</td><td><StatusBadge status={l.status ?? 0} /></td><td>{l.latency_ms ?? "—"} ms</td><td className="text-muted-foreground">{l.message}</td></tr>)}{!logs.data?.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No test runs yet.</td></tr>}</tbody></table></div></div></TabsContent>
    </Tabs></div>;
}
const prettyBody = (b: string) => { try { return JSON.stringify(JSON.parse(b), null, 2); } catch { return b; } };
type SaveFn = (patch: Omit<Update, "id">, msg?: string) => Promise<boolean>;

function ConfigTab({ endpoint, save }: { endpoint: SapEndpoint; save: SaveFn }) {
  const [f, setF] = useState({ name: endpoint.name, description: endpoint.description, module: endpoint.module, path: endpoint.path, method: endpoint.method, auth_type: endpoint.auth_type, api_type: endpoint.api_type, active: endpoint.active });
  return <div className="glass-panel mt-4 rounded-2xl p-6"><div className="grid gap-4 md:grid-cols-2">
    <Field label="Name"><Input className="bg-card/55" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
    <Field label="Module"><Pick label="Module" value={f.module} onChange={v => setF({ ...f, module: v })} options={sapModules} /></Field>
    <div className="md:col-span-2"><Field label="Description"><Textarea className="bg-card/55" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field></div>
    <div className="md:col-span-2"><Field label="Endpoint Path"><Input className="bg-card/55 font-mono" value={f.path} onChange={e => setF({ ...f, path: e.target.value })} /></Field></div>
    <Field label="HTTP Method"><Pick label="HTTP Method" value={f.method} onChange={v => setF({ ...f, method: v })} options={sapMethods} /></Field>
    <Field label="Auth Type"><Pick label="Auth Type" value={f.auth_type} onChange={v => setF({ ...f, auth_type: v })} options={sapAuthTypes} /></Field>
    <Field label="API Type"><Pick label="API Type" value={f.api_type} onChange={v => setF({ ...f, api_type: v })} options={["fetch", "sync"]} /></Field>
    <div className="flex items-end gap-2 pb-2"><Switch checked={f.active} onCheckedChange={v => setF({ ...f, active: v })} /><Label>Active</Label></div>
  </div><div className="mt-6 flex justify-end"><Button onClick={() => { if (!f.name.trim() || !f.path.trim()) { toast.error("Name and endpoint path are required"); return; } void save(f); }}><Save />Save</Button></div></div>;
}

function moveRow<T>(rows: T[], i: number, d: number) { const r = [...rows]; const j = i + d; if (j < 0 || j >= r.length) return r; const t = r[i]!; r[i] = r[j]!; r[j] = t; return r; }
const resort = <T extends { sort: number }>(rows: T[]) => rows.map((r, i) => ({ ...r, sort: i + 1 }));

function RequestTab({ endpoint, save }: { endpoint: SapEndpoint; save: SaveFn }) {
  const [rows, setRows] = useState<RequestField[]>((endpoint.request_fields as RequestField[]) ?? []);
  const make = (name: string, sort: number): RequestField => ({ name, source: "static", default_value: "", required: false, sort });
  const set = (i: number, p: Partial<RequestField>) => setRows(rows.map((r, k) => k === i ? { ...r, ...p } : r));
  return <FieldsPanel title="Request fields" importLabel="Import from JSON Payload" headers={["Field Name", "Source", "Default Value", "Required", "Order", ""]} count={rows.length}
    onAdd={() => setRows([...rows, make("", rows.length + 1)])} onImport={(names, replace) => setRows(mergeFieldNames(rows, names, make, replace))} onSave={() => save({ request_fields: resort(rows) }, "Request fields saved")}>
    {rows.map((r, i) => <tr key={i} className="border-t border-glass-border"><td className="p-2"><Input className="bg-card/55 font-mono text-xs" value={r.name} onChange={e => set(i, { name: e.target.value })} /></td><td className="p-2 w-36"><Pick label="Source" value={r.source} onChange={v => set(i, { source: v as RequestField["source"] })} options={["static", "column", "expr", "secret"]} /></td><td className="p-2"><Input className="bg-card/55" value={r.default_value} onChange={e => set(i, { default_value: e.target.value })} /></td><td className="p-2 text-center"><Checkbox checked={r.required} onCheckedChange={v => set(i, { required: !!v })} /></td><RowControls i={i} n={rows.length} onMove={d => setRows(resort(moveRow(rows, i, d)))} onRemove={() => setRows(resort(rows.filter((_, k) => k !== i)))} /></tr>)}
  </FieldsPanel>;
}
function ResponseTab({ endpoint, save }: { endpoint: SapEndpoint; save: SaveFn }) {
  const [rows, setRows] = useState<ResponseField[]>((endpoint.response_fields as ResponseField[]) ?? []);
  const make = (name: string, sort: number): ResponseField => ({ name, target_table: "", target_column: "", transform: "", sort });
  const set = (i: number, p: Partial<ResponseField>) => setRows(rows.map((r, k) => k === i ? { ...r, ...p } : r));
  return <FieldsPanel title="Response fields" importLabel="Import from JSON Response" headers={["Field Name", "Target Table", "Target Column", "Transform Expression", "Order", ""]} count={rows.length}
    onAdd={() => setRows([...rows, make("", rows.length + 1)])} onImport={(names, replace) => setRows(mergeFieldNames(rows, names, make, replace))} onSave={() => save({ response_fields: resort(rows) }, "Response fields saved")}>
    {rows.map((r, i) => <tr key={i} className="border-t border-glass-border">{(["name", "target_table", "target_column", "transform"] as const).map(k => <td key={k} className="p-2"><Input className="bg-card/55 font-mono text-xs" value={r[k]} onChange={e => set(i, { [k]: e.target.value })} /></td>)}<RowControls i={i} n={rows.length} onMove={d => setRows(resort(moveRow(rows, i, d)))} onRemove={() => setRows(resort(rows.filter((_, k) => k !== i)))} /></tr>)}
  </FieldsPanel>;
}
function RowControls({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: number) => void; onRemove: () => void }) {
  return <><td className="p-2 text-center text-xs text-muted-foreground">{i + 1}</td><td className="p-2"><div className="flex"><Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown /></Button><Button size="icon" variant="ghost" aria-label="Remove" className="text-destructive" onClick={onRemove}><Trash2 /></Button></div></td></>;
}
function FieldsPanel({ title, importLabel, headers, count, onAdd, onImport, onSave, children }: { title: string; importLabel: string; headers: string[]; count: number; onAdd: () => void; onImport: (names: string[], replace: boolean) => void; onSave: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="glass-panel mt-4 rounded-2xl p-6"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display font-bold">{title}</h3><Badge variant="outline">{count}</Badge><div className="ml-auto flex gap-2"><Button variant="outline" onClick={() => setOpen(true)}><FileJson />{importLabel}</Button><Button variant="outline" onClick={onAdd}><Plus />Add field</Button><Button onClick={onSave}><Save />Save</Button></div></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr>{headers.map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead><tbody>{children}{!count && <tr><td colSpan={headers.length} className="p-6 text-center text-muted-foreground">No fields yet. Add one or import from JSON.</td></tr>}</tbody></table></div>
    <JsonImportDialog open={open} onOpenChange={setOpen} title={importLabel} onImport={onImport} /></div>;
}
function JsonImportDialog({ open, onOpenChange, title, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; onImport: (names: string[], replace: boolean) => void }) {
  const [text, setText] = useState(""); const [names, setNames] = useState<string[]>([]); const [picked, setPicked] = useState<Set<string>>(new Set()); const [error, setError] = useState(""); const [replace, setReplace] = useState(false);
  function parse() { try { const n = flattenJson(JSON.parse(text)); setNames(n); setPicked(new Set(n)); setError(n.length ? "" : "No fields found"); } catch (e) { setError((e as Error).message); setNames([]); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
    <Textarea className="min-h-40 bg-card/55 font-mono text-xs" placeholder='{"HEADER":{"PLANT":"1000"},"ITEMS":[{"MATERIAL":"M-01"}]}' value={text} onChange={e => setText(e.target.value)} />
    <div className="flex items-center gap-3"><Button variant="outline" onClick={parse}>Parse JSON</Button>{error && <span className="text-xs text-destructive">{error}</span>}</div>
    {names.length > 0 && <div className="max-h-56 space-y-1 overflow-auto rounded-xl border border-glass-border p-3">{names.map(n => <label key={n} className="flex items-center gap-2 font-mono text-xs"><Checkbox checked={picked.has(n)} onCheckedChange={v => { const s = new Set(picked); v ? s.add(n) : s.delete(n); setPicked(s); }} />{n}</label>)}</div>}
    <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={!replace} onChange={() => setReplace(false)} />Merge</label><label className="flex items-center gap-2"><input type="radio" checked={replace} onChange={() => setReplace(true)} />Replace Existing</label></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!picked.size} onClick={() => { onImport(names.filter(n => picked.has(n)), replace); onOpenChange(false); setText(""); setNames([]); toast.success(`${picked.size} fields added — click Save to keep them`); }}>Import {picked.size} fields</Button></DialogFooter></DialogContent></Dialog>;
}
function CredentialsTab({ endpoint, save }: { endpoint: SapEndpoint; save: SaveFn }) {
  const [user, setUser] = useState(endpoint.credential_user ?? ""); const [pw, setPw] = useState("");
  const [headers, setHeaders] = useState(JSON.stringify(endpoint.extra_headers ?? {}, null, 2)); const parsed = parseHeaders(headers);
  return <div className="mt-4 grid gap-5 xl:grid-cols-2">
    <div className="glass-panel rounded-2xl p-6"><h3 className="font-display font-bold">Credential override</h3><p className="mt-1 text-sm text-muted-foreground">Optional. Leave empty to use the global SAP technical user.</p><div className="mt-4 space-y-4"><Field label="Username"><Input className="bg-card/55" value={user} onChange={e => setUser(e.target.value)} autoComplete="off" /></Field><div><Label>Password</Label><SecretInput value={pw} onChange={setPw} saved={endpoint.password_set} /></div></div>
      <Button className="mt-5" onClick={async () => { if (await save({ credential_user: user.trim() || null, credential_password: pw || undefined }, "Credentials saved")) setPw(""); }}><Save />Save credentials</Button></div>
    <div className="glass-panel rounded-2xl p-6"><h3 className="font-display font-bold">Extra headers</h3><Textarea className="mt-4 min-h-48 bg-card/55 font-mono text-xs" value={headers} onChange={e => setHeaders(e.target.value)} />
      <p className={`mt-2 text-xs ${parsed.ok ? "text-success" : "text-destructive"}`}>{parsed.ok ? "Valid JSON" : parsed.error}</p>
      <Button className="mt-4" disabled={!parsed.ok} onClick={() => parsed.ok && save({ extra_headers: parsed.value }, "Headers saved")}><Save />Save headers</Button></div>
  </div>;
}
