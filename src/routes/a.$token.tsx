import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarDays, CheckCircle2, CircleDollarSign, Factory, Settings2, ShieldCheck } from "lucide-react";
import { getPublicAsset } from "@/lib/asset360.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/a/$token")({
  loader: ({ params }) => getPublicAsset({ data: { token: params.token } }),
  head: () => ({ meta: [
    { title: "Verify Asset | Sharvi Asset360" },
    { name: "description", content: "Securely verify an asset registered with Sharvi Asset360." },
    { property: "og:title", content: "Verified Asset | Sharvi Asset360" },
    { property: "og:description", content: "Secure public asset identification." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: PublicAssetError,
  component: PublicAssetPage,
});

function PublicAssetPage() {
  const asset = Route.useLoaderData();
  if (!asset) return <PublicAssetError />;
  return <main className="app-backdrop grid min-h-screen place-items-center px-4 py-10">
    <section className="glass-panel w-full max-w-lg rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 border-b border-white/60 pb-5"><div className="grid size-11 place-items-center rounded-xl bg-primary font-display font-bold text-primary-foreground shadow-brand">A</div><div><p className="font-display font-bold">Sharvi Asset360</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Secure asset verification</p></div></div>
      <div className="py-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/10 text-success"><CheckCircle2 className="size-7"/></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-success">Registered asset</p><h1 className="mt-2 font-display text-2xl font-bold">{asset.asset_name}</h1><p className="mt-2 font-mono text-sm font-semibold text-primary">{asset.asset_id}</p></div>
      <div className="grid gap-3 rounded-xl bg-white/35 p-4 sm:grid-cols-2">
        <Info icon={Building2} label="Organization" value={asset.company || "Registered customer"}/>
        <Info icon={Factory} label="Plant" value={asset.plant || "—"}/>
        <Info icon={CircleDollarSign} label="Cost center" value={asset.cost_center || "—"}/>
        <Info icon={Settings2} label="Equipment" value={asset.equipment_model || "—"}/>
        <Info icon={CalendarDays} label="Capitalization year" value={asset.capitalization_year?.toString() || "—"}/>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success"/>Only approved public details are shown.</div>
    </section>
  </main>;
}
function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) { return <div className="flex min-w-0 items-center gap-3 rounded-lg bg-white/30 p-3"><Icon className="size-4 shrink-0 text-primary"/><div className="min-w-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-sm font-semibold">{value}</p></div></div>; }
function PublicAssetError(){return <main className="app-backdrop grid min-h-screen place-items-center px-4"><section className="glass-panel max-w-md rounded-2xl p-8 text-center"><ShieldCheck className="mx-auto size-10 text-destructive"/><h1 className="mt-4 font-display text-xl font-bold">Asset label not recognized</h1><p className="mt-2 text-sm text-muted-foreground">This QR code is invalid, inactive, or no longer available.</p><Button asChild className="mt-6"><Link to="/auth">Open Asset360</Link></Button></section></main>}