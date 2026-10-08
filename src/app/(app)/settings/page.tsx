"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2, Layers, Users, Sliders, Bell, Sparkles, Plus, Trash2, Check,
  Copy, ExternalLink, Save, Search, FileText, Phone, Mail, MapPin, IndianRupee
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { ItemLibraryItem } from "@/types";

export default function SettingsPage() {
  const {
    studioSettings,
    updateStudioSettings,
    itemLibrary,
    addItemToLibrary,
    deleteLibraryItem,
    boqTemplates,
  } = useAppStore();

  // Studio Settings form state
  const [studioForm, setStudioForm] = useState({ ...studioSettings });
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);

  // Item Library state
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("carpentry");
  const [newItemUnit, setNewItemUnit] = useState("sqft");
  const [newItemRate, setNewItemRate] = useState(1800);
  const [newItemSpecs, setNewItemSpecs] = useState("");

  // Team Invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Site Supervisor");
  const [invitedMembers, setInvitedMembers] = useState([
    { name: "Priya Sharma", role: "Principal Designer", email: "priya@urbanarch.com", phone: "+91 98765 43210", active: true },
    { name: "Aarav Mehta", role: "Site Supervisor", email: "aarav@urbanarch.com", phone: "+91 98765 11223", active: true },
    { name: "Neha Verma", role: "3D Visualizer & CAD Lead", email: "neha@urbanarch.com", phone: "+91 98765 33445", active: true },
    { name: "Kunal Singhal", role: "Procurement & Costing Lead", email: "kunal@urbanarch.com", phone: "+91 98765 55667", active: true },
  ]);

  // Public Onboarding Link State
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudioSettings(studioForm);
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 2500);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addItemToLibrary({
      category: newItemCategory,
      item_name: newItemName.trim(),
      specifications: newItemSpecs.trim(),
      unit: newItemUnit,
      base_rate: Number(newItemRate),
    });

    setNewItemName("");
    setNewItemSpecs("");
    setShowAddItemModal(false);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setInvitedMembers((prev) => [
      ...prev,
      {
        name: inviteName.trim(),
        role: inviteRole,
        email: inviteEmail.trim(),
        phone: "+91 98000 00000",
        active: true,
      },
    ]);
    setInviteName("");
    setInviteEmail("");
    setShowInviteModal(false);
  };

  const copyOnboardingUrl = () => {
    const url = `${window.location.origin}/onboarding`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredLibrary = itemLibrary.filter((item) => {
    const matchesSearch =
      (item.item_name || item.name || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.specifications || item.description || "").toLowerCase().includes(itemSearch.toLowerCase());
    const matchesCategory =
      itemCategoryFilter === "all" || item.category === itemCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <TopBar title="Settings & Studio Configuration" subtitle="Brand identity, rate master, templates, and team" />
      <div className="p-6">
        <Tabs defaultValue="studio" className="space-y-6">
          <TabsList className="inline-flex w-full justify-start overflow-x-auto h-auto gap-1 p-1 bg-card border rounded-lg hide-scrollbar">
            <TabsTrigger value="studio" className="gap-1.5 text-xs py-2 px-3">
              <Building2 className="w-3.5 h-3.5" /> Studio Profile
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-1.5 text-xs py-2 px-3">
              <IndianRupee className="w-3.5 h-3.5" /> Rate Master & Items ({itemLibrary.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs py-2 px-3">
              <Layers className="w-3.5 h-3.5" /> BOQ Templates ({boqTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs py-2 px-3">
              <Users className="w-3.5 h-3.5" /> Team & Roles ({invitedMembers.length})
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-1.5 text-xs py-2 px-3">
              <Sliders className="w-3.5 h-3.5" /> Onboarding Intake Form
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs py-2 px-3">
              <Bell className="w-3.5 h-3.5" /> Notifications & Alerts
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Studio Profile */}
          <TabsContent value="studio">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Studio Branding & Tax Registration</CardTitle>
                    <CardDescription className="text-xs">
                      These details appear automatically on all client invoices, BOQs, and Handover Certificates.
                    </CardDescription>
                  </div>
                  {savedSettingsSuccess && (
                    <Badge className="bg-emerald-600 text-white border-0 text-xs gap-1">
                      <Check className="w-3.5 h-3.5" /> Saved!
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Studio Name</label>
                      <Input
                        value={studioForm.name}
                        onChange={(e) => setStudioForm({ ...studioForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Tagline</label>
                      <Input
                        value={studioForm.tagline}
                        onChange={(e) => setStudioForm({ ...studioForm, tagline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Official Email</label>
                      <Input
                        value={studioForm.email}
                        onChange={(e) => setStudioForm({ ...studioForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Phone / WhatsApp</label>
                      <Input
                        value={studioForm.phone}
                        onChange={(e) => setStudioForm({ ...studioForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">GSTIN</label>
                      <Input
                        value={studioForm.gstin}
                        onChange={(e) => setStudioForm({ ...studioForm, gstin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">PAN Number</label>
                      <Input
                        value={studioForm.pan}
                        onChange={(e) => setStudioForm({ ...studioForm, pan: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Studio Address</label>
                    <Input
                      value={studioForm.address}
                      onChange={(e) => setStudioForm({ ...studioForm, address: e.target.value })}
                    />
                  </div>

                  {/* Bank & Payment Details */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-indigo-600" /> Bank & Settlement Accounts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">Beneficiary Name</label>
                        <Input
                          value={studioForm.bank_details.account_name}
                          onChange={(e) =>
                            setStudioForm({
                              ...studioForm,
                              bank_details: { ...studioForm.bank_details, account_name: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">Bank Name</label>
                        <Input
                          value={studioForm.bank_details.bank_name}
                          onChange={(e) =>
                            setStudioForm({
                              ...studioForm,
                              bank_details: { ...studioForm.bank_details, bank_name: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">Account Number</label>
                        <Input
                          value={studioForm.bank_details.account_number}
                          onChange={(e) =>
                            setStudioForm({
                              ...studioForm,
                              bank_details: { ...studioForm.bank_details, account_number: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">IFSC Code</label>
                        <Input
                          value={studioForm.bank_details.ifsc_code}
                          onChange={(e) =>
                            setStudioForm({
                              ...studioForm,
                              bank_details: { ...studioForm.bank_details, ifsc_code: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">UPI ID for Client Pay</label>
                        <Input
                          value={studioForm.bank_details.upi_id}
                          onChange={(e) =>
                            setStudioForm({
                              ...studioForm,
                              bank_details: { ...studioForm.bank_details, upi_id: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">Default GST Rate (%)</label>
                        <Input
                          type="number"
                          value={studioForm.gst_rate}
                          onChange={(e) =>
                            setStudioForm({ ...studioForm, gst_rate: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="pt-4 border-t border-border">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Default Terms & Payment Conditions (Appears on Invoices & BOQ)
                    </label>
                    <Textarea
                      rows={3}
                      value={studioForm.terms_and_conditions}
                      onChange={(e) => setStudioForm({ ...studioForm, terms_and_conditions: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="gradient-primary border-0 text-white gap-2 shadow-sm">
                      <Save className="w-4 h-4" /> Save Profile Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Rate Master & Item Library */}
          <TabsContent value="rates" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rate master items…"
                    className="pl-9"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
                <select
                  value={itemCategoryFilter}
                  onChange={(e) => setItemCategoryFilter(e.target.value)}
                  className="text-xs border border-input rounded-md px-2.5 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Categories</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="civil">Civil & Masonry</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="painting">Painting</option>
                  <option value="flooring">Flooring & Tiling</option>
                </select>
              </div>

              <Button
                onClick={() => setShowAddItemModal(true)}
                className="gradient-primary border-0 text-white gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Rate Item
              </Button>
            </div>

            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-xs text-muted-foreground text-left">
                      <th className="py-2.5 px-4">Item Name & Specs</th>
                      <th className="py-2.5 px-4 text-center">Category</th>
                      <th className="py-2.5 px-4 text-center">Unit</th>
                      <th className="py-2.5 px-4 text-right">Standard Rate</th>
                      <th className="py-2.5 px-4 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLibrary.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">
                            {item.specifications}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                          {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatCurrency(item.base_rate || item.standard_rate || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => deleteLibraryItem(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: BOQ Templates */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boqTemplates.map((template) => (
                <Card key={template.id} className="shadow-sm border border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {template.category}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="p-3 bg-slate-50 rounded-lg border border-border text-xs space-y-1">
                      <p className="font-semibold text-foreground">Included Scope Sections:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {template.sections.map((s, idx) => (
                          <li key={idx}>
                            {s.name} ({s.items.length} items)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-muted-foreground">
                        {template.sections.reduce((acc, s) => acc + s.items.length, 0)} total line items
                      </span>
                      <Button size="sm" variant="outline" className="text-xs text-primary gap-1">
                        <FileText className="w-3.5 h-3.5" /> Clone into Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: Team & Roles */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Design & Execution Team</h3>
                <p className="text-xs text-muted-foreground">Manage roles, site supervisors, and permissions.</p>
              </div>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="gradient-primary border-0 text-white gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Invite Member
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {invitedMembers.map((member, i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Active
                      </Badge>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{member.name}</p>
                      <p className="text-xs text-indigo-600 font-medium">{member.role}</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {member.email}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {member.phone}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 5: Client Onboarding Intake Form */}
          <TabsContent value="onboarding" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">Public Client Onboarding Flow</CardTitle>
                    <CardDescription className="text-xs">
                      Share this interactive link with incoming leads or new clients to collect project scope, style preferences, and budget tiers.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyOnboardingUrl} className="gap-1.5 text-xs">
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? "Link Copied!" : "Copy Shareable Link"}
                    </Button>
                    <Link href="/onboarding" target="_blank">
                      <Button size="sm" className="gradient-primary border-0 text-white gap-1.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" /> Open Intake Wizard
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Public Intake URL</p>
                  <p className="font-mono text-xs text-indigo-600 bg-white p-2 rounded border border-border truncate">
                    /onboarding
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <p className="font-bold text-foreground mb-1">Step 1: Space & Scope</p>
                    <p className="text-muted-foreground">Property type, carpet area, rooms in scope, and possession timeline.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <p className="font-bold text-foreground mb-1">Step 2: Aesthetic Quiz</p>
                    <p className="text-muted-foreground">Japandi, Neo-Classical, Contemporary, and color preferences.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <p className="font-bold text-foreground mb-1">Step 3: Budget & Priorities</p>
                    <p className="text-muted-foreground">Economy, Premium, Luxury tiers & storage requirements.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: Notifications & Preferences */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Automated Client & Team Alerts</CardTitle>
                <CardDescription className="text-xs">
                  Configure WhatsApp, email, and milestone notification triggers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: "WhatsApp Daily Site Photo Digest", desc: "Notify clients via WhatsApp when new photo updates are posted." },
                    { title: "Payment Milestone Reminders", desc: "Send automated gentle reminders 3 days before invoice due date." },
                    { title: "Snag Fix Instant Alerts", desc: "Notify client immediately when site supervisor marks a defect as fixed." },
                    { title: "BOQ Approval Acknowledgment", desc: "Send email PDF copy to client immediately upon digital approval." },
                  ].map((notif, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item to Rate Master Dialog */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Rate Master</DialogTitle>
            <DialogDescription>
              Save reusable rate card items for quick inclusion into project BOQs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddItem} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Item Name *</label>
              <Input
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. TV Unit with Louver Panels"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Category *</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="carpentry">Carpentry</option>
                  <option value="civil">Civil</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="painting">Painting</option>
                  <option value="flooring">Flooring</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Unit *</label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="sqft">sqft</option>
                  <option value="rft">rft</option>
                  <option value="nos">nos</option>
                  <option value="lumpsum">lumpsum</option>
                  <option value="sqmt">sqmt</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Base Rate (₹) *</label>
              <Input
                type="number"
                required
                value={newItemRate}
                onChange={(e) => setNewItemRate(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Specifications</label>
              <Textarea
                rows={2}
                value={newItemSpecs}
                onChange={(e) => setNewItemSpecs(e.target.value)}
                placeholder="e.g. Marine plywood 710 grade with 1mm anti-scratch laminate."
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddItemModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0 text-white">
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Grant access to site supervision, BOQ builders, or client communications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Full Name *</label>
              <Input
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Vikram Joshi"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Email Address *</label>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="vikram@urbanarch.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Principal Designer">Principal Designer</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Site Supervisor">Site Supervisor</option>
                <option value="3D Visualizer & CAD Lead">3D Visualizer & CAD Lead</option>
                <option value="Procurement & Costing Lead">Procurement & Costing Lead</option>
              </select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0 text-white">
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
