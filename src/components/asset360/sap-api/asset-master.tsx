import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSapData, getSapSettings } from "@/lib/sap-api.functions";

type Result = Awaited<ReturnType<typeof fetchSapData>>;
const pageSize = 100;

export function AssetMaster() {
  const load = useServerFn(getSapSettings); const run = useServerFn(fetchSapData);
  const settings = useQuery({ queryKey: ["sap-settings"], queryFn: () => load() });
  const endpoints = (settings.data?.endpoints ?? []).filter(e => e.active);
  const [endpointId, setEndpointId] = useState(""); const chosen = endpointId || endpoints[0]?.id || "";
  const endpoint = endpoints.find(e => e.id === chosen);
  const [result, setResult] = useState<Result | null>(null); const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""); const [page, setPage] = useState(0);

  const columns = useMemo(() => {
    const mapped = ((endpoint?.response_fields ?? []) as { name?: string }[]).map(f => String(f.name ?? "").replace(/^\[\]\./, "")).filter(Boolean);
    if (mapped.length) return mapped;
    return Array.from(new Set((result?.rows ?? []).slice(0, 50).flatMap(r => Object.keys(r))));
  }, [endpoint, result]);
  const rows = useMemo(() => { const q = search.trim().toLowerCase(); const all = result?.rows ?? []; return q ? all.filter(r => columns.some(c => String(r[c] ?? "").toLowerCase().includes(q))) : all; }, [result, search, columns]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)); const shown = rows.slice(page * pageSize, page * pageSize + pageSize);

  async function fetchData() {
    if (!chosen) return; setBusy(true);
    try { const r = await run({ data: { endpointId: chosen } }); setResult(r); setPage(0); r.ok ? toast.success(`${r.rows.length} records loaded`) : toast.error(r.message); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (settings.isLoading) return <div className="glass-panel grid place-items-center rounded-2xl p-14"><LoaderCircle className="size-6 animate-spin text-primary" /></div>;
  if (settings.error) return <div className="glass-panel rounded-2xl p-8 text-sm text-destructive">{settings.error.message}</div>;

  return <div className="overflow-hidden rounded-lg border border-glass-border bg-glass soft-enter">
    <div className="flex flex-col gap-3 border-b border-glass-border p-4 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Database className="size-4" /></div><div><p className="text-sm font-semibold">SAP data</p><p className="text-[11px] text-muted-foreground">Live response from the selected API</p></div></div>
      <Select value={chosen} onValueChange={v => { setEndpointId(v); setResult(null); }}><SelectTrigger className="w-full bg-card/60 lg:w-72" aria-label="SAP API"><SelectValue placeholder="No active APIs" /></SelectTrigger><SelectContent>{endpoints.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
      <Button variant="hero" onClick={fetchData} disabled={!chosen || busy}>{busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{busy ? "Fetching…" : "Fetch data"}</Button>
      <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="h-10 bg-card/60 pl-9" placeholder="Search records…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} disabled={!result?.rows.length} /></div>
      {result && <Badge variant="outline" className={result.ok ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>{result.message} · {(result.latency / 1000).toFixed(1)}s</Badge>}
    </div>
    {!endpoints.length ? <p className="p-14 text-center text-sm text-muted-foreground">No active APIs. Add one in SAP API Settings.</p>
      : !result ? <p className="p-14 text-center text-sm text-muted-foreground">{busy ? "Waiting for SAP — large reports can take a minute or more." : "Choose an API and press Fetch data."}</p>
      : !result.ok ? <p className="p-14 text-center text-sm text-destructive">{result.message}</p>
      : <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-card/25 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">#</th>{columns.map(c => <th key={c} className="whitespace-nowrap px-4 py-3 font-semibold">{c}</th>)}</tr></thead>
        <tbody>{shown.map((r, i) => <tr key={i} className="border-t border-border hover:bg-accent/50"><td className="px-4 py-2 text-xs text-muted-foreground">{page * pageSize + i + 1}</td>{columns.map(c => <td key={c} className="whitespace-nowrap px-4 py-2 text-xs">{r[c] === null || r[c] === undefined || r[c] === "" ? "—" : String(r[c])}</td>)}</tr>)}</tbody></table>
        {!rows.length && <p className="p-14 text-center text-sm text-muted-foreground">No records found.</p>}</div>
        <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground"><span>Showing {shown.length} of {rows.length} records</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {pages}</span><Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div></>}
  </div>;
}
