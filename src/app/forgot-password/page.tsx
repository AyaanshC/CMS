"use client";
import {useState} from "react";
import Link from "next/link";
import {createBrowserSupabase} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
export default function ForgotPassword(){
 const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 return <main className="flex min-h-dvh items-center justify-center bg-background p-6"><section className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8"><p className="text-xs uppercase tracking-widest text-primary">Studio account</p><h1 className="text-2xl font-semibold">Reset your password</h1><p className="text-sm text-muted-foreground">Enter your account email. We’ll send a link so you can choose a new password.</p><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{const {error}=await createBrowserSupabase().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth/callback?next=/auth/reset-password"});setMessage(error?"We couldn’t request a reset. Please try again.":"If an account matches this email, a reset link will arrive shortly.");}catch{setMessage("Could not connect. Please try again.");}finally{setBusy(false);}}}><label className="block text-sm">Account email<Input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><Button disabled={busy} className="w-full" type="submit">{busy?"Requesting…":"Send reset link"}</Button></form>{message&&<p role="status" className="text-sm">{message}</p>}<Link className="block text-sm text-primary" href="/login">Back to sign in</Link></section></main>;
}
