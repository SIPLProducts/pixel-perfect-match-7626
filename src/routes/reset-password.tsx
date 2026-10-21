import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
 head: () => ({ meta: [{ title: "Reset password | Sharvi Asset360" },{ name: "description", content: "Set a new password for your Sharvi Asset360 account." },{ property: "og:title", content: "Reset Sharvi Asset360 password" },{ property: "og:description", content: "Secure account recovery." },{ property: "og:type", content: "website" },{ name: "twitter:card", content: "summary" }] }),
 component: ResetPassword,
});
function ResetPassword(){
 const navigate=useNavigate(); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);try{if(!window.location.hash.includes("type=recovery")) throw new Error("This recovery link is invalid or expired"); const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success("Password updated");await navigate({to:"/dashboard"});}catch(error){toast.error(error instanceof Error?error.message:"Unable to reset password");}finally{setLoading(false)}}
 return <main className="app-backdrop grid min-h-screen place-items-center px-4"><form onSubmit={submit} className="glass-panel w-full max-w-md rounded-2xl p-8"><h1 className="font-display text-2xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p><div className="my-6"><Label htmlFor="new-password">New password</Label><Input id="new-password" className="mt-2 h-11 bg-glass-strong" type="password" minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} required /></div><Button variant="hero" className="w-full" disabled={loading}>Update password</Button></form></main>
}
