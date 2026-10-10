import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importAssets } from "@/lib/asset360.functions";
import { downloadAssetTemplate, readAssetWorkbook, validateImportRows, type ImportRow } from "@/lib/asset-import";
import type { WorkspaceData } from "./workspace";

export function AssetImport({ data, onClose }: { data: WorkspaceData; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<number | null>(null);
  const save = useServerFn(importAssets); const client = useQueryClient();
  const invalid = rows.filter(row => row.errors.length).length;
  async function upload(file: File) {
    setBusy(true); setError(""); setRows([]); setCompleted(null); setFilename(file.name);
    try { setRows(validateImportRows(await readAssetWorkbook(file), data)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this Excel file"); }
    finally { setBusy(false); }
  }
  async function importRows() {
    if (!rows.length || invalid) return;
    setBusy(true); setError("");
    try {
      const values = rows.flatMap(row => row.data ? [row.data] : []);
      const result = await save({ data: { rows: values } });
      setCompleted(result.count); setRows([]);
      await client.invalidateQueries({ queryKey: ["workspace"] });
      toast.success(`${result.count} assets imported with QR labels`);
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed; no assets were saved"); }
    finally { setBusy(false); }
  }
  return <section className="soft-enter" aria-label="Excel asset import">
    <div className="flex flex-wrap justify-between gap-3 border-b border-glass-border pb-5"><Button variant="ghost" onClick={onClose} disabled={busy}><ArrowLeft />Back to assets</Button><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try {await downloadAssetTemplate(data);}catch {setError("Could not download the template");}finally {setBusy(false);}}}><Download />Download template</Button></div>
    {completed !== null ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto size-12 text-success"/><h2 className="mt-4 font-display text-xl font-bold">{completed} assets imported</h2><Button className="mt-6" onClick={onClose}>View asset master</Button></div> : <>
      <div className="flex flex-wrap items-center gap-5 border-b border-glass-border py-8"><FileSpreadsheet className="size-10 shrink-0 text-primary"/><div className="min-w-0 flex-1"><h2 className="font-display text-lg font-bold">Excel workbook</h2><p className="mt-1 break-all text-sm text-muted-foreground">{filename || ".xlsx · up to 500 assets · 20 MB"}</p></div><input ref={input} type="file" accept=".xlsx" aria-label="Upload assets Excel file" className="hidden" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value="";}}/><Button disabled={busy} onClick={()=>input.current?.click()}>{busy ? <LoaderCircle className="animate-spin"/> : <Upload/>}{filename ? "Choose another file" : "Choose Excel file"}</Button></div>
      {rows.length > 0 && <><div className="flex flex-wrap items-center justify-between gap-3 py-5"><h2 className="font-display font-bold">Import preview</h2><span className={`text-sm ${invalid ? "text-destructive" : "text-success"}`}>{rows.length - invalid} ready · {invalid} with errors</span></div><div className="max-h-[450px] overflow-auto rounded-md border border-glass-border"><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-background"><tr>{["Row", "Asset name", "Category", "Serial number", "Validation"].map(label=><th key={label} className="px-4 py-3 text-xs font-semibold text-muted-foreground">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.row} className="border-t border-glass-border"><td className="px-4 py-3">{row.row}</td><td className="px-4 py-3">{row.name || "—"}</td><td className="px-4 py-3">{row.category || "—"}</td><td className="px-4 py-3">{row.serial || "—"}</td><td className="max-w-80 px-4 py-3">{row.errors.length ? <ul className="space-y-1 text-xs text-destructive">{row.errors.map((error,i)=><li key={i}>{error}</li>)}</ul> : <span className="text-xs text-success">Ready</span>}</td></tr>)}</tbody></table></div></>}
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="hero" disabled={busy || !rows.length || invalid > 0} onClick={importRows}>{busy ? <LoaderCircle className="animate-spin"/> : <Upload/>}Import {rows.length || ""} assets</Button></div>
    </>}
  </section>;
}