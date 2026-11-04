import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Archive, BadgeCheck, Boxes, CalendarClock, CheckCircle2, ChevronRight, Download, FileSpreadsheet, Filter, Printer, QrCode, RotateCcw, SearchX, ShieldAlert, Trash2, UserRound, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { categoryPath } from "@/lib/category-schema";
import { exportDashboardCsv, exportDashboardPdf, exportDashboardXlsx, type DashboardReport } from "@/lib/dashboard-export";
import { categoryMatches, closedServiceStatuses, countBy, inDateRange, monthlyCounts, openServiceRequestCount, plantSummary, qrInsights, warrantyBands, warrantyWithin } from "@/lib/report-builders";
import { Kpi, EmptyState, type Tone } from "../kpi-card";
import type { WorkspaceData } from "../workspace";

type Asset = WorkspaceData["assets"][number];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const activeStatuses = new Set(["active", "assigned", "in_stock"]);
const assetStartDate = (a: Asset) => a.capitalization_date ?? a.purchase_date ?? a.created_at;
const assetAgeMonths = (a: Asset) => Math.max(0, Math.floor((Date.now() - new Date(assetStartDate(a)).getTime()) / 2629800000));
const formatAge = (m: number) => (m < 12 ? `${m} mo` : `${Math.floor(m / 12)} yr${Math.floor(m / 12) === 1 ? "" : "s"} ${m % 12} mo`);
const formatDate = (v: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
const pretty = (v: string) => v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const statusColor: Record<string, string> = {
  active: "var(--success)", assigned: "var(--primary)", in_stock: "var(--info)", under_maintenance: "var(--warning)", under_repair: "var(--warning)",
  missing: "var(--destructive)", damaged: "var(--chart-1)", retired: "var(--muted-foreground)", disposed: "var(--chart-4)",
};
const bandColor = ["var(--destructive)", "var(--chart-1)", "var(--warning)", "var(--info)", "var(--success)", "var(--muted-foreground)"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 };

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="glass-panel min-w-0 rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-display font-bold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}</div>{action}</div><div className="mt-4">{children}</div></div>;
}

