"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { X, User, Phone, Mail, MapPin, IndianRupee, FileText, Search, MessageSquare } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { ClientSource } from "@/types";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddClientModal({ open, onClose }: AddClientModalProps) {
  const addClient = useAppStore(state => state.addClient);
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    source: "",
    budget_min: "",
    budget_max: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await addClient({
      full_name: form.full_name, email: form.email, phone: form.phone, whatsapp: form.whatsapp, address: form.address,
      source: (form.source as ClientSource) || "other",
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      notes: form.notes, tags: ["New"],
    });
    if (!r.ok) return;
    setForm({ full_name: "", email: "", phone: "", whatsapp: "", address: "", source: "", budget_min: "", budget_max: "", notes: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-slate-50/50">
          <DialogTitle className="text-xl">Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client profile to start managing their projects, invoices, and communications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Contact Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="e.g. Arun Sharma"
                  className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold">Phone Number <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">Email Address <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="arun@example.com"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-xs font-semibold">WhatsApp <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    placeholder="Same as phone if empty"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-semibold">Property Address <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="e.g. 42, Koramangala 5th Block"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Section 2: Requirement Details */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Project Requirements</h3>
            
            <div className="space-y-2">
              <Label htmlFor="source" className="text-xs font-semibold">Lead Source <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
              <Select onValueChange={(v) => setForm({ ...form, source: (v ?? "") as ClientSource })}>
                <SelectTrigger className="w-full bg-slate-50/50 focus:bg-white">
                  <SelectValue placeholder="How did they hear about you?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Client Referral</SelectItem>
                  <SelectItem value="instagram">Instagram / Social Media</SelectItem>
                  <SelectItem value="website">Studio Website</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min" className="text-xs font-semibold">Minimum Budget <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="budget_min"
                    type="number"
                    placeholder="5,00,000"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.budget_min}
                    onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max" className="text-xs font-semibold">Maximum Budget <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="budget_max"
                    type="number"
                    placeholder="15,00,000"
                    className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                    value={form.budget_max}
                    onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <Label htmlFor="notes" className="text-xs font-semibold">Initial Notes & Requirements <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="notes"
                  placeholder="Record any specific requirements, stylistic preferences, or notes from the initial consultation..."
                  rows={4}
                  className="pl-9 bg-slate-50/50 focus-visible:bg-white resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="px-6">Cancel</Button>
            <Button type="submit" className="gradient-primary border-0 px-6 font-semibold shadow-md">Save Client Profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
