import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlantMultiSelect } from "@/components/asset360/shared/plant-multi-select";
import { Progress } from "@/components/ui/progress";
import { fetchSapData, getSapSettings, syncSapAssets } from "@/lib/sap-api.functions";
import { mapSapRows, SAP_SYNC_BATCH, type SapRow } from "@/lib/sap-asset-sync";
import type { SapDataResult } from "@/lib/sap-api";

type Phase = "idle" | "fetching" | "ready" | "syncing" | "done";

/** Pulls the ASSET QR API from SAP API Settings and saves rows into the asset register with QR codes. */
export function SapSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const load = useServerFn(getSapSettings); const run = useServerFn(fetchSapData); const sync = useServerFn(syncSapAssets);
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["sap-settings"], queryFn: () => load(), enabled: open });
  const endpoints = (settings.data?.endpoints ?? []).filter(e => e.active);
  const endpoint = endpoints.find(e => e.name.trim().toLowerCase() === "asset qr api") ?? endpoints.find(e => String((e as { path?: string }).path ?? "").includes("/asset/qr/report")) ?? endpoints.find(e => /asset\s*qr/i.test(e.name)) ?? endpoints[0];
  const [phase, setPhase] = useState<Phase>("idle"); const [rows, setRows] = useState<SapRow[]>([]);
  const [plantSel, setPlantSel] = useState<string[]>([]); const [done, setDone] = useState(0); const [totals, setTotals] = useState({ inserted: 0, updated: 0, skipped: 0 });
  const cancel = useRef(false);
  const plants = useMemo(() => Array.from(new Set(rows.map(r => String(r["WERKS"] ?? "").trim()).filter(Boolean))).sort(), [rows]);
  const selected = useMemo(() => mapSapRows(plantSel.length === 0 ? rows : rows.filter(r => plantSel.includes(String(r["WERKS"] ?? "").trim()))), [rows, plantSel]);

  async function fetchRows() {
    if (!endpoint) return; setPhase("fetching");
    try {
      const response = await run({ data: { endpointId: endpoint.id } });
      if (!response.ok) throw new Error("SAP results could not be loaded. Please try again.");
      const r: SapDataResult = await response.json();
      if (!r.ok) { toast.error(r.message); setPhase("idle"); return; }
      setRows(r.rows); setPhase("ready");
    }
    catch (e) { toast.error((e as Error).message); setPhase("idle"); }
  }
  async function start() {
    cancel.current = false; setPhase("syncing"); setDone(0); const t = { inserted: 0, updated: 0, skipped: 0 };
    try {
      for (let i = 0; i < selected.length && !cancel.current; i += SAP_SYNC_BATCH) {
        const r = await sync({ data: { rows: selected.slice(i, i + SAP_SYNC_BATCH) } });
        t.inserted += r.inserted; t.updated += r.updated; t.skipped += r.skipped; setTotals({ ...t }); setDone(Math.min(selected.length, i + SAP_SYNC_BATCH));
      }
      toast.success(`SAP sync ${cancel.current ? "stopped" : "finished"}: ${t.inserted} added, ${t.updated} updated`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setPhase("done"); void queryClient.invalidateQueries({ queryKey: ["workspace"] }); }
  }

  return <Dialog open={open} onOpenChange={v => { if (phase !== "syncing") onOpenChange(v); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Sync assets from SAP</DialogTitle><DialogDescription>New SAP assets are added with a QR code. Existing SAP assets are updated and keep their QR code. Manually added assets are never changed.</DialogDescription></DialogHeader>
      {settings.isLoading ? <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
        : !endpoint ? <p className="text-sm text-muted-foreground">No active SAP API. Add one in SAP API Settings.</p>
        : <div className="space-y-4">
          <p className="text-sm">Source: <b>{endpoint.name}</b></p>
          {(phase === "idle" || phase === "fetching") && <Button variant="hero" className="w-full" onClick={fetchRows} disabled={phase === "fetching"}>{phase === "fetching" ? <><LoaderCircle className="animate-spin" />Loading from SAP… this can take a minute</> : <><RefreshCw />Load assets from SAP</>}</Button>}
          {phase !== "idle" && phase !== "fetching" && <>
            <p className="text-sm text-muted-foreground">{rows.length.toLocaleString()} records received from SAP.</p>
            <PlantMultiSelect plants={plants} value={plantSel} onChange={setPlantSel} disabled={phase === "syncing"} prefix="Plant " />
            {phase !== "ready" && <div className="space-y-2"><Progress value={selected.length ? (done / selected.length) * 100 : 0} /><p className="text-xs text-muted-foreground">{done.toLocaleString()} of {selected.length.toLocaleString()} · {totals.inserted} added · {totals.updated} updated{totals.skipped ? ` · ${totals.skipped} skipped (ID used by a manual asset)` : ""}</p></div>}
            {phase === "syncing" ? <Button variant="outline" className="w-full" onClick={() => { cancel.current = true; }}>Stop after this batch</Button>
              : <Button variant="hero" className="w-full" onClick={start} disabled={!selected.length}>{phase === "done" ? "Sync again" : `Sync ${selected.length.toLocaleString()} assets`}</Button>}
          </>}
        </div>}
    </DialogContent>
  </Dialog>;
}
