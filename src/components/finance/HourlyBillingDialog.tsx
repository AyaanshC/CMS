"use client";
import {useState} from "react";
import {billHourlyTime} from "@/app/actions/finance";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {toast} from "@/components/ui/toast";
import {localToday} from "@/lib/utils";
export function HourlyBillingDialog({projectId}:{projectId:string}){const [open,setOpen]=useState(false),[from,setFrom]=useState(localToday().slice(0,7)+"-01"),[to,setTo]=useState(localToday()),[busy,setBusy]=useState(false);return <><Button size="sm" onClick={()=>setOpen(true)}>Bill approved hours</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create hourly invoice draft</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Only approved billable time that has not already been invoiced is included.</p><label className="text-sm">From<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-sm">Through<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><Button disabled={busy||!from||!to||from>to} onClick={async()=>{setBusy(true);const r=await billHourlyTime({project_id:projectId,from,to});setBusy(false);if(r.ok){setOpen(false);toast.add({title:"Invoice draft created",description:"Review and issue it in Finance.",type:"success"});}else toast.add({title:"Could not bill time",description:r.error,type:"error"});}}>{busy?"Preparing…":"Create draft invoice"}</Button></DialogContent></Dialog></>;}
