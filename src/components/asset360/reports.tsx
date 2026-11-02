import { useMemo, useState, type ComponentType } from "react";
import { ArrowRightLeft, Boxes, CalendarClock, FileSpreadsheet, QrCode, Wrench, Download, X } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceData } from "./workspace";
import { assetErpFields, erpDisplayValue } from "@/lib/asset-erp-fields";
import { latestAssetTransfers } from "@/lib/asset-transfer-summary";
import { categoryMatches, inDateRange, warrantyWithin, type ReportTable } from "@/lib/report-builders";
import { exportReportCsv, exportReportXlsx, type ReportMeta } from "@/lib/report-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneClass } from "./kpi-card";

const day = (v?: string | null) => (v ? v.slice(0, 10) : "");
const pretty = (v?: string | null) => (v ? v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export function Reports({ data }: { data: WorkspaceData }) {
  const [category, setCategory] = useState("all"); const [location, setLocation] = useState("all"); const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [warrantyDays, setWarrantyDays] = useState("90");
  const statuses = useMemo(() => [...new Set(data.assets.map((a) => a.status))].sort(), [data.assets]);
  const locName = useMemo(() => new Map(data.locations.map((l) => [l.id, l.name])), [data.locations]);
  const empName = useMemo(() => new Map(data.employees.map((e) => [e.id, e.full_name])), [data.employees]);
  const assets = useMemo(() => data.assets.filter((a) => categoryMatches(a, category) && (location === "all" || a.locations?.name === location) && (status === "all" || a.status === status)), [data.assets, category, location, status]);
  const assetCodes = useMemo(() => new Set(assets.map((a) => a.asset_id)), [assets]);
  const assetIds = useMemo(() => new Set(assets.map((a) => a.id)), [assets]);
  const hasFilters = category !== "all" || location !== "all" || status !== "all" || !!from || !!to;
  const reset = () => { setCategory("all"); setLocation("all"); setStatus("all"); setFrom(""); setTo(""); };

  const tables = useMemo(() => {
    const latest = latestAssetTransfers(data.transfers);
    const register: ReportTable = { title: "Asset register", headings: ["Asset ID", "Name", "Serial number", "Plant", "Company code", "Parent category", "Category", "Location", "Custodian", "Status", "Condition", "Acquisition value", "Current value", "Warranty end", "QR prints", "Latest transfer", "Latest transfer status", ...assetErpFields.map((f) => f.label)],
      rows: assets.filter((a) => inDateRange(a.created_at, from, to)).map((a) => { const t = latest.get(a.id); return [a.asset_id, a.name, a.serial_number, a.plant, a.company_code, a.parent_category_name, a.asset_categories?.name ?? "", a.locations?.name ?? "", a.employees?.full_name ?? "", pretty(a.status), pretty(a.condition), Number(a.purchase_value ?? 0), Number(a.current_value ?? 0), day(a.warranty_end), a.qr_print_count ?? 0, day(t?.transfer_date ?? t?.created_at), pretty(t?.status), ...assetErpFields.map((f) => erpDisplayValue(a[f.column] as string | number | null)) ]; }) };
    const service: ReportTable = { title: "Service requests", headings: ["Asset ID", "Asset", "Title", "Type", "Status", "Source", "Service provider", "Technician", "Cost", "Raised", "Updated", "Completed"],
      rows: data.maintenance.filter((m) => (!hasFilters || assetCodes.has(m.assets?.asset_id ?? "")) && inDateRange(m.created_at, from, to)).map((m) => [m.assets?.asset_id ?? "", m.assets?.name ?? "", m.title, pretty(m.maintenance_type), pretty(m.status), pretty(m.source), m.service_provider ?? "", m.technician ?? "", m.cost == null ? "" : Number(m.cost), day(m.created_at), day(m.updated_at), day(m.completion_date)]) };
    const transfers: ReportTable = { title: "Transfers", headings: ["Asset ID", "Asset", "From location", "To location", "From custodian", "To custodian", "Status", "Approved", "Reason", "Transfer date", "Created"],
      rows: data.transfers.filter((t) => assetIds.has(t.asset_id) && inDateRange(t.transfer_date ?? t.created_at, from, to)).map((t) => [t.assets?.asset_id ?? "", t.assets?.name ?? "", locName.get(t.from_location_id ?? "") ?? "", locName.get(t.to_location_id ?? "") ?? "", empName.get(t.from_employee_id ?? "") ?? "", empName.get(t.to_employee_id ?? "") ?? "", pretty(t.status), t.approved_by ? "Yes" : "No", t.reason ?? "", day(t.transfer_date), day(t.created_at)]) };
    const warranty: ReportTable = { title: `Warranty expiring in ${warrantyDays} days`, headings: ["Asset ID", "Name", "Category", "Location", "Warranty end", "Status"],
      rows: assets.filter((a) => warrantyWithin(a.warranty_end, Number(warrantyDays))).sort((x, y) => String(x.warranty_end).localeCompare(String(y.warranty_end))).map((a) => [a.asset_id, a.name, a.asset_categories?.name ?? "", a.locations?.name ?? "", day(a.warranty_end), pretty(a.status)]) };
    const codeById = new Map(data.assets.map((a) => [a.id, a]));
    const prints: ReportTable = { title: "QR print history", headings: ["Asset ID", "Asset", "Output", "Printed by", "Date & time"],
      rows: data.qrPrintHistory.filter((p) => assetIds.has(p.asset_id) && inDateRange(p.created_at, from, to)).map((p) => [codeById.get(p.asset_id)?.asset_id ?? "", codeById.get(p.asset_id)?.name ?? "", pretty(p.action), p.user_name ?? p.created_by, new Date(p.created_at).toLocaleString("en-IN")]) };
    return { register, service, transfers, warranty, prints };
  }, [assets, assetCodes, assetIds, data, from, to, hasFilters, warrantyDays, locName, empName]);

  const meta = (): ReportMeta => ({ organization: data.organization?.name ?? "Organization", generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
    filters: [category !== "all" && `Category: ${category}`, location !== "all" && `Location: ${location}`, status !== "all" && `Status: ${pretty(status)}`, from && `From: ${from}`, to && `To: ${to}`].filter(Boolean) as string[] });
  const run = (table: ReportTable, file: string, kind: "xlsx" | "csv") => {
    if (kind === "csv") { exportReportCsv(table, meta(), file); toast.success(`${table.title} CSV downloaded`); return; }
    exportReportXlsx([table], meta(), file).then(() => toast.success(`${table.title} Excel downloaded`)).catch(() => toast.error("Could not create the Excel file"));
  };

  const cards: Array<{ table: ReportTable; file: string; description: string; icon: ComponentType<{ className?: string }>; tone: keyof typeof toneClass; extra?: React.ReactNode }> = [
    { table: tables.register, file: "HBL-Asset360-Asset-Register", description: "All asset and ERP fields with value, custodian, QR prints and latest transfer.", icon: Boxes, tone: "primary" },
    { table: tables.service, file: "HBL-Asset360-Service-Requests", description: "Breakdown and service records with status, provider and dates.", icon: Wrench, tone: "warning" },
    { table: tables.transfers, file: "HBL-Asset360-Transfers", description: "Location and custodian movements with approval status.", icon: ArrowRightLeft, tone: "info" },
    { table: tables.warranty, file: `HBL-Asset360-Warranty-${warrantyDays}d`, description: "Assets whose warranty ends within the selected window.", icon: CalendarClock, tone: "destructive",
      extra: <Select value={warrantyDays} onValueChange={setWarrantyDays}><SelectTrigger className="mt-3 h-8 w-32" aria-label="Warranty window"><SelectValue /></SelectTrigger><SelectContent>{["30", "60", "90"].map((d) => <SelectItem key={d} value={d}>Next {d} days</SelectItem>)}</SelectContent></Select> },
    { table: tables.prints, file: "HBL-Asset360-QR-Print-History", description: "Every recorded QR print, PDF and PNG output per asset.", icon: QrCode, tone: "success" },
  ];

  return <div className="space-y-5 soft-enter">
    <section className="glass-panel rounded-2xl p-4 sm:p-5" aria-label="Report filters">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-sm font-bold">Report filters</h2><p className="text-xs text-muted-foreground">{assets.length} of {data.assets.length} assets match. Dates apply to records created in range.</p></div><Button variant="ghost" size="sm" onClick={reset} disabled={!hasFilters}><X className="size-4" />Reset</Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{data.categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={location} onValueChange={setLocation}><SelectTrigger aria-label="Filter by location"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{data.locations.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{pretty(s)}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
    </section>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ table, file, description, icon: Icon, tone, extra }) => <div key={file} className="glass-panel flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between"><div className={`grid size-10 place-items-center rounded-xl ${toneClass[tone]}`}><Icon className="size-5" /></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{table.rows.length} rows</span></div>
      <h2 className="mt-4 font-display font-bold">{table.title}</h2><p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>{extra}
      <div className="mt-5 flex gap-2"><Button size="sm" disabled={!table.rows.length} onClick={() => run(table, file, "xlsx")}><FileSpreadsheet className="size-4" />Excel</Button><Button size="sm" variant="outline" disabled={!table.rows.length} onClick={() => run(table, file, "csv")}><Download className="size-4" />CSV</Button></div>
    </div>)}</div>
  </div>;
}
