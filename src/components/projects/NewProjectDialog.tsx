"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssigneeSelect } from "@/components/team/AssigneeSelect";
import { useAppStore } from "@/lib/store";
import { hasAnyRole } from "@/lib/permissions";

const EMPTY = {
  client_id: "", name: "", type: "residential", property_address: "", area_sqft: "", total_budget: "",
  start_date: "", estimated_end_date: "", director_id: "", manager_id: "",
};
const selectClass = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

export function NewProjectDialog() {
  const { clients, createProject, me } = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  if (!hasAnyRole(me, ["owner", "director", "project_manager", "admin"])) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await createProject({
      ...form,
      type: form.type as "residential" | "commercial" | "office",
      area_sqft: form.area_sqft ? Number(form.area_sqft) : undefined,
      total_budget: form.total_budget ? Number(form.total_budget) : undefined,
    });
    if (r.ok) { setForm(EMPTY); setOpen(false); }
  }

  return (
    <>
      <Button className="gap-2 gradient-primary border-0" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> New Project
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="np-client">Client *</Label>
              <select id="np-client" required value={form.client_id} onChange={set("client_id")} className={selectClass}>
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1"><Label htmlFor="np-name">Project name *</Label><Input id="np-name" required value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1">
              <Label htmlFor="np-type">Type</Label>
              <select id="np-type" value={form.type} onChange={set("type")} className={selectClass}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="np-area">Area (sqft)</Label><Input id="np-area" type="number" min="1" value={form.area_sqft} onChange={set("area_sqft")} /></div>
            <div className="col-span-2 space-y-1"><Label htmlFor="np-addr">Site address</Label><Input id="np-addr" value={form.property_address} onChange={set("property_address")} /></div>
            <div className="space-y-1"><Label htmlFor="np-start">Start date</Label><Input id="np-start" type="date" value={form.start_date} onChange={set("start_date")} /></div>
            <div className="space-y-1"><Label htmlFor="np-end">Target end</Label><Input id="np-end" type="date" value={form.estimated_end_date} onChange={set("estimated_end_date")} /></div>
            <div className="col-span-2 space-y-1"><Label htmlFor="np-budget">Budget (₹)</Label><Input id="np-budget" type="number" min="0" value={form.total_budget} onChange={set("total_budget")} /></div>
            <div className="space-y-1"><Label htmlFor="np-dir">Director</Label><AssigneeSelect id="np-dir" roles={["owner", "director"]} value={form.director_id} onChange={(v) => setForm({ ...form, director_id: v })} /></div>
            <div className="space-y-1"><Label htmlFor="np-pm">Project manager</Label><AssigneeSelect id="np-pm" roles={["project_manager", "director"]} value={form.manager_id} onChange={(v) => setForm({ ...form, manager_id: v })} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
