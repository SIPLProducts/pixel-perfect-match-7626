import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateServiceRequest } from "@/lib/service-request.functions";
import { serviceRequestSchema, serviceStatuses } from "@/lib/service-request-schema";
import type { WorkspaceData } from "./workspace";

type Request = WorkspaceData["maintenance"][number];
export function ServiceRequestForm({ request, onDone, onCancel, onSavingChange }: {
  request: Request; onDone: () => void; onCancel: () => void; onSavingChange: (saving: boolean) => void;
}) {
  const [values, setValues] = useState({
    title: request.title, status: request.status, remarks: request.remarks ?? "",
    serviceProvider: request.service_provider ?? "", technician: request.technician ?? "",
    partsUsed: request.parts_used ?? "", cost: String(request.cost),
    startDate: request.start_date ?? "", completionDate: request.completion_date ?? "",
    nextMaintenanceDate: request.next_maintenance_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const saveRequest = useServerFn(updateServiceRequest);
  const queryClient = useQueryClient();
  function change(key: keyof typeof values, value: string) {
    setValues(current => ({ ...current, [key]: value })); setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const parsed = serviceRequestSchema.safeParse({ ...values, cost: values.cost.trim() ? Number(values.cost) : NaN, requestId: request.id, expectedUpdatedAt: request.updated_at });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the request details"); return; }
    busy.current = true; setSaving(true); onSavingChange(true); setError("");
    try {
      await saveRequest({ data: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Service request updated"); onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the service request");
      void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    } finally { busy.current = false; setSaving(false); onSavingChange(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <fieldset disabled={saving} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="service-title">Request title *</Label><Input id="service-title" value={values.title} onChange={e => change("title", e.target.value)} required minLength={3} maxLength={160}/></div>
      <div className="space-y-2"><Label htmlFor="service-status">Status</Label><Select value={values.status} onValueChange={v => change("status", v)} disabled={saving}><SelectTrigger id="service-status" aria-label="Service status" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{serviceStatuses.map(status => <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="service-details">Service / breakdown details</Label><Textarea id="service-details" rows={4} value={values.remarks} maxLength={2000} onChange={e => change("remarks", e.target.value)}/></div>
      <div className="grid gap-4 sm:grid-cols-2">{([ ["serviceProvider", "Service provider"], ["technician", "Technician"] ] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`service-${key}`}>{label}</Label><Input id={`service-${key}`} value={values[key]} maxLength={160} onChange={e => change(key, e.target.value)}/></div>)}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="service-cost">Recorded cost (INR)</Label><Input id="service-cost" type="number" min={0} max={999999999999} step="0.01" required value={values.cost} onChange={e => change("cost", e.target.value)}/></div>
        {([ ["startDate", "Service start date"], ["completionDate", "Completion date"], ["nextMaintenanceDate", "Next maintenance date"] ] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`service-${key}`}>{label}</Label><Input id={`service-${key}`} type="date" value={values[key]} onChange={e => change(key, e.target.value)}/></div>)}
      </div>
      <div className="space-y-2"><Label htmlFor="service-parts">Parts used / work performed</Label><Textarea id="service-parts" rows={3} value={values.partsUsed} maxLength={2000} onChange={e => change("partsUsed", e.target.value)}/></div>
    </fieldset>
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}><X className="size-4"/>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin"/> : <Save className="size-4"/>}{saving ? "Saving…" : "Save changes"}</Button></div>
  </form>;
}