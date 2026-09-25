import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | Sharvi Asset360" },
    { name: "description", content: "Secure access to Sharvi Asset360 enterprise asset management." },
    { property: "og:title", content: "Sign in to Sharvi Asset360" },
    { property: "og:description", content: "Secure enterprise asset lifecycle management." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent"); setMode("sign-in"); return;
      }
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } } });
        if (error) throw error;
        if (!data.session) { toast.success("Check your email to confirm your account"); setMode("sign-in"); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      await navigate({ to: "/dashboard" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Sign in failed"); }
    finally { setLoading(false); }
  }

  async function signInGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } });
    if (result.error) { toast.error(result.error.message); setLoading(false); return; }
    if (!result.redirected) await navigate({ to: "/dashboard" });
  }

  return <main className="app-backdrop relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
    <div className="absolute left-8 top-8 flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-brand">A</div>
      <div><p className="font-display text-base font-bold leading-none">Sharvi Asset360</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Asset lifecycle control</p></div>
    </div>
    <section className="glass-panel soft-enter w-full max-w-md rounded-2xl p-6 sm:p-8">
      <div className="mb-7 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck /></div>
      <h1 className="font-display text-2xl font-bold">{mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your workspace" : "Reset your password"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{mode === "forgot" ? "We’ll email you a secure recovery link." : "Scan. Track. Verify. Manage every asset."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "sign-up" && <div><Label htmlFor="name">Full name</Label><Input id="name" className="mt-1.5 h-11 bg-glass-strong" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={100} required autoComplete="name" /></div>}
        <div><Label htmlFor="email">Email</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input id="email" className="h-11 bg-glass-strong pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" /></div></div>
        {mode !== "forgot" && <div><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label>{mode === "sign-in" && <button type="button" className="text-xs font-medium text-primary" onClick={() => setMode("forgot")}>Forgot password?</button>}</div><div className="relative mt-1.5"><LockKeyhole className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input id="password" className="h-11 bg-glass-strong pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} required autoComplete={mode === "sign-up" ? "new-password" : "current-password"}/></div></div>}
        <Button variant="hero" size="lg" className="w-full rounded-xl" disabled={loading}>{loading && <LoaderCircle className="animate-spin"/>}{mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}</Button>
      </form>
      {mode !== "forgot" && <><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div><Button variant="glass" size="lg" className="w-full rounded-xl" onClick={signInGoogle} disabled={loading}><span className="font-bold text-primary">G</span>Continue with Google</Button></>}
      <p className="mt-6 text-center text-sm text-muted-foreground">{mode === "sign-in" ? "New to Asset360?" : "Already have an account?"} <button className="font-semibold text-primary" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>{mode === "sign-in" ? "Create account" : "Sign in"}</button></p>
    </section>
  </main>;
}
