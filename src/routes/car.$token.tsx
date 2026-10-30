import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, ShieldCheck, MessageSquare, CheckCircle2, LoaderCircle, MapPin, X, TriangleAlert, QrCode, Ambulance, Shield, Flame } from "lucide-react";
import { getPublicCar, submitCarMessage } from "@/lib/car.functions";
import { carMessageWithLocation, carLocationUrl, type CarLocation } from "@/lib/car-location";
import { parkingReasons, carMessageSchema } from "@/lib/car-schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export const Route = createFileRoute("/car/$token")({
 loader: ({ params }) => getPublicCar({ data: { token: params.token } }),
 head: () => ({ meta: [{ title: "Contact vehicle owner | QRmyCAR" }, { name: "description", content: "Report a parking issue or vehicle emergency and contact the registered owner." }, { property: "og:title", content: "Contact vehicle owner | QRmyCAR" }, { property: "og:description", content: "Contact a car owner, share a parking location or report a vehicle emergency." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }]}),
 component: CarContact, errorComponent: CarUnavailable, notFoundComponent: CarUnavailable,
});
function CarContact() {
 const car = Route.useLoaderData(); const { token } = Route.useParams(); const submit = useServerFn(submitCarMessage);
 const [location, setLocation] = useState<CarLocation | null>(null); const [locating, setLocating] = useState(false); const [locationError, setLocationError] = useState("");
 const [reason, setReason] = useState<keyof typeof parkingReasons>("wrong_parking"); const [details, setDetails] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
 if (!car) return <CarUnavailable/>;
 async function send(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); const parsed = carMessageSchema.safeParse({ token, reason, message: carMessageWithLocation(details, location) });
  if (!parsed.success) { setError("Keep the message and shared location within 1,000 characters"); return; } setBusy(true); setError("");
  try { await submit({ data: parsed.data }); setSent(true); } catch(e) { setError(e instanceof Error ? e.message : "Message could not be submitted"); } finally { setBusy(false); }
 }
 function shareLocation() {
  if (!navigator.geolocation) { setLocationError("Location sharing is unavailable in this browser"); return; }
  setLocating(true); setLocationError("");
  navigator.geolocation.getCurrentPosition(position => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocating(false); }, () => { setLocating(false); setLocationError("Location was not shared. You can type the parking location instead."); }, { timeout: 10000, maximumAge: 60000 });
 }
 return <main className="car-public min-h-screen bg-background text-foreground">
  <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-4"><div><h1 className="flex items-center gap-2 font-display text-xl font-bold"><span className="flex size-9 items-center justify-center rounded-md bg-foreground text-primary-foreground"><QrCode className="size-6"/></span>HBL QRmyAssets</h1><p className="mt-1 text-xs text-muted-foreground">QRmyCAR · Private vehicle contact</p></div><ShieldCheck className="size-5 shrink-0 text-primary" aria-label="Private car contact"/></div></header>
  <div className="mx-auto max-w-lg px-4 py-6 sm:px-5">
   <section className="border-b border-border bg-card">
    <div className="car-contact-banner px-5 py-5 text-primary-foreground"><h2 className="text-lg font-bold">CONTACT OWNER</h2><p className="mt-2 break-words font-semibold">{car.make} {car.model}</p><p className="mt-1 break-all font-mono text-sm">{car.registration_number}</p></div>
    <div className="flex flex-wrap justify-between gap-3 border-b border-border px-5 py-4"><div><p className="text-xs text-muted-foreground">Owner</p><p className="break-words text-sm font-semibold">{car.owner_name}</p></div><p className="flex items-center gap-2 text-xs text-primary"><ShieldCheck className="size-4"/>Phone numbers stay private</p></div>
    {sent ? <div role="status" className="px-5 py-7"><CheckCircle2 className="size-10 text-primary"/><h2 className="mt-4 text-xl font-bold">Message submitted privately</h2><p className="mt-2 text-sm text-muted-foreground">HBL QRmyAssets has saved your {reason === "emergency" ? "emergency report" : "parking message"} in the vehicle’s workspace inbox. No phone number has been exchanged.</p><p className="mt-3 text-sm text-muted-foreground">WhatsApp delivery through HBL is not connected yet. This submission has not sent a WhatsApp notification.</p><Button type="button" variant="outline" className="mt-5" onClick={() => { setSent(false); setDetails(""); setLocation(null); }}>Send another message</Button></div> : <form onSubmit={send} className="space-y-4 px-5 py-5">
     <p className="text-sm font-medium">Please specify the reason to contact the car owner</p>
     <RadioGroup aria-label="Contact reason" value={reason === "emergency" ? "emergency" : "parking"} onValueChange={value => setReason(value === "emergency" ? "emergency" : "wrong_parking")} disabled={busy} className="gap-3">
      <Label htmlFor="parking-issue" className="flex cursor-pointer items-center gap-3 rounded-md bg-muted px-3 py-4 leading-5"><RadioGroupItem id="parking-issue" value="parking"/><span><strong>Parking issue</strong> — Double parking, blocked driveways, or other parking concerns.</span></Label>
      <Label htmlFor="vehicle-emergency" className="flex cursor-pointer items-center gap-3 rounded-md bg-muted px-3 py-4 leading-5"><RadioGroupItem id="vehicle-emergency" value="emergency"/><span><strong>Accident / emergency</strong> — Report an accident or vehicle emergency.</span></Label>
     </RadioGroup>
     {reason === "emergency" ? <p role="note" className="border-l-2 border-destructive pl-3 text-xs text-destructive">For immediate danger, call emergency services. A parking report does not dispatch assistance.</p> : <div className="space-y-2"><Label>Parking concern</Label><Select value={reason} onValueChange={value => { if (value in parkingReasons) setReason(value as keyof typeof parkingReasons); }} disabled={busy}><SelectTrigger aria-label="Parking concern" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(parkingReasons).filter(([key]) => key !== "emergency").map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div>}
     <div className="space-y-2"><Label htmlFor="parking-message">Message / parking location</Label><Textarea id="parking-message" value={details} onChange={e => setDetails(e.target.value)} rows={3} maxLength={1000} disabled={busy} placeholder="Your car is blocking the exit near Gate 2."/></div>
     <div>{location ? <div className="flex items-center justify-between gap-3"><Button asChild variant="outline"><a href={carLocationUrl(location)} target="_blank" rel="noreferrer"><MapPin/>Shared location</a></Button><Button type="button" variant="ghost" size="icon" aria-label="Remove shared location" title="Remove location" disabled={busy} onClick={() => setLocation(null)}><X/></Button></div> : <Button type="button" variant="ghost" className="px-0 text-primary" disabled={busy || locating} onClick={shareLocation}>{locating ? <LoaderCircle className="animate-spin"/> : <MapPin/>}{locating ? "Getting location…" : "Share my location"}</Button>}{locationError && <p role="alert" className="mt-2 text-xs text-destructive">{locationError}</p>}</div>
     {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
     <Button type="submit" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin"/> : <MessageSquare/>}{busy ? "Submitting…" : "Send privately through HBL"}</Button>
    </form>}
    <div className="border-t border-border bg-muted px-5 py-3 text-xs leading-5 text-muted-foreground">Communication goes through HBL QRmyAssets. Your phone number is not requested or shared with the owner. Please do not include phone numbers in your message.</div>
   </section>
   <section className="mt-6 border-y border-border bg-card px-5 py-5"><h2 className="flex items-center gap-2 text-xs font-bold"><TriangleAlert className="size-4 text-destructive"/>EMERGENCY SERVICES · INDIA</h2><div className="mt-4 grid grid-cols-3 gap-3">{[{ label: "Ambulance", icon: Ambulance, tone: "text-destructive bg-destructive/5" }, { label: "Police", icon: Shield, tone: "text-info bg-info/5" }, { label: "Fire", icon: Flame, tone: "text-warning bg-warning/5" }].map(({ label, icon: Icon, tone }) => <Button key={label} asChild variant="ghost" className={`h-24 flex-col gap-2 whitespace-normal ${tone}`}><a href="tel:112" aria-label={`${label} — call 112 in India`}><Icon className="size-6"/><span className="text-xs">{label}</span><span className="text-xs">112</span></a></Button>)}</div><p className="mt-3 text-xs text-muted-foreground">India’s unified emergency helpline. Outside India, use your local emergency number.</p></section>
   <footer className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"><ShieldCheck className="size-4"/>QRmyCAR · Vehicle owner contact</footer>
  </div>
 </main>;
}
function CarUnavailable() { return <main className="grid min-h-screen place-items-center bg-background px-5"><div className="max-w-sm text-center"><CarFront className="mx-auto size-12 text-muted-foreground"/><h1 className="mt-4 font-display text-xl font-bold">Car label unavailable</h1><p className="mt-3 text-sm text-muted-foreground">This label is invalid or inactive.</p></div></main>; }
