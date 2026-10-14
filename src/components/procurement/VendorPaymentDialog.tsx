"use client";
import {useRequestKey} from "@/lib/hooks/use-request-key";
import {useState} from "react";
import {useAppStore} from "@/lib/store";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {localToday,formatMoney as formatCurrency} from "@/lib/utils";
import {PAYMENT_MODE_LABELS,type PaymentMode,type VendorBill} from "@/types";
export function VendorPaymentDialog({projectId,bill,onClose}:{projectId:string;bill:VendorBill|null;onClose:()=>void}){
const requestKey=useRequestKey();
const {vendors,recordVendorPayment}=useAppStore();const [vendor,setVendor]=useState(bill?.vendor_id??""),[amount,setAmount]=useState(bill?.outstanding??0),[tds,setTds]=useState(0),[date,setDate]=useState(localToday()),[mode,setMode]=useState<PaymentMode>("bank_transfer"),[reference,setReference]=useState(""),[busy,setBusy]=useState(false);
return <Dialog open onOpenChange={o=>{if(!o&&!busy)onClose();}}><DialogContent><DialogHeader><DialogTitle>{bill?`Payment · ${bill.bill_number}`:"Record vendor advance"}</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);const payload={vendor_id:vendor,project_id:projectId,bill_id:bill?.id,amount,tds_amount:tds,paid_on:date,mode,reference,is_advance:!bill};const r=await recordVendorPayment({...payload,request_id:requestKey(payload)});setBusy(false);if(r.ok)onClose();}}>
{bill?<p className="text-sm text-muted-foreground">Outstanding: {formatCurrency(bill.outstanding)}</p>:<label className="block text-sm">Vendor<select required className="mt-1 block w-full rounded border p-2" value={vendor} onChange={e=>setVendor(e.target.value)}><option value="">Choose vendor</option>{vendors.filter(v=>v.status!=="blacklisted").map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
<label className="block text-sm">Cash paid<Input required type="number" min="0.01" step="0.01" max={bill?bill.outstanding-tds:undefined} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><label className="block text-sm">TDS withheld<Input type="number" min="0" step="0.01" value={tds} onChange={e=>setTds(Number(e.target.value))}/></label><label className="block text-sm">Payment date<Input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="block text-sm">Mode<select className="mt-1 block w-full rounded border p-2" value={mode} onChange={e=>setMode(e.target.value as PaymentMode)}>{Object.entries(PAYMENT_MODE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm">Reference<Input value={reference} onChange={e=>setReference(e.target.value)}/></label><p className="text-xs text-muted-foreground">This records a payment made outside the system. It does not transfer funds.</p><Button disabled={busy||!vendor||amount<=0||!!bill&&amount+tds>bill.outstanding} type="submit">{busy?"Saving…":"Record payment"}</Button></form></DialogContent></Dialog>;
}
