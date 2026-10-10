import { useState } from "react";
import { Search, Wrench, RefreshCw, Camera, ClipboardList, Clock3, CheckCircle2, QrCode, ArrowUpRight, RotateCcw, LoaderCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WorkspaceData } from "./workspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

 type Request = WorkspaceData["maintenance"][number];
const pretty = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
const date = (value: string) => new Date(value).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"});
const money = new Intl.NumberFormat("en-IN", {style:"currency", currency:"INR", maximumFractionDigits:0});
function RequestStatus({value}:{value:string}) {
  const tone = value === "completed" ? "bg-success/10 text-success" : value === "pending" ? "bg-warning/10 text-foreground" : value === "approved" ? "bg-primary/10 text-primary" : value === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`gap-1.5 border-transparent ${tone}`}><span className="size-1.5 rounded-full bg-current"/>{pretty(value)}</Badge>;
}
function RequestFilter({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:[string,string][]}) {
  return <div className="min-w-0 space-y-1.5"><p className="text-xs font-medium text-muted-foreground">{label}</p><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-full bg-glass-strong"><SelectValue/></SelectTrigger><SelectContent>{options.map(([key,name])=><SelectItem key={key} value={key}>{name}</SelectItem>)}</SelectContent></Select></div>;
}
export function ServiceRequests({data}:{data:WorkspaceData}) {
  const [search,setSearch] = useState("");
  const [status,setStatus] = useState("all");
  const [source,setSource] = useState("all");
  const [type,setType] = useState("all");
  const [sort,setSort] = useState("newest");
  const [page,setPage] = useState(1);
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [photoFailed,setPhotoFailed] = useState(false);
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({queryKey:["workspace"]}) > 0;
  const selected = data.maintenance.find(r=>r.id === selectedId);
  const types = [...new Set(data.maintenance.map(r=>r.maintenance_type))].sort();
  const requests = data.maintenance.filter(r=>(status === "all" || r.status === status) && (source === "all" || r.source === source) && (type === "all" || r.maintenance_type === type) && [r.id,r.title,r.assets?.asset_id,r.assets?.name,r.remarks].some(v=>v?.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b)=>sort === "oldest" ? a.created_at.localeCompare(b.created_at) : a.created_at === b.created_at ? a.id.localeCompare(b.id) : b.created_at.localeCompare(a.created_at));
  const totalPages = Math.max(1,Math.ceil(requests.length/10));
  const currentPage = Math.min(page,totalPages);
  const shown = requests.slice((currentPage-1)*10,currentPage*10);
  const filtered = Boolean(search || status !== "all" || source !== "all" || type !== "all");
  const reset = () => {setSearch("");setStatus("all");setSource("all");setType("all");setSort("newest");setPage(1)};
  const open = (r:Request) => {setSelectedId(r.id);setPhotoFailed(false)};
  const metrics = [
    {label:"Total requests",value:requests.length,icon:ClipboardList,tone:"text-primary bg-primary/10"},
    {label:"Pending",value:requests.filter(r=>r.status === "pending").length,icon:Clock3,tone:"text-warning bg-warning/10"},
    {label:"Completed",value:requests.filter(r=>r.status === "completed").length,icon:CheckCircle2,tone:"text-success bg-success/10"},
    {label:"From QR labels",value:requests.filter(r=>r.source === "qr").length,icon:QrCode,tone:"text-info bg-info/10"},
  ];
  return <section className="space-y-6">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(({label,value,icon:Icon,tone})=><article key={label} className="glass-panel flex min-w-0 items-start justify-between gap-2 rounded-lg p-4 sm:p-5"><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p></div><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="size-4"/></div></article>)}</div>
    <div className="space-y-4 border-y border-border py-5">
      <div className="flex items-center gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search service requests" placeholder="Search request, asset or description…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} className="bg-glass-strong pl-9"/></div><Button variant="outline" disabled={refreshing} onClick={async()=>{try{await queryClient.refetchQueries({queryKey:["workspace"],type:"active"},{throwOnError:true});setPhotoFailed(false)}catch{toast.error("Could not refresh service requests. Please retry.")}}}>{refreshing ? <LoaderCircle className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>}<span className="hidden sm:inline">Refresh</span><span className="sr-only sm:hidden">Refresh service requests</span></Button></div>
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <RequestFilter label="Request status" value={status} onChange={v=>{setStatus(v);setPage(1)}} options={[["all","All statuses"],...["pending","approved","completed","cancelled","rejected","draft"].map(s=>[s,pretty(s)] as [string,string])]}/>
        <RequestFilter label="Request source" value={source} onChange={v=>{setSource(v);setPage(1)}} options={[["all","All sources"],["qr","QR label"],["portal","Portal"]]}/>
        <RequestFilter label="Service type" value={type} onChange={v=>{setType(v);setPage(1)}} options={[["all","All service types"],...types.map(t=>[t,pretty(t)] as [string,string])]}/>
        <RequestFilter label="Sort by" value={sort} onChange={v=>{setSort(v);setPage(1)}} options={[["newest","Newest first"],["oldest","Oldest first"]]}/>
        <Button variant="ghost" onClick={reset} disabled={!filtered && sort === "newest"} className="justify-self-start"><RotateCcw className="size-4"/>Reset</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Request register</h2><p className="text-xs text-muted-foreground">Showing {requests.length} of {data.maintenance.length} requests</p></div>
    {shown.length ? <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-border bg-glass"><tr>{["Request / asset","Status","Source / type","Reported","Cost", ""].map((h,i)=><th key={i} scope="col" className="px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{shown.map(r=><tr key={r.id} className="transition-colors hover:bg-glass"><td className="max-w-xs px-3 py-4"><Button variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-semibold text-foreground" onClick={()=>open(r)}>{r.title}</Button><p className="mt-1 text-xs text-muted-foreground"><span className="font-mono text-primary">{r.assets?.asset_id ?? "—"}</span> · {r.assets?.name ?? "—"}</p></td><td className="px-3 py-4"><RequestStatus value={r.status}/></td><td className="px-3 py-4"><p className="flex items-center gap-1.5 text-xs">{r.source === "qr" ? <QrCode className="size-3.5 text-primary"/> : <ClipboardList className="size-3.5 text-muted-foreground"/>}{r.source === "qr" ? "QR label" : pretty(r.source)}</p><p className="mt-1 text-xs text-muted-foreground">{pretty(r.maintenance_type)}</p></td><td className="whitespace-nowrap px-3 py-4 text-xs">{date(r.created_at)}{r.photo_url && <p className="mt-1 flex items-center gap-1 text-muted-foreground"><Camera className="size-3"/>Photo attached</p>}</td><td className="whitespace-nowrap px-3 py-4 text-xs tabular-nums">{money.format(r.cost)}</td><td className="px-2 py-4"><Button variant="ghost" size="icon" aria-label={`View request: ${r.title}`} title="View request" onClick={()=>open(r)}><ArrowUpRight className="size-4"/></Button></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 md:hidden">{shown.map(r=><article key={r.id} className="glass-panel min-w-0 rounded-lg p-4"><div className="flex flex-wrap justify-between gap-2"><RequestStatus value={r.status}/><span className="text-xs text-muted-foreground">{r.source === "qr" ? "QR label" : pretty(r.source)}</span></div><h3 className="mt-3 break-words font-display font-bold">{r.title}</h3><p className="mt-1 break-words text-xs text-muted-foreground"><span className="font-mono text-primary">{r.assets?.asset_id}</span> · {r.assets?.name}</p><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{date(r.created_at)}</span><span>{pretty(r.maintenance_type)}</span></div><Button className="mt-4 w-full" variant="outline" onClick={()=>open(r)}>{r.photo_url ? <Camera className="size-4"/> : <ArrowUpRight className="size-4"/>}View request</Button></article>)}</div>
      <div className="flex items-center justify-between border-t border-border pt-4"><p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft className="size-4"/></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}><ChevronRight className="size-4"/></Button></div></div>
    </> : <div className="py-14 text-center"><Wrench className="mx-auto size-10 text-muted-foreground"/><h2 className="mt-4 font-display font-bold">{filtered ? "No matching requests" : "No service requests yet"}</h2>{filtered && <Button variant="outline" className="mt-4" onClick={reset}><RotateCcw className="size-4"/>Clear filters</Button>}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={value=>{if(!value)setSelectedId(null)}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="break-words pr-5">{selected?.title}</DialogTitle><DialogDescription>{selected?.assets?.asset_id} · {selected?.assets?.name}</DialogDescription></DialogHeader>{selected && <>
      <div className="flex flex-wrap gap-2"><RequestStatus value={selected.status}/><Badge variant="secondary">{selected.source === "qr" ? "QR label" : pretty(selected.source)}</Badge><Badge variant="outline">{pretty(selected.maintenance_type)}</Badge></div>
      <dl className="grid grid-cols-2 gap-4 border-y border-border py-4">{[["Reported",new Date(selected.created_at).toLocaleString("en-IN")],["Recorded cost",money.format(selected.cost)],["Next maintenance",selected.next_maintenance_date ? date(selected.next_maintenance_date) : "Not scheduled"],["Asset",selected.assets?.name ?? "—"]].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
      <div><h3 className="mb-2 text-sm font-semibold">Service / breakdown details</h3><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{selected.remarks || "No additional details recorded."}</p></div>
      <div><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Camera className="size-4 text-primary"/>Reported photo</h3>{selected.photo_url && !photoFailed ? <img src={selected.photo_url} alt="Reported equipment breakdown" className="max-h-96 w-full rounded-lg bg-muted object-contain" onError={()=>setPhotoFailed(true)}/> : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{photoFailed ? "Photo could not be loaded. Refresh the request list and try again." : "No photo attached."}</p>}</div>
      <div className="border-t border-border pt-3"><p className="text-xs text-muted-foreground">Request reference</p><p className="mt-1 break-all font-mono text-xs">{selected.id}</p></div>
    </>}</DialogContent></Dialog>
  </section>;
}