function HBars({ data, fill }: { data: { name: string; value: number }[]; fill: string }) {
  if (!data.length) return <EmptyState icon={SearchX} title="No data yet" />;
  return <div style={{ height: Math.max(180, data.length * 30 + 20) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "var(--foreground)" }} /><ChartTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} /><Bar dataKey="value" name="Assets" fill={fill} radius={[0, 6, 6, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>;
}

function Donut({ data, colors, centre }: { data: { name: string; value: number }[]; colors: string[]; centre: string }) {
  const shown = data.filter((d) => d.value > 0);
  if (!shown.length) return <EmptyState icon={SearchX} title="No data yet" />;
  return <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]"><div className="relative h-[180px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={shown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">{shown.map((d) => <Cell key={d.name} fill={colors[data.indexOf(d)]} />)}</Pie><ChartTooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><span className="font-display text-xl font-bold">{centre}</span></div></div><ul className="space-y-1.5 text-sm">{data.map((d, i) => <li key={d.name} className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[i] }} /><span className="flex-1 truncate text-muted-foreground">{d.name}</span><b className="tabular-nums">{d.value}</b></li>)}</ul></div>;
}

export function Dashboard({ data, setActive, onAsset }: { data: WorkspaceData; setActive: (s: string) => void; onAsset: (a: Asset) => void }) {
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [plant, setPlant] = useState("all");
  const [status, setStatus] = useState("all");
  const [age, setAge] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const plants = useMemo(() => [...new Set(data.assets.map((a) => a.plant?.trim()).filter(Boolean) as string[])].sort(), [data.assets]);
  const assetStatuses = useMemo(() => [...new Set(data.assets.map((a) => a.status))].sort(), [data.assets]);
  const assets = useMemo(() => data.assets.filter((a) => {
    const months = assetAgeMonths(a);
    const statusOk = status === "all" || (status === "active" ? activeStatuses.has(a.status) : status === "inactive" ? !activeStatuses.has(a.status) : a.status === status.slice(2));
    const ageOk = age === "all" || (age === "under-1" && months < 12) || (age === "1-3" && months >= 12 && months < 36) || (age === "3-5" && months >= 36 && months < 60) || (age === "5-plus" && months >= 60);
    return categoryMatches(a, category) && (location === "all" || a.locations?.name === location) && (plant === "all" || a.plant?.trim() === plant) && statusOk && ageOk && inDateRange(a.created_at, from, to);
  }), [age, category, data.assets, from, location, plant, status, to]);
  const hasFilters = category !== "all" || location !== "all" || plant !== "all" || status !== "all" || age !== "all" || !!from || !!to;
  const codes = useMemo(() => new Set(assets.map((a) => a.asset_id)), [assets]);
  const requests = useMemo(() => (hasFilters ? data.maintenance.filter((r) => codes.has(r.assets?.asset_id ?? "")) : data.maintenance), [codes, data.maintenance, hasFilters]);

  const total = assets.length;
  const by = (s: string) => assets.filter((a) => a.status === s).length;
  const kpis = { active: by("active"), assigned: by("assigned"), maintenance: by("under_maintenance") + by("under_repair"), missing: by("missing"), disposed: by("disposed"), retired: by("retired") };
  const openRequests = openServiceRequestCount(requests);
  const warranty90 = assets.filter((a) => warrantyWithin(a.warranty_end, 90)).length;
  const purchaseCost = assets.reduce((n, a) => n + Number(a.purchase_value ?? 0), 0);
  const currentValue = assets.reduce((n, a) => n + Number(a.current_value ?? 0), 0);

  const added = monthlyCounts(assets.map((a) => a.created_at));
  const lifecycle = countBy(assets, (a) => a.status).map((d) => ({ ...d, label: pretty(d.name) }));
  const topCategories = countBy(assets, (a) => categoryPath(a.parent_category_name, a.asset_categories?.name), 10);
  const topLocations = countBy(assets, (a) => a.locations?.name, 10);
  const serviceTrend = monthlyCounts(requests.map((r) => r.created_at));
  const serviceTypes = countBy(requests, (r) => pretty(r.maintenance_type ?? "other"), 6);
  const bands = warrantyBands(assets.map((a) => a.warranty_end));
  const qr = qrInsights(assets, requests);
  const plantRows = plantSummary(assets, requests);
  const upcoming = assets.filter((a) => warrantyWithin(a.warranty_end, 90)).sort((a, b) => String(a.warranty_end).localeCompare(String(b.warranty_end))).slice(0, 6);
  const recent = [...assets].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);
  const openList = requests.filter((r) => !closedServiceStatuses.has(String(r.status).toLowerCase())).slice(0, 6);

  const reset = () => { setCategory("all"); setLocation("all"); setPlant("all"); setStatus("all"); setAge("all"); setFrom(""); setTo(""); };

  const report = (): DashboardReport => {
    const ages = assets.map(assetAgeMonths);
    const avg = ages.length ? Math.round(ages.reduce((s, x) => s + x, 0) / ages.length) : 0;
    const ageData: Array<[string, number]> = [["< 1 year", ages.filter((x) => x < 12).length], ["1–3 years", ages.filter((x) => x >= 12 && x < 36).length], ["3–5 years", ages.filter((x) => x >= 36 && x < 60).length], ["5+ years", ages.filter((x) => x >= 60).length]];
    const active = assets.filter((a) => activeStatuses.has(a.status)).length;
    return {
      organization: data.organization?.name ?? "Organization",
      generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
      filters: [category === "all" ? "All categories" : `Category: ${category}`, location === "all" ? "All locations" : `Location: ${location}`, plant === "all" ? "All plants" : `Plant: ${plant}`, status === "all" ? "All statuses" : `Status: ${pretty(status.replace(/^s:/, ""))}`, age === "all" ? "All installation ages" : `Installation age: ${age}`, from || to ? `Added: ${from || "…"} to ${to || "…"}` : "Any date added"],
      metrics: [["Total assets", String(total)], ["Total acquisition cost", money.format(purchaseCost)], ["Current value", money.format(currentValue)], ["Average equipment life", formatAge(avg)], ["Active / inactive", `${active} / ${total - active}`]],
      ageProfile: ageData,
      statusProfile: [["Active", active], ["Inactive", total - active]],
      attention: [["Inactive assets", total - active], ["Maintenance due", kpis.maintenance], ["Warranties expiring", warranty90], ["Open service requests", openRequests]],
      assets: assets.map((a) => [a.asset_id, a.name, categoryPath(a.parent_category_name, a.asset_categories?.name), a.locations?.name ?? "—", a.employees?.full_name ?? "—", formatDate(assetStartDate(a)), formatAge(assetAgeMonths(a)), pretty(a.status), money.format(Number(a.purchase_value ?? 0)), money.format(Number(a.current_value ?? 0))]),
      sections: [
        { title: "Key figures", headings: ["Figure", "Value"], rows: [["Total assets", total], ["Active", kpis.active], ["Assigned", kpis.assigned], ["Under maintenance", kpis.maintenance], ["Missing", kpis.missing], ["Disposed", kpis.disposed], ["Retired", kpis.retired], ["Open service requests", openRequests], ["Warranty expiring in 90 days", warranty90]] },
        { title: "Assets added to Asset360", headings: ["Month", "Assets added"], rows: added.map((m) => [m.name, m.value]) },
        { title: "Asset lifecycle", headings: ["Status", "Assets"], rows: lifecycle.map((d) => [d.label, d.value]) },
        { title: "Top categories", headings: ["Category", "Assets"], rows: topCategories.map((d) => [d.name, d.value]) },
        { title: "Top locations", headings: ["Location", "Assets"], rows: topLocations.map((d) => [d.name, d.value]) },
        { title: "Service requests by month", headings: ["Month", "Requests"], rows: serviceTrend.map((m) => [m.name, m.value]) },
        { title: "Service requests by type", headings: ["Type", "Requests"], rows: serviceTypes.map((d) => [d.name, d.value]) },
        { title: "Warranty expiry", headings: ["Band", "Assets"], rows: bands.map((d) => [d.name, d.value]) },
        { title: "QR insights", headings: ["Figure", "Value"], rows: [["Active QR codes", qr.activeQrCodes], ["Labels printed", qr.labelsPrinted], ["Assets never printed", qr.neverPrinted], ["QR breakdown reports", qr.qrBreakdownReports]] },
        { title: "Plant summary", headings: ["Plant", "Total", "Active", "Maintenance", "Missing", "Open requests"], rows: plantRows.map((r) => [r.plant, r.total, r.active, r.maintenance, r.missing, r.openRequests]) },
      ],
    };
  };
  const runExport = (format: "csv" | "pdf" | "xlsx") => {
    if (!total) { toast.error("No filtered assets to export"); return; }
    const current = report();
    if (format === "csv") { exportDashboardCsv(current); toast.success("Filtered dashboard CSV exported"); return; }
    (format === "xlsx" ? exportDashboardXlsx(current) : exportDashboardPdf(current)).then(() => toast.success(`Filtered dashboard ${format === "xlsx" ? "Excel" : "PDF"} exported`)).catch(() => toast.error("Could not create the file"));
  };

  const kpiCards: Array<[string, number, string, typeof Boxes, Tone, string?]> = [
    ["Total assets", total, hasFilters ? "Matching filters" : "Registered equipment", Boxes, "primary", "assets"],
    ["Active", kpis.active, "In use", CheckCircle2, "success"],
    ["Assigned", kpis.assigned, "With a custodian", UserRound, "info"],
    ["Under maintenance", kpis.maintenance, "Maintenance or repair", Wrench, "warning"],
    ["Missing", kpis.missing, "Not located", SearchX, "destructive"],
    ["Disposed", kpis.disposed, "Disposed of", Trash2, "destructive"],
    ["Retired", kpis.retired, "Out of service", Archive, "info"],
    ["Open service requests", openRequests, "Not completed or closed", ShieldAlert, "warning", "maintenance"],
    ["Warranty expiring", warranty90, "Within 90 days", CalendarClock, "primary"],
  ];

  return <div className="space-y-5 soft-enter">
    <section className="glass-panel p-4 sm:p-5" aria-label="Dashboard filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Filter className="size-4" /></span><div className="min-w-0"><h2 className="truncate font-display text-sm font-bold">Dashboard filters</h2><p className="text-xs text-muted-foreground">{hasFilters ? `${total} of ${data.assets.length} assets match` : `All ${data.assets.length} assets in ${data.organization?.name ?? "this workspace"}`}</p></div></div>
        <div className="flex items-center gap-1">
          {hasFilters && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="size-4" />Reset</Button>}
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="glass" size="sm" disabled={!total}><Download className="size-4" />Export</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Filtered dashboard</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => runExport("xlsx")}><FileSpreadsheet />Excel (.xlsx)</DropdownMenuItem><DropdownMenuItem onClick={() => runExport("csv")}><FileSpreadsheet />CSV</DropdownMenuItem><DropdownMenuItem onClick={() => runExport("pdf")}><Download />PDF</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full bg-glass-strong" aria-label="Filter by category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{data.categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.parent_id ? `↳ ${c.name}` : c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={location} onValueChange={setLocation}><SelectTrigger className="w-full bg-glass-strong" aria-label="Filter by location"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{data.locations.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent></Select>
        <Select value={plant} onValueChange={setPlant}><SelectTrigger className="w-full bg-glass-strong" aria-label="Filter by plant"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All plants</SelectItem>{plants.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full bg-glass-strong" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active (in use)</SelectItem><SelectItem value="inactive">Inactive</SelectItem>{assetStatuses.map((s) => <SelectItem key={s} value={`s:${s}`}>{pretty(s)}</SelectItem>)}</SelectContent></Select>
        <Select value={age} onValueChange={setAge}><SelectTrigger className="w-full bg-glass-strong" aria-label="Filter by installation age"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All installation ages</SelectItem><SelectItem value="under-1">Under 1 year</SelectItem><SelectItem value="1-3">1–3 years</SelectItem><SelectItem value="3-5">3–5 years</SelectItem><SelectItem value="5-plus">5+ years</SelectItem></SelectContent></Select>
        <Input type="date" aria-label="Added from" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-glass-strong" />
        <Input type="date" aria-label="Added to" value={to} onChange={(e) => setTo(e.target.value)} className="bg-glass-strong" />
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-9">
      {kpiCards.map(([label, value, delta, icon, tone, target]) => target
        ? <button key={label} type="button" onClick={() => setActive(target)} className="text-left transition hover:-translate-y-0.5"><Kpi label={label} value={value.toLocaleString()} delta={delta} icon={icon} tone={tone} /></button>
        : <Kpi key={label} label={label} value={value.toLocaleString()} delta={delta} icon={icon} tone={tone} />)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Assets Added to Asset360" subtitle="Records created per month (last 12 months). Not a purchase or capitalization trend.">
        <div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={added} margin={{ left: -16, right: 8 }}><defs><linearGradient id="addedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><ChartTooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="value" name="Assets added" stroke="var(--primary)" strokeWidth={2} fill="url(#addedFill)" /></AreaChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Asset lifecycle" subtitle="Current status of every asset">
        <Donut data={lifecycle.map((d) => ({ name: d.label, value: d.value }))} colors={lifecycle.map((d) => statusColor[d.name] ?? "var(--chart-2)")} centre={total.toLocaleString()} />
      </Panel>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <Panel title="Top 10 categories" subtitle="Assets per subcategory"><HBars data={topCategories} fill="var(--primary)" /></Panel>
      <Panel title="Top 10 locations" subtitle="Assets per location"><HBars data={topLocations} fill="var(--info)" /></Panel>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Service requests" subtitle={`Raised per month · ${openRequests} open`} action={<Button variant="ghost" size="sm" onClick={() => setActive("maintenance")}>View<ChevronRight className="size-4" /></Button>}>
        <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceTrend} margin={{ left: -16, right: 8 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><ChartTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} /><Bar dataKey="value" name="Requests" fill="var(--warning)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="mt-3 flex flex-wrap gap-2">{serviceTypes.length ? serviceTypes.map((t) => <span key={t.name} className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">{t.name}: {t.value}</span>) : <span className="text-xs text-muted-foreground">No service requests yet</span>}</div>
      </Panel>
      <Panel title="Warranty expiry" subtitle="By warranty end date. AMC is not tracked in Asset360.">
        <Donut data={bands} colors={bandColor} centre={String(warranty90)} />
      </Panel>
    </section>

    <section className="glass-panel rounded-2xl p-5" aria-label="QR insights">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display font-bold">QR insights</h2><p className="text-xs text-muted-foreground">From stored QR codes and the label print log. Scans are not recorded, so no scan counts are shown.</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active QR codes" value={qr.activeQrCodes.toLocaleString()} delta={`${total ? Math.round((qr.activeQrCodes / total) * 100) : 0}% of assets have a working QR`} icon={QrCode} tone="primary" />
        <Kpi label="Labels printed" value={qr.labelsPrinted.toLocaleString()} delta="Print, PDF and PNG outputs" icon={Printer} tone="success" />
        <Kpi label="Assets never printed" value={qr.neverPrinted.toLocaleString()} delta="QR exists, no label output yet" icon={BadgeCheck} tone="warning" />
        <Kpi label="QR breakdown reports" value={qr.qrBreakdownReports.toLocaleString()} delta="Service requests raised by scanning" icon={ShieldAlert} tone="destructive" />
      </div>
    </section>

    <Panel title="Plant summary" subtitle="Asset health per plant">
      {plantRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Plant</th><th className="py-2 pr-3 text-right">Total</th><th className="py-2 pr-3 text-right">Active</th><th className="py-2 pr-3 text-right">Maintenance</th><th className="py-2 pr-3 text-right">Missing</th><th className="py-2 text-right">Open requests</th></tr></thead><tbody>{plantRows.map((r) => <tr key={r.plant} className="border-b border-border/60 last:border-0"><td className="py-2 pr-3 font-medium">{r.plant}</td><td className="py-2 pr-3 text-right tabular-nums">{r.total}</td><td className="py-2 pr-3 text-right tabular-nums text-success">{r.active}</td><td className="py-2 pr-3 text-right tabular-nums text-warning">{r.maintenance}</td><td className="py-2 pr-3 text-right tabular-nums text-destructive">{r.missing}</td><td className="py-2 text-right tabular-nums">{r.openRequests}</td></tr>)}</tbody></table></div> : <EmptyState icon={SearchX} title="No data yet" />}
    </Panel>

    <section className="grid gap-5 xl:grid-cols-3">
      <Panel title="Upcoming warranty expiries" subtitle="Next 90 days">
        {upcoming.length ? <ul className="divide-y divide-border">{upcoming.map((a) => <li key={a.id}><button type="button" onClick={() => onAsset(a)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"><span className="min-w-0 truncate"><b>{a.asset_id}</b> · {a.name}</span><span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.warranty_end!)}</span></button></li>)}</ul> : <EmptyState icon={CalendarClock} title="Nothing expiring soon" />}
      </Panel>
      <Panel title="Recent assets" subtitle="Newest records" action={<Button variant="ghost" size="sm" onClick={() => setActive("assets")}>View all<ChevronRight className="size-4" /></Button>}>
        {recent.length ? <ul className="divide-y divide-border">{recent.map((a) => <li key={a.id}><button type="button" onClick={() => onAsset(a)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"><span className="min-w-0 truncate"><b>{a.asset_id}</b> · {a.name}</span><span className="shrink-0 text-xs text-muted-foreground">{pretty(a.status)}</span></button></li>)}</ul> : <EmptyState icon={Boxes} title="No assets yet" />}
      </Panel>
      <Panel title="Open service requests" subtitle="Not completed or closed" action={<Button variant="ghost" size="sm" onClick={() => setActive("maintenance")}>View all<ChevronRight className="size-4" /></Button>}>
        {openList.length ? <ul className="divide-y divide-border">{openList.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><b>{r.assets?.asset_id ?? "—"}</b> · {r.title}</span><span className="shrink-0 text-xs text-muted-foreground">{pretty(r.status)}</span></li>)}</ul> : <EmptyState icon={CheckCircle2} title="No open requests" />}
      </Panel>
    </section>
  </div>;
}
