"use client";
import {useState} from "react";
import {useAppStore} from "@/lib/store";
import {saveBoqTemplate} from "@/app/actions/settings";
import {addBoqSection} from "@/app/actions/boq";
import {boqTotals} from "@/lib/finance/money";
import {hasAnyRole} from "@/lib/permissions";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {toast} from "@/components/ui/toast";
import type {BOQVersion} from "@/types";
export function BoqTools({boq}:{boq:BOQVersion}){
 const {me,updateBOQVersion}=useAppStore();
 const [mode,setMode]=useState<"section"|"template"|"terms"|null>(null),[name,setName]=useState(""),[busy,setBusy]=useState(false);
 const [terms,setTerms]=useState({version_label:boq.version_label??"",gst_percent:boq.gst_percent,designer_fee:boq.designer_fee,discount_amount:boq.discount_amount});
 const subtotal=boqTotals(boq).itemsSubtotal;
 return <><div className="flex flex-wrap gap-2">{hasAnyRole(me,["owner","director"])&&<Button size="sm" variant="outline" onClick={()=>{setName("");setMode("template");}}>Save as template</Button>}{boq.status==="draft"&&<><Button size="sm" variant="outline" onClick={()=>{setName("");setMode("section");}}>Add section</Button><Button size="sm" variant="outline" onClick={()=>{setTerms({version_label:boq.version_label??"",gst_percent:boq.gst_percent,designer_fee:boq.designer_fee,discount_amount:boq.discount_amount});setMode("terms");}}>Edit estimate terms</Button></>}</div><Dialog open={!!mode} onOpenChange={o=>{if(!o&&!busy)setMode(null);}}><DialogContent><DialogHeader><DialogTitle>{mode==="section"?"Add BOQ section":mode==="template"?"Save BOQ template":"Edit estimate terms"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);const r=mode==="section"?await addBoqSection({boq_version_id:boq.id,name:name.trim(),category:name.trim()}):mode==="template"?await saveBoqTemplate({name:name.trim(),category:"General",sections:boq.sections.map(s=>({name:s.room_name??s.name??"General",category:s.category,items:s.items.map(i=>({description:i.description,unit:i.unit,default_qty:i.quantity,default_rate:i.unit_rate}))}))}):await updateBOQVersion(boq.id,terms);setBusy(false);if(r.ok)setMode(null);else toast.add({title:"Could not save BOQ",description:r.error,type:"error"});}}>{mode==="terms"?<><label className="block text-sm">Revision label<Input value={terms.version_label} onChange={e=>setTerms({...terms,version_label:e.target.value})}/></label><label className="block text-sm">GST %<Input required type="number" min="0" max="28" step="0.01" value={terms.gst_percent} onChange={e=>setTerms({...terms,gst_percent:Number(e.target.value)})}/></label><label className="block text-sm">Designer fee (₹)<Input required type="number" min="0" step="0.01" value={terms.designer_fee} onChange={e=>setTerms({...terms,designer_fee:Number(e.target.value)})}/></label><label className="block text-sm">Discount (₹)<Input required type="number" min="0" max={subtotal+terms.designer_fee} step="0.01" value={terms.discount_amount} onChange={e=>setTerms({...terms,discount_amount:Number(e.target.value)})}/></label></>:<label className="block text-sm">Name<Input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>}<Button disabled={busy} type="submit">{busy?"Saving…":"Save"}</Button></form></DialogContent></Dialog></>;
}
