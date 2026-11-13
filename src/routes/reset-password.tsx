import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { canSetPassword, parseAuthLink, type AuthLink } from "@/lib/auth-link";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";
import { firstLoginPasswordSchema, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/user-management";
import { completeFirstLoginPassword, passwordChangeStatus } from "@/lib/user-management.functions";

// Snapshot the link before the auth client consumes and clears the URL hash.
const initialLink: AuthLink | null = typeof window !== "undefined" ? parseAuthLink(window.location.hash, window.location.search) : null;

export const Route = createFileRoute("/reset-password")({
 head: () => ({ meta: [{ title: "Reset password | HBL Asset360" },{ name: "description", content: "Set a new password for your HBL Asset360 account." },{ property: "og:title", content: "Reset HBL Asset360 password" },{ property: "og:description", content: "Secure account recovery." },{ property: "og:type", content: "website" },{ name: "twitter:card", content: "summary" }] }),
 component: ResetPassword,
});

function ResetPassword(){
 const navigate=useNavigate();
 const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false);
 const [link,setLink]=useState<AuthLink>({kind:null,error:null});
 const [state,setState]=useState<"checking"|"ready"|"invalid">("checking");
 const [firstLogin,setFirstLogin]=useState(false); const [confirm,setConfirm]=useState(""); const [show,setShow]=useState(false);
 const statusFn=useServerFn(passwordChangeStatus); const completeFn=useServerFn(completeFirstLoginPassword);

 useEffect(()=>{
  const current=parseAuthLink(window.location.hash, window.location.search);
  const l=current.kind||current.error||!initialLink ? current : initialLink; setLink(l);
  if(!l.error&&!l.kind){
   // No email link: this is the first-login change for an administrator-created account.
   void (async()=>{const {data}=await supabase.auth.getUser(); if(!data.user){setState("invalid");return;} try{const r=await statusFn(); if(r.required){setFirstLogin(true);setState("ready");} else await navigate({to:"/dashboard"});}catch{setState("invalid");}})();
   return;
  }
  if(l.error||!l.kind){setState("invalid");return;}
  let done=false;
  const check=async()=>{const {data}=await supabase.auth.getUser(); if(done)return; if(canSetPassword(l,!!data.user)){done=true;setState("ready");}};
  const {data:sub}=supabase.auth.onAuthStateChange((event,session)=>{ if((event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session) void check(); });
  void check();
  const t=setTimeout(()=>{ if(!done){done=true;setState("invalid");} },8000);
  return ()=>{sub.subscription.unsubscribe();clearTimeout(t);};
 },[]);

 const invite=link.kind==="invite";
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);try{
  if(firstLogin){const parsed=firstLoginPasswordSchema.safeParse({password}); if(!parsed.success) throw new Error(parsed.error.issues[0]?.message); if(password!==confirm) throw new Error("Passwords do not match");
   await completeFn({data:{password}}); const {error:refreshError}=await supabase.auth.refreshSession(); if(refreshError){await supabase.auth.signOut(); toast.success("Password set — please sign in with your new password"); await navigate({to:"/auth"}); return;}
   toast.success("Password set — welcome to Asset360"); await navigate({to:"/dashboard"}); return;}
  const {data}=await supabase.auth.getUser(); if(!canSetPassword(link,!!data.user)) throw new Error("This link is invalid or has expired"); const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success(invite?"Password set — welcome to Asset360":"Password updated");await navigate({to:"/dashboard"});}catch(error){toast.error(error instanceof Error?error.message:"Unable to set password");}finally{setLoading(false)}}

 return <main className="app-backdrop grid min-h-screen place-items-center px-4"><div className="glass-panel w-full max-w-md rounded-2xl p-8">
  {state==="checking"&&<p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin"/>Checking your link…</p>}
  {state==="invalid"&&<div role="alert"><h1 className="font-display text-2xl font-bold">Link expired or already used</h1><p className="mt-2 text-sm text-muted-foreground">{invite?"Each invitation link works once. Ask your workspace administrator to resend the invitation.":"Each link works once. Request a new password reset link from the sign-in page."}</p><Button variant="hero" className="mt-6 w-full" onClick={()=>navigate({to:"/auth"})}>{invite?"Go to sign in":"Send a new link"}</Button></div>}
  {state==="ready"&&firstLogin&&<form onSubmit={submit} noValidate><h1 className="font-display text-2xl font-bold">Choose your own password</h1><p className="mt-2 text-sm text-muted-foreground">Your administrator set an initial password. Choose a personal password ({PASSWORD_MIN}–{PASSWORD_MAX} characters) to continue.</p><div className="my-6 space-y-4"><div><Label htmlFor="first-password">New password</Label><div className="relative mt-2"><Input id="first-password" className="h-11 bg-glass-strong pr-12" type={show?"text":"password"} minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/><Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}>{show?<EyeOff/>:<Eye/>}</Button></div></div><div><Label htmlFor="first-confirm">Confirm password</Label><Input id="first-confirm" className="mt-2 h-11 bg-glass-strong" type={show?"text":"password"} maxLength={PASSWORD_MAX} value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password"/></div></div><Button variant="hero" className="w-full" disabled={loading}>Set password and continue</Button></form>}
  {state==="ready"&&!firstLogin&&<form onSubmit={submit}><h1 className="font-display text-2xl font-bold">{invite?"Set your password":"Choose a new password"}</h1><p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p><div className="my-6"><Label htmlFor="new-password">New password</Label><Input id="new-password" className="mt-2 h-11 bg-glass-strong" type="password" minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" /></div><Button variant="hero" className="w-full" disabled={loading}>{invite?"Set password":"Update password"}</Button></form>}
 </div></main>
}
