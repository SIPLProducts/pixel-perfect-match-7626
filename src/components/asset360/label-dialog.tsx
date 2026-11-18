import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Download, LoaderCircle, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildLabelsPdf, buildLabelsPrintDocument, labelQr, labelSizes, printLabelsInFrame, type LabelAsset, type LabelSize } from "@/lib/asset-labels";
import { recordQrPrints } from "@/lib/asset360.functions";
import { deliverTrackedLabels } from "@/lib/qr-print-tracking";

export function LabelDialog({ open, onOpenChange, assets, organization }: { open: boolean; onOpenChange: (value: boolean) => void; assets: LabelAsset[]; organization: string }) {
  const [size, setSize] = useState<LabelSize>("standard");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const inProgress = useRef(false);
  const record = useServerFn(recordQrPrints);
  const queryClient = useQueryClient();
  const ready = assets.filter(asset => asset.asset_qr_codes?.token);
  const first = ready[0];
  useEffect(() => {
    let cancelled = false; setPreview("");
    if (open && first) labelQr(first).then(value => { if (!cancelled) setPreview(value); }).catch(() => toast.error("Could not prepare QR preview"));
    return () => { cancelled = true; };
  }, [open, first]);
  async function exportLabels(print: boolean) {
    if (inProgress.current || !ready.length) return;
    if (ready.length > 500) { toast.error("Select up to 500 assets per label batch."); return; }
    inProgress.current = true; setBusy(true);
    try {
      const operationId = crypto.randomUUID();
      await deliverTrackedLabels(async () => {
        if (print) {
          const html = await buildLabelsPrintDocument(ready, size, organization);
          await printLabelsInFrame(html);
        } else {
          const pdf = await buildLabelsPdf(ready, size, organization);
          await pdf.save("HBL-Asset360-QR-Labels.pdf", { returnPromise: true });
        }
      }, () => record({ data: { operationId, assetIds: ready.map(asset => asset.id), action: print ? "print" : "pdf" } }));
      void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not prepare labels"); }
    finally { inProgress.current = false; setBusy(false); }
  }
  async function downloadPng() {
    if (!first || inProgress.current) return;
    inProgress.current = true; setBusy(true);
    try {
      const link = document.createElement("a"); link.href = await labelQr(first); link.download = `${first.asset_id}-qr.png`;
      const operationId = crypto.randomUUID();
      await deliverTrackedLabels(() => link.click(), () => record({ data: { operationId, assetIds: [first.id], action: "png" } }));
      void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not download QR code"); }
    finally { inProgress.current = false; setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>QR labels</DialogTitle></DialogHeader>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{ready.length} {ready.length === 1 ? "asset" : "assets"} selected</p><Select value={size} onValueChange={value => setSize(value as LabelSize)}><SelectTrigger className="w-full sm:w-60" aria-label="Label size"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labelSizes).map(([key, value]) => <SelectItem key={key} value={key}>{value.name}</SelectItem>)}</SelectContent></Select></div>
    {assets.length !== ready.length && <p role="status" className="text-sm text-warning">{assets.length - ready.length} assets have no QR token and will not be included.</p>}
    {first ? <div className="rounded-lg border border-auth-border bg-auth-surface p-5"><div className="flex flex-col items-center gap-4 sm:flex-row">{preview ? <img src={preview} alt={`QR code for ${first.asset_id}`} width={180} height={180} className="size-44 shrink-0"/> : <div className="grid size-44 shrink-0 place-items-center"><LoaderCircle className="animate-spin"/></div>}<div className="min-w-0 text-sm"><p className="font-mono font-bold text-primary break-all">{first.asset_id}</p><p className="mt-1 break-words font-semibold">{first.name}</p><p className="mt-3 break-words text-muted-foreground">{organization}</p>{first.plant && <p className="mt-1 break-words">Plant: {first.plant}</p>}{first.company_code && <p className="mt-1">Company: {first.company_code}</p>}{first.capitalization_date && <p className="mt-1">Capitalization year: {first.capitalization_date.slice(0, 4)}</p>}</div></div></div> : <div className="py-10 text-center text-muted-foreground"><QrCode className="mx-auto mb-3"/>No QR labels available for this selection.</div>}
    <div className="flex flex-wrap justify-end gap-2">{ready.length === 1 && <Button variant="outline" onClick={downloadPng} disabled={busy}><Download/>QR PNG</Button>}<Button variant="outline" onClick={() => exportLabels(false)} disabled={busy || !ready.length}><Download/>Download PDF</Button><Button onClick={() => exportLabels(true)} disabled={busy || !ready.length}>{busy ? <LoaderCircle className="animate-spin"/> : <Printer/>}Print labels</Button></div>
  </DialogContent></Dialog>;
}