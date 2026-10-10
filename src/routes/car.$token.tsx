import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, ShieldCheck, MessageSquare, CheckCircle2, LoaderCircle, Phone } from "lucide-react";
import { getPublicCar, submitCarMessage } from "@/lib/car.functions";
import { carDirectContact } from "@/lib/car-contact";
import { parkingReasons, carMessageSchema } from "@/lib/car-schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export const Route = createFileRoute("/car/$token")({
 loader: ({ params }) => getPublicCar({ data: { token: params.token } }),
 head: () => ({ meta: [{ title: "Car owner contact | QRmyCAR" }, { name: "description", content: "Contact a registered car owner by call, WhatsApp or parking message." }, { property: "og:title", content: "Car owner contact | QRmyCAR" }, { property: "og:description", content: "Car owner calls, WhatsApp and parking messages." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }]}),
 component: CarContact,
 errorComponent: CarUnavailable,
 notFoundComponent: CarUnavailable,
});
function CarContact() {
 const car = Route.useLoaderData(); const { token } = Route.useParams(); const submit = useServerFn(submitCarMessage);
 const [reason, setReason] = useState<keyof typeof parkingReasons>("wrong_parking"); const [details, setDetails] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
 if (!car) return <CarUnavailable/>;
 const contact = carDirectContact(car.owner_mobile, car.registration_number, reason, details);
 async function send(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); const form = new FormData(e.currentTarget); const parsed = carMessageSchema.safeParse({ token, reason, message: form.get("message") });
  if (!parsed.success) { setError("Check your parking message"); return; } setBusy(true); setError("");
  try { await submit({ data: parsed.data }); setSent(true); } catch(e) { setError(e instanceof Error ? e.message : "Message could not be submitted"); } finally { setBusy(false); }
 }
 return <main className="min-h-screen bg-background px-5 py-8"><section className="mx-auto max-w-lg"><header className="flex items-center justify-between border-b border-border pb-5"><div className="flex items-center gap-3"><CarFront className="size-8 text-primary"/><h1 className="font-display text-2xl font-bold">QRmyCAR</h1></div><ShieldCheck className="size-6 text-success"/></header><div className="py-8"><p className="text-sm text-muted-foreground">{car.make} {car.model} · {car.color}</p><h2 className="mt-3 break-words font-mono text-3xl font-bold">{car.registration_number}</h2><dl className="mt-7 grid gap-4 border-y border-border py-5"><div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-1 text-lg font-semibold">{car.owner_name}</dd></div><div><dt className="text-xs text-muted-foreground">Mobile</dt><dd className="mt-1 flex items-center gap-2 text-lg"><Phone className="size-4 text-primary"/>{car.mobile_masked}</dd></div></dl>{contact && <div className="mt-5 grid grid-cols-2 gap-3"><Button asChild><a href={contact.call}><Phone/>Call owner</a></Button><Button asChild variant="outline"><a href={contact.whatsapp} target="_blank" rel="noreferrer"><MessageSquare/>WhatsApp</a></Button></div>}<p className="mt-3 text-xs text-muted-foreground">Direct calls and WhatsApp reveal the owner’s full number.</p></div>{sent ? <div role="status" className="py-8 text-center"><CheckCircle2 className="mx-auto size-12 text-success"/><h2 className="mt-4 font-display text-xl font-bold">Parking message submitted</h2><p className="mt-3 text-sm text-muted-foreground">Your message is in the car's workspace inbox. No call or WhatsApp notification has been sent.</p></div> : <form onSubmit={send} className="space-y-5"><h2 className="font-display text-xl font-bold">Leave a parking message</h2><div className="space-y-2"><Label>Parking concern</Label><Select value={reason} onValueChange={value => { if (value in parkingReasons) setReason(value as keyof typeof parkingReasons); }} disabled={busy}><SelectTrigger aria-label="Parking concern" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(parkingReasons).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="parking-message">Details / parking location</Label><Textarea id="parking-message" name="message" value={details} onChange={e => setDetails(e.target.value)} rows={4} maxLength={1000} disabled={busy} placeholder="e.g. Your car is blocking the exit near Gate 2."/></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin"/> : <MessageSquare/>}{busy ? "Submitting…" : "Submit parking message"}</Button><p className="text-xs text-muted-foreground">Messages submitted here appear in the car's workspace inbox.</p></form>}<footer className="mt-10 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground"><ShieldCheck className="size-4"/>Number masked on this page · Direct contact enabled</footer></section></main>;
}
function CarUnavailable() { return <main className="grid min-h-screen place-items-center bg-background px-5"><div className="max-w-sm text-center"><CarFront className="mx-auto size-12 text-muted-foreground"/><h1 className="mt-4 font-display text-xl font-bold">Car label unavailable</h1><p className="mt-3 text-sm text-muted-foreground">This label is invalid or inactive.</p></div></main>; }
