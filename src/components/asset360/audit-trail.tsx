import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import type { WorkspaceData } from "./workspace";
import { inDateRange } from "@/lib/report-builders";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./kpi-card";

const pretty = (v: string) => v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function AuditTrail({ data }: { data: WorkspaceData }) {
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const rows = useMemo(() => data.events.filter((e) => inDateRange(e.created_at, from, to) && [e.summary, e.event_type, e.assets?.asset_id, e.assets?.name].some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase()))), [data.events, q, from, to]);
  return <div className="glass-panel rounded-2xl p-5 soft-enter">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display font-bold">Audit trail</h2><p className="mt-1 text-xs text-muted-foreground">Recorded workspace events, newest first</p></div><Badge variant="outline">{rows.length} of {data.events.length} events</Badge></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search event, asset ID or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit trail" /></div><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" /></div>
    <div className="mt-4 overflow-x-auto">{rows.length ? <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-4">Date & time</th><th className="py-2 pr-4">Event</th><th className="py-2 pr-4">Asset</th><th className="py-2">Summary</th></tr></thead><tbody>{rows.slice(0, 500).map((e) => <tr key={e.id} className="border-b border-border/60 align-top"><td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">{new Date(e.created_at).toLocaleString("en-IN")}</td><td className="py-2.5 pr-4"><Badge variant="secondary">{pretty(e.event_type)}</Badge></td><td className="py-2.5 pr-4"><b className="block">{e.assets?.asset_id ?? "—"}</b><span className="text-xs text-muted-foreground">{e.assets?.name}</span></td><td className="py-2.5">{e.summary}</td></tr>)}</tbody></table> : <EmptyState icon={History} title="No events match" description="Adjust the search or date range." />}</div>
  </div>;
}
