"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import type { Client } from "@/types";

export function EditClientDialog({ client, open, onOpenChange }: { client: Client; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { updateClient } = useAppStore();
  const [draft, setDraft] = useState({ full_name: client.full_name, phone: client.phone, email: client.email ?? "", address: client.address ?? "", notes: client.notes ?? "", tags: client.tags.join(", ") });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const result = await updateClient(client.id, { ...draft, tags: draft.tags.split(",").map(t => t.trim()).filter(Boolean) });
    setBusy(false); if (result.ok) onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Edit client</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-3">
      {(["full_name", "phone", "email", "address", "tags", "notes"] as const).map(field => <div key={field} className="space-y-1"><Label htmlFor={`edit-${field}`}>{({full_name:"Full name",phone:"Phone",email:"Email",address:"Address",tags:"Tags (comma separated)",notes:"Notes"})[field]}</Label><Input id={`edit-${field}`} type={field === "email" ? "email" : "text"} required={field === "full_name" || field === "phone"} value={draft[field]} onChange={e=>setDraft({...draft,[field]:e.target.value})} /></div>)}
      <DialogFooter><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={busy} type="submit">{busy?"Saving…":"Save client"}</Button></DialogFooter>
    </form></DialogContent></Dialog>;
}
