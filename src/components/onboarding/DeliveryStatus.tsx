"use client";
import {useState,useEffect} from "react";
import {deliveryStatus} from "@/app/actions/delivery";
import {Button} from "@/components/ui/button";
export function DeliveryStatus(){
 const [status,setStatus]=useState<Awaited<ReturnType<typeof deliveryStatus>>>(null),[busy,setBusy]=useState(true);
 useEffect(()=>{void deliveryStatus().then(setStatus).finally(()=>setBusy(false));},[]);
 const counts=status?.summary as {pending:number;failed:number;sent:number;exhausted:number}|null;
 return <section className="space-y-3 rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Email delivery status</h2><Button size="sm" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{setStatus(await deliveryStatus());}finally{setBusy(false);}}}>Refresh status</Button></div>{busy?<p role="status" className="text-sm">Checking delivery…</p>:status?<><p className="text-sm">Alert worker: {status.worker}</p><p className="text-sm">Sign-in invitations: {status.invitationConfigured?"Configured":"Email service not configured"}</p>{counts&&<p className="text-sm text-muted-foreground">{counts.pending} queued · {counts.failed} failed · {counts.exhausted} need attention after retry limit · {counts.sent} sent</p>}<p className="text-xs text-muted-foreground">Alert delivery and upload cleanup require deployed workers and scheduler configuration. Failed alert emails retry up to five times. Creating a sign-in link remains available when invitation email is unavailable.</p></>:<p className="text-sm text-muted-foreground">Sign in to a live owner or finance account to check delivery.</p>}</section>;
}
