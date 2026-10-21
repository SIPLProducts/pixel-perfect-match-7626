import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { canSetPassword, parseAuthLink, type AuthLink } from "@/lib/auth-link";

// Snapshot the link before the auth client consumes and clears the URL hash.
const initialLink: AuthLink | null = typeof window !== "undefined" ? parseAuthLink(window.location.hash, window.location.search) : null;

export const Route = createFileRoute("/reset-password")({
 head: () => ({ meta: [{ title: "Reset password | Sharvi Asset360" },{ name: "description", content: "Set a new password for your Sharvi Asset360 account." },{ property: "og:title", content: "Reset Sharvi Asset360 password" },{ property: "og:description", content: "Secure account recovery." },{ property: "og:type", content: "website" },{ name: "twitter:card", content: "summary" }] }),
 component: ResetPassword,
});

function ResetPassword(){
 const navigate=useNavigate();
 const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false);
 const [link,setLink]=useState<AuthLink>({kind:null,error:null});
 const [state,setState]=useState<"checking"|"ready"|"invalid">("checking");

 useEffect(()=>{
  const current=parseAuthLink(window.location.hash, window.location.search);
  const l=current.kind||current.error||!initialLink ? current : initialLink; setLink(l);
  if(l.error||!l.kind){setState("invalid");return;}
  let done=false;
  const check=async()=>{const {data}=await supabase.auth.getUser(); if(done)return; if(canSetPassword(l,!!data.user)){done=true;setState("ready");}};
  const {data:sub}=supabase.auth.onAuthStateChange((event,session)=>{ if((event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session) void check(); });
  void check();
  const t=setTimeout(()=>{ if(!done){done=true;setState("invalid");} },8000);
  return ()=>{sub.subscription.unsubscribe();clearTimeout(t);};
 },[]);

 const invite=link.kind==="invite";
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);try{const {data}=await supabase.auth.getUser(); if(!canSetPassword(link,!!data.user)) throw new Error("This link is invalid or has expired"); const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success(invite?"Password set — welcome to Asset360":"Password updated");await navigate({to:"/dashboard"});}catch(error){toast.error(error instanceof Error?error.message:"Unable to set password");}finally{setLoading(false)}}

 return <main className="app-backdrop grid min-h-screen place-items-center px-4"><div className="glass-panel w-full max-w-md rounded-2xl p-8">
  {state==="checking"&&<p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin"/>Checking your link…</p>}
  {state==="invalid"&&<div role="alert"><h1 className="font-display text-2xl font-bold">Link expired or already used</h1><p className="mt-2 text-sm text-muted-foreground">{invite?"Each invitation link works once. Ask your workspace administrator to resend the invitation.":"Each link works once. Request a new password reset link from the sign-in page."}</p><Button variant="hero" className="mt-6 w-full" onClick={()=>navigate({to:"/auth"})}>{invite?"Go to sign in":"Send a new link"}</Button></div>}
  {state==="ready"&&<form onSubmit={submit}><h1 className="font-display text-2xl font-bold">{invite?"Set your password":"Choose a new password"}</h1><p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p><div className="my-6"><Label htmlFor="new-password">New password</Label><Input id="new-password" className="mt-2 h-11 bg-glass-strong" type="password" minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" /></div><Button variant="hero" className="w-full" disabled={loading}>{invite?"Set password":"Update password"}</Button></form>}
 </div></main>
}
