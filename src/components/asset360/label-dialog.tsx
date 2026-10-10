import { useEffect, useState } from "react";
import { Download, LoaderCircle, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildLabelsPdf, labelQr, labelSizes, type LabelAsset, type LabelSize } from "@/lib/asset-labels";

export function LabelDialog({ open, onOpenChange, assets, organization }: { open: boolean; onOpenChange: (value: boolean) => void; assets: LabelAsset[]; organization: string }) {
  const [size, setSize] = useState<LabelSize>("standard");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = assets.filter(asset => asset.asset_qr_codes?.token);
  const first = ready[0];
  useEffect(() => {
    let cancelled = false; setPreview("");
    if (open && first) labelQr(first).then(value => { if (!cancelled) setPreview(value); }).catch(() => toast.error("Could not prepare QR preview"));
    return () => { cancelled = true; };
  }, [open, first]);
  async function exportLabels(print: boolean) {
    // Reserve a window synchronously so browsers do not block the print action.
    const printWindow = print ? window.open("", "_blank") : null;
    if (print && !printWindow) { toast.error("Allow pop-ups to open the printable labels, or download the PDF."); return; }
    if (printWindow) printWindow.opener = null;
    setBusy(true);
    try {
      const pdf = await buildLabelsPdf(ready, size, organization);
      if (printWindow) {
        pdf.autoPrint();
        const url = URL.createObjectURL(pdf.output("blob"));
        printWindow.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), 300000);
      } else pdf.save("Sharvi-Asset360-QR-Labels.pdf");
    } catch (error) { printWindow?.close(); toast.error(error instanceof Error ? error.message : "Could not prepare labels"); }
    finally { setBusy(false); }
  }
  async function downloadPng() {
    if (!first) return;
    try { const link = document.createElement("a"); link.href = await labelQr(first); link.download = `${first.asset_id}-qr.png`; link.click(); }
    catch { toast.error("Could not download QR code"); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>QR labels</DialogTitle></DialogHeader>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{ready.length} {ready.length === 1 ? "asset" : "assets"} selected</p><Select value={size} onValueChange={value => setSize(value as LabelSize)}><SelectTrigger className="w-full sm:w-60" aria-label="Label size"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labelSizes).map(([key, value]) => <SelectItem key={key} value={key}>{value.name}</SelectItem>)}</SelectContent></Select></div>
    {assets.length !== ready.length && <p role="status" className="text-sm text-warning">{assets.length - ready.length} assets have no QR token and will not be included.</p>}
    {first ? <div className="rounded-lg border border-auth-border bg-auth-surface p-5"><div className="flex flex-col items-center gap-4 sm:flex-row">{preview ? <img src={preview} alt={`QR code for ${first.asset_id}`} width={180} height={180} className="size-44 shrink-0"/> : <div className="grid size-44 shrink-0 place-items-center"><LoaderCircle className="animate-spin"/></div>}<div className="min-w-0 text-sm"><p className="font-mono font-bold text-primary break-all">{first.asset_id}</p><p className="mt-1 break-words font-semibold">{first.name}</p><p className="mt-3 break-words text-muted-foreground">{organization}</p>{first.plant && <p className="mt-1 break-words">Plant: {first.plant}</p>}{first.company_code && <p className="mt-1">Company: {first.company_code}</p>}{first.capitalization_date && <p className="mt-1">Capitalization year: {first.capitalization_date.slice(0, 4)}</p>}</div></div></div> : <div className="py-10 text-center text-muted-foreground"><QrCode className="mx-auto mb-3"/>No QR labels available for this selection.</div>}
    <div className="flex flex-wrap justify-end gap-2">{ready.length === 1 && <Button variant="outline" onClick={downloadPng} disabled={busy}><Download/>QR PNG</Button>}<Button variant="outline" onClick={() => exportLabels(false)} disabled={busy || !ready.length}><Download/>Download PDF</Button><Button onClick={() => exportLabels(true)} disabled={busy || !ready.length}>{busy ? <LoaderCircle className="animate-spin"/> : <Printer/>}Print labels</Button></div>
  </DialogContent></Dialog>;
}