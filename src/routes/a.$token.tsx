import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Factory, Settings2, ShieldCheck, Wrench, FileText, LoaderCircle, Camera } from "lucide-react";
import { getPublicAsset } from "@/lib/asset360.functions";
import { submitBreakdown } from "@/lib/breakdown.functions";
import { breakdownSchema, MAX_BREAKDOWN_PHOTO_BYTES } from "@/lib/breakdown-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/a/$token")({
  loader: ({ params }) => getPublicAsset({ data: { token: params.token } }),
  head: () => ({ meta: [
    { title: "Asset Digital Profile | Sharvi Asset360" },
    { name: "description", content: "View registered equipment details or report an equipment breakdown with a photo." },
    { property: "og:title", content: "Asset Digital Profile | Sharvi Asset360" },
    { property: "og:description", content: "Registered asset details and equipment breakdown reporting." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: PublicAssetError,
  component: PublicAssetPage,
});

function PublicAssetPage() {
  const asset = Route.useLoaderData();
  const { token } = Route.useParams();
  const [choiceOpen, setChoiceOpen] = useState(true);
  const [mode, setMode] = useState<"details" | "breakdown">("details");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const submit = useServerFn(submitBreakdown);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("token", token);
    const result = breakdownSchema.safeParse({token, title:form.get("title"), details:form.get("details")});
    if (!result.success) {setError(result.error.issues[0]?.message ?? "Check the report details"); return;}
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {setError("Add a photo of the breakdown"); return;}
    if (photo.size > MAX_BREAKDOWN_PHOTO_BYTES) {setError("Choose a photo smaller than 5 MB"); return;}
    setBusy(true);setError("");
    try {const saved = await submit({data:form});setRequestId(saved.requestId);}
    catch (e) {setError(e instanceof Error ? e.message : "Report could not be saved. Please retry");}
    finally {setBusy(false);}
  }
  if (!asset) return <PublicAssetError />;
  return <main className="app-backdrop min-h-screen px-4 py-8 sm:py-12">
    <section className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-3 border-b border-border pb-5"><div className="grid size-11 place-items-center rounded-lg bg-primary font-display font-bold text-primary-foreground shadow-brand">A</div><div><p className="font-display font-bold">Sharvi Asset360</p><p className="text-xs text-muted-foreground">Asset digital profile</p></div></div>
      <div className="py-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/10 text-success"><CheckCircle2 className="size-7"/></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-success">Registered asset</p><h1 className="mt-2 font-display text-2xl font-bold">{asset.asset_name}</h1><p className="mt-2 font-mono text-sm font-semibold text-primary">{asset.asset_id}</p></div>
      <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-2">
        <Info icon={Building2} label="Organization" value={asset.company || "Registered customer"}/>
        <Info icon={Factory} label="Plant code" value={asset.plant || "—"}/>
        <Info icon={CircleDollarSign} label="Cost center" value={asset.cost_center || "—"}/>
        <Info icon={Settings2} label="Equipment" value={asset.equipment_model || "—"}/>
        <Info icon={CalendarDays} label="Acquisition date" value={formatDate(asset.acquisition_date)}/>
      </div>
      {requestId ? <div className="py-8 text-center" role="status"><CheckCircle2 className="mx-auto size-10 text-success"/><h2 className="mt-4 font-display text-xl font-bold">Service request submitted</h2><p className="mt-2 text-sm text-muted-foreground">Your breakdown report and photo have been sent to the asset’s service team.</p><p className="mt-3 break-all font-mono text-xs">Reference: {requestId}</p><Button variant="outline" className="mt-5" onClick={()=>{setRequestId(null);setMode("details");setPhotoPreview(null)}}>Asset details</Button></div> : mode === "breakdown" ? <form onSubmit={onSubmit} className="space-y-5 py-6">
        <Button type="button" variant="ghost" disabled={busy} onClick={()=>setMode("details")}><ArrowLeft className="size-4"/>Asset details</Button>
        <h2 className="font-display text-xl font-bold">Log service / breakdown</h2>
        <div className="space-y-2"><Label htmlFor="breakdown-title">Breakdown summary</Label><Input id="breakdown-title" name="title" placeholder="e.g. Equipment will not start" required minLength={3} maxLength={160} disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="breakdown-details">Breakdown details</Label><Textarea id="breakdown-details" name="details" placeholder="Describe the fault and what happened" rows={5} required minLength={10} maxLength={2000} disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="breakdown-photo" className="flex items-center gap-2"><Camera className="size-4"/>Breakdown photo</Label><Input id="breakdown-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} onChange={e=>{const file=e.target.files?.[0];setError(""); if(photoPreview) URL.revokeObjectURL(photoPreview);setPhotoPreview(null);if(file){if(file.size>MAX_BREAKDOWN_PHOTO_BYTES){e.target.value="";setError("Choose a photo smaller than 5 MB");}else setPhotoPreview(URL.createObjectURL(file));}}}/><p className="text-xs text-muted-foreground">JPEG, PNG or WebP · Up to 5 MB</p>{photoPreview && <img src={photoPreview} alt="Selected breakdown photo" className="max-h-60 w-full rounded-lg object-contain bg-muted"/>}</div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <Wrench className="size-4"/>}{busy ? "Submitting…" : "Submit service request"}</Button>
      </form> : <Button className="mt-6 w-full" onClick={()=>{setMode("breakdown");setError("")}}><Wrench className="size-4"/>Log service / breakdown</Button>}
    </section>
    <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Asset digital profile</DialogTitle><DialogDescription>{asset.asset_name} · {asset.asset_id}</DialogDescription></DialogHeader><div className="grid gap-3 pt-2"><Button size="lg" variant="outline" onClick={()=>{setMode("details");setChoiceOpen(false)}}><FileText className="size-5"/>View asset details</Button><Button size="lg" onClick={()=>{setMode("breakdown");setError("");setChoiceOpen(false)}}><Wrench className="size-5"/>Log service / breakdown</Button></div></DialogContent></Dialog>
  </main>;
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) { return <div className="flex min-w-0 items-center gap-3 py-2"><Icon className="size-4 shrink-0 text-primary"/><div className="min-w-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-sm font-semibold">{value}</p></div></div>; }
function PublicAssetError(){return <main className="app-backdrop grid min-h-screen place-items-center px-4"><section className="glass-panel max-w-md rounded-2xl p-8 text-center"><ShieldCheck className="mx-auto size-10 text-destructive"/><h1 className="mt-4 font-display text-xl font-bold">Asset label not recognized</h1><p className="mt-2 text-sm text-muted-foreground">This QR code is invalid, inactive, or no longer available.</p><Button asChild className="mt-6"><Link to="/auth">Open Asset360</Link></Button></section></main>}