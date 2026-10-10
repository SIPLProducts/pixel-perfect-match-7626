import { useState } from "react";
import { Search, Wrench, RefreshCw, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkspaceData } from "./workspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Request = WorkspaceData["maintenance"][number];
export function ServiceRequests({data}:{data:WorkspaceData}) {
  const [search,setSearch] = useState("");
  const [status,setStatus] = useState("all");
  const [selected,setSelected] = useState<Request | null>(null);
  const queryClient = useQueryClient();
  const requests = data.maintenance.filter(r=>(status === "all" || r.status === status) && `${r.title} ${r.assets?.asset_id} ${r.assets?.name} ${r.remarks ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search service requests" placeholder="Search asset or breakdown…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44" aria-label="Service request status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["pending","approved","completed","cancelled","rejected","draft"].map(s=><SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={()=>queryClient.invalidateQueries({queryKey:["workspace"]})}><RefreshCw className="size-4"/>Refresh</Button></div>
    <p className="text-sm text-muted-foreground">{requests.length} service requests</p>
    {requests.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{requests.map(r=><article key={r.id} className="glass-panel overflow-hidden rounded-lg p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline" className="capitalize">{r.status}</Badge>{r.source === "qr" && <Badge variant="secondary">QR breakdown</Badge>}</div><p className="mt-4 font-mono text-xs font-semibold text-primary">{r.assets?.asset_id}</p><h2 className="mt-1 break-words font-display font-bold">{r.title}</h2><p className="mt-1 text-sm text-muted-foreground">{r.assets?.name}</p>{r.remarks && <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm">{r.remarks}</p>}<p className="mt-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</p><Button className="mt-4 w-full" variant="outline" onClick={()=>setSelected(r)}>{r.photo_url ? <Camera className="size-4"/> : <Wrench className="size-4"/>}View request</Button></article>)}</div> : <div className="py-16 text-center"><Wrench className="mx-auto size-10 text-muted-foreground"/><h2 className="mt-4 font-display font-bold">No service requests found</h2></div>}
    <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.assets?.asset_id} · {selected?.assets?.name}</DialogDescription></DialogHeader>{selected && <><div className="flex gap-2"><Badge variant="outline" className="capitalize">{selected.status}</Badge>{selected.source === "qr" && <Badge variant="secondary">QR breakdown</Badge>}</div><p className="whitespace-pre-wrap break-words text-sm">{selected.remarks || "No additional details"}</p>{selected.photo_url && <img src={selected.photo_url} alt="Reported equipment breakdown" className="max-h-96 w-full rounded-lg bg-muted object-contain"/>}<p className="break-all font-mono text-xs text-muted-foreground">Reference: {selected.id}</p></>}</DialogContent></Dialog>
  </section>;
}