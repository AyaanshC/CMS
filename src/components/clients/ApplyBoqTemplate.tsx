"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { applyBoqTemplate } from "@/app/actions/boq";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
export function ApplyBoqTemplate({ templateId }: { templateId: string }) {
  const {projects}=useAppStore(); const router=useRouter();
  const [open,setOpen]=useState(false),[project,setProject]=useState(""),[busy,setBusy]=useState(false);
  return <><Button size="sm" variant="outline" onClick={()=>setOpen(true)}>Clone into Project</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Apply BOQ template</DialogTitle></DialogHeader><select aria-label="Project for BOQ template" className="h-10 rounded border px-3" value={project} onChange={e=>setProject(e.target.value)}><option value="">Choose project</option>{projects.filter(p=>p.status!=="closed").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><Button disabled={!project||busy} onClick={async()=>{setBusy(true);const r=await applyBoqTemplate({project_id:project,template_id:templateId});setBusy(false);if(r.ok){setOpen(false);router.push(`/projects/${project}?tab=boq`);}else toast.add({title:"Could not apply template",description:r.error,type:"error"});}}>{busy?"Creating…":"Create draft estimate"}</Button></DialogContent></Dialog></>;
}
