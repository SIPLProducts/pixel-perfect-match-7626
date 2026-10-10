import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import campusImage from "@/assets/enterprise-campus.jpg";

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
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  function changeMode(next: typeof mode) {
    setMode(next); setErrorMessage(""); setNotice(""); setPassword(""); setShowPassword(false); setCapsLock(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setErrorMessage(""); setNotice("");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setNotice("If an account exists for this email, you’ll receive a password reset link shortly."); return;
      }
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } } });
        if (error) throw error;
        if (!data.session) { setNotice("Check your email to confirm your account before signing in."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      await navigate({ to: "/dashboard" });
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Sign in failed. Please try again."); }
    finally { setLoading(false); }
  }

  async function signInGoogle() {
    setLoading(true); setErrorMessage("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/dashboard" });
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed. Please try again."); }
    finally { setLoading(false); }
  }

  return <main className="grid min-h-svh bg-auth-surface lg:grid-cols-[1.05fr_1fr]">
    <div className="flex min-w-0 flex-col px-6 py-7 sm:px-12 lg:px-16 lg:py-10">
      <header className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-lg" />
        <div><p className="font-display text-lg font-bold">Sharvi Asset360</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Enterprise asset management</p></div>
      </header>
      <section className="soft-enter mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12 lg:py-16" aria-labelledby="auth-title">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><span className="h-px w-6 bg-primary"/>Workspace access</div>
        <h1 id="auth-title" className="font-display text-3xl font-bold sm:text-4xl">{mode === "sign-in" ? "Welcome back." : mode === "sign-up" ? "Create your account." : "Forgot your password?"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "sign-in" ? "Sign in to your Sharvi Asset360 workspace." : mode === "sign-up" ? "Start with your name and work email." : "Enter your account email to receive a recovery link."}</p>
        {notice && <div role="status" className="mt-6 flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-success"/>{notice}</div>}
        {errorMessage && <div role="alert" className="mt-6 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{errorMessage}</div>}
        <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={loading}>
          <fieldset disabled={loading} className="space-y-5">
            {mode === "sign-up" && <div><Label htmlFor="name">Full name</Label><Input id="name" className="mt-2 h-12 border-auth-border bg-auth-surface" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} minLength={2} maxLength={100} required autoComplete="name" /></div>}
            <div><Label htmlFor="email">Email address</Label><div className="relative mt-2"><Mail className="absolute left-3.5 top-4 size-4 text-muted-foreground"/><Input id="email" className="h-12 border-auth-border bg-auth-surface pl-10" placeholder="you@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} required autoComplete="email" spellCheck={false} autoCapitalize="none" /></div></div>
            {mode !== "forgot" && <div><div className="flex items-center justify-between gap-2"><Label htmlFor="password">Password</Label>{mode === "sign-in" && <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => changeMode("forgot")}>Forgot password?</Button>}</div><div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-4 size-4 text-muted-foreground"/><Input id="password" className="h-12 border-auth-border bg-auth-surface pl-10 pr-12" placeholder={mode === "sign-up" ? "At least 8 characters" : "Enter your password"} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyUp={e => setCapsLock(e.getModifierState("CapsLock"))} onKeyDown={e => setCapsLock(e.getModifierState("CapsLock"))} minLength={8} maxLength={72} required autoComplete={mode === "sign-up" ? "new-password" : "current-password"}/><Button type="button" size="icon" variant="ghost" className="absolute right-1.5 top-1.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div>{capsLock && <p className="mt-2 text-xs text-warning" role="status">Caps Lock is on.</p>}</div>}
            <Button size="lg" className="h-12 w-full justify-between px-5" disabled={loading}><span>{mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send recovery link"}</span>{loading ? <LoaderCircle className="animate-spin"/> : <ArrowRight/>}</Button>
          </fieldset>
        </form>
        {mode !== "forgot" && <><div className="my-6 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-auth-border"/>or continue with<span className="h-px flex-1 bg-auth-border"/></div><Button variant="outline" size="lg" className="h-12 w-full gap-3 border-auth-border bg-auth-surface" onClick={signInGoogle} disabled={loading}><span aria-hidden="true" className="text-lg font-bold">G</span>Google</Button></>}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">{mode === "sign-in" ? "New to Asset360?" : mode === "sign-up" ? "Already have an account?" : ""}<Button variant="link" className="h-auto gap-2 px-1 py-1 font-semibold" disabled={loading} onClick={() => changeMode(mode === "sign-in" ? "sign-up" : "sign-in")}>{mode === "forgot" && <ArrowLeft/>}{mode === "sign-in" ? "Create an account" : mode === "forgot" ? "Back to sign in" : "Sign in"}</Button></div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-auth-border pt-5 text-[11px] text-muted-foreground"><span>© {new Date().getFullYear()} Sharvi Infotech</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5"/>Secure workspace access</span></footer>
    </div>
    <aside className="relative hidden min-h-svh overflow-hidden lg:block" aria-label="Sharvi Asset360 enterprise campus illustration">
      <img src={campusImage} alt="Illustrative modern enterprise campus with landscaped grounds" width={1024} height={1536} className="absolute inset-0 h-full w-full object-cover" />
      <div className="auth-photo-overlay absolute inset-0"/>
      <div className="relative flex h-full min-h-svh flex-col justify-between p-12 text-auth-photo-text">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"><ShieldCheck className="size-4"/>Sharvi Infotech</div>
        <div className="max-w-md pb-4"><p className="mb-4 text-xs font-medium uppercase tracking-[0.16em]">Connected operations</p><h2 className="font-display text-4xl font-semibold leading-tight">Sharvi Asset360</h2><p className="mt-4 max-w-sm text-lg leading-7 text-auth-photo-text/85">Every asset. Every location.<br/>One connected workspace.</p><div className="mt-8 flex gap-6 border-t border-auth-photo-text/25 pt-6 text-xs text-auth-photo-text/80"><span>Scan.</span><span>Track.</span><span>Verify.</span></div></div>
      </div>
    </aside>
  </main>;
}
