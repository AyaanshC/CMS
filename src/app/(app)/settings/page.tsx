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
  Building2, Layers, Users, Sliders, Bell, Plus, Trash2, Check,
  Copy, ExternalLink, Save, Search, FileText, Phone, Mail, IndianRupee, ShieldAlert
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, cn, localToday } from "@/lib/utils";
import { hasAnyRole } from "@/lib/permissions";
import { toast } from "@/components/ui/toast";
import { inviteStaff, setStaffRoles, setStaffActive } from "@/app/actions/team";
import { setStaffTerms as setStaffTermsAction, upsertRateBand, addCostRate, updateRiskSettings } from "@/app/actions/staff";
import { DEFAULT_RISK_WEIGHTS } from "@/lib/metrics/risk";
import type { AppRole, RateBand, RiskWeights, TeamMember } from "@/types";

const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  director: "Director",
  project_manager: "Project Manager",
  architect: "Architect",
  site_supervisor: "Site Supervisor",
  finance: "Finance",
  admin: "Admin",
  procurement: "Procurement",
};

const ALL_ROLES: AppRole[] = [
  "owner",
  "director",
  "project_manager",
  "architect",
  "site_supervisor",
  "finance",
  "admin",
  "procurement",
];

export default function SettingsPage() {
  const {
    studioSettings,
    updateStudioSettings,
    itemLibrary,
    addItemToLibrary,
    deleteLibraryItem,
    boqTemplates,
    me,
    team,
    rateBands,
    costRates,
  } = useAppStore();

  const isOwner = hasAnyRole(me, ["owner"]);
  const isFinance = hasAnyRole(me, ["finance"]);
  const canSeeRates = isOwner || isFinance;

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
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteRoles, setInviteRoles] = useState<AppRole[]>(["architect"]);
  const [inviting, setInviting] = useState(false);

  // Role Editor state
  const [editingMemberRoles, setEditingMemberRoles] = useState<{ user: TeamMember; roles: AppRole[] } | null>(null);

  // Rates & Bands state
  const [newBandName, setNewBandName] = useState("");
  const [newBandRate, setNewBandRate] = useState<number | string>("");
  const [creatingBand, setCreatingBand] = useState(false);

  // Private Cost Rates state
  const [newCostMemberId, setNewCostMemberId] = useState("");
  const [newCostEffectiveFrom, setNewCostEffectiveFrom] = useState(() => localToday());
  const [newCostRate, setNewCostRate] = useState<number | string>("");
  const [savingCostRate, setSavingCostRate] = useState(false);

  // Risk & Targets state
  const [riskWeights, setRiskWeights] = useState<RiskWeights>(() => studioSettings.risk_weights ?? DEFAULT_RISK_WEIGHTS);
  const [billingTarget, setBillingTarget] = useState<string>(() => studioSettings.monthly_billing_target ? String(studioSettings.monthly_billing_target) : "");
  const [savingRisk, setSavingRisk] = useState(false);
  const [savedRiskSuccess, setSavedRiskSuccess] = useState(false);

  // Staff Terms state (for capacity, billable target, rate band)
  const [staffTerms, setStaffTerms] = useState<Record<string, { capacity: number; target: number; rate_band_id: string }>>(() => {
    const init: Record<string, { capacity: number; target: number; rate_band_id: string }> = {};
    for (const m of team) {
      init[m.id] = {
        capacity: m.weekly_capacity_hours ?? 45,
        target: m.billable_target_percent ?? 75,
        rate_band_id: m.rate_band_id ?? "",
      };
    }
    return init;
  });

  const handleCreateRateBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBandName.trim() || !newBandRate) return;
    setCreatingBand(true);
    const r = await upsertRateBand({ name: newBandName.trim(), blended_rate: Number(newBandRate) });
    setCreatingBand(false);
    if (!r.ok) {
      toast.add({ title: "Could not create rate band", description: r.error, type: "error" });
    } else {
      toast.add({ title: "Rate band created", description: `Added ${newBandName.trim()}`, type: "success" });
      setNewBandName("");
      setNewBandRate("");
    }
  };

  const handleAddCostRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostMemberId || !newCostRate || !newCostEffectiveFrom) return;
    setSavingCostRate(true);
    const r = await addCostRate({
      profile_id: newCostMemberId,
      effective_from: newCostEffectiveFrom,
      cost_rate: Number(newCostRate),
    });
    setSavingCostRate(false);
    if (!r.ok) {
      toast.add({ title: "Could not save cost rate", description: r.error, type: "error" });
    } else {
      toast.add({ title: "Cost rate saved", description: "Updated staff cost rate successfully.", type: "success" });
      setNewCostRate("");
    }
  };

  const handleSaveRiskSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRisk(true);
    const r = await updateRiskSettings({
      risk_weights: riskWeights,
      monthly_billing_target: billingTarget ? Number(billingTarget) : null,
    });
    setSavingRisk(false);
    if (!r.ok) {
      toast.add({ title: "Could not save risk settings", description: r.error, type: "error" });
    } else {
      setSavedRiskSuccess(true);
      setTimeout(() => setSavedRiskSuccess(false), 2500);
      toast.add({ title: "Risk & target settings saved", description: "Studio risk weights and targets updated.", type: "success" });
    }
  };

  const weightSum = Object.values(riskWeights).reduce((a, b) => a + (Number(b) || 0), 0);

  // Public Onboarding Link State
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await updateStudioSettings(studioForm);
    if (r.ok) {
      setSavedSettingsSuccess(true);
      setTimeout(() => setSavedSettingsSuccess(false), 2500);
    } else {
      toast.add({ title: "Could not save settings", description: r.error, type: "error" });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const r = await addItemToLibrary({
      category: newItemCategory,
      item_name: newItemName.trim(),
      specifications: newItemSpecs.trim(),
      unit: newItemUnit,
      standard_rate: Number(newItemRate),
    });

    if (!r?.ok && r?.error) {
      toast.add({ title: "Could not add item", description: r.error, type: "error" });
    } else {
      setNewItemName("");
      setNewItemSpecs("");
      setShowAddItemModal(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || inviteRoles.length === 0) return;

    setInviting(true);
    try {
      const r = await inviteStaff({
        full_name: inviteName.trim(),
        email: inviteEmail.trim(),
        title: inviteTitle.trim() || undefined,
        roles: inviteRoles,
      });

      if (!r.ok) {
        toast.add({ title: "Could not invite staff", description: r.error, type: "error" });
      } else {
        toast.add({
          title: "Staff Login Created",
          description: "Login created. Ask them to sign in at /login with 'Email me a sign-in link'.",
          type: "success",
        });
        setInviteName("");
        setInviteEmail("");
        setInviteTitle("");
        setInviteRoles(["architect"]);
        setShowInviteModal(false);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    const r = await setStaffActive({ id: member.id, active: !member.active });
    if (!r.ok) {
      toast.add({ title: "Status update failed", description: r.error, type: "error" });
    } else {
      toast.add({
        title: "Status updated",
        description: `${member.full_name} is now ${!member.active ? "active" : "inactive"}.`,
        type: "success",
      });
    }
  };

  const handleSaveRoles = async () => {
    if (!editingMemberRoles) return;
    const r = await setStaffRoles({ user_id: editingMemberRoles.user.id, roles: editingMemberRoles.roles });
    if (!r.ok) {
      toast.add({ title: "Role update failed", description: r.error, type: "error" });
    } else {
      toast.add({ title: "Roles updated", description: "Staff roles updated successfully.", type: "success" });
      setEditingMemberRoles(null);
    }
  };

  const copyOnboardingUrl = () => {
    const url = `${window.location.origin}/onboarding`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredLibrary = itemLibrary.filter((item) => {
    const matchesSearch =
      (item.item_name || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
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
            <TabsTrigger value="items" className="gap-1.5 text-xs py-2 px-3">
              <Layers className="w-3.5 h-3.5" /> Item Library ({itemLibrary.length})
            </TabsTrigger>
            {canSeeRates && (
              <TabsTrigger value="rates" className="gap-1.5 text-xs py-2 px-3">
                <IndianRupee className="w-3.5 h-3.5" /> Staff Rates ({rateBands.length})
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="risk" className="gap-1.5 text-xs py-2 px-3">
                <ShieldAlert className="w-3.5 h-3.5" /> Risk & Targets
              </TabsTrigger>
            )}
            <TabsTrigger value="templates" className="gap-1.5 text-xs py-2 px-3">
              <Layers className="w-3.5 h-3.5" /> BOQ Templates ({boqTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs py-2 px-3">
              <Users className="w-3.5 h-3.5" /> Team & Roles ({team.length})
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
                  <fieldset disabled={!isOwner} className="space-y-6">
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
                  </fieldset>

                  {isOwner ? (
                    <div className="flex justify-end pt-2">
                      <Button type="submit" className="gradient-primary border-0 text-white gap-2 shadow-sm">
                        <Save className="w-4 h-4" /> Save Profile Settings
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-right italic">
                      Only studio owners can edit firm branding and financial details.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Item Library */}
          <TabsContent value="items" className="space-y-4">
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
                            {item.specifications || item.description}
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
                          {formatCurrency(item.standard_rate || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await deleteLibraryItem(item.id);
                              if (!r?.ok && r?.error) {
                                toast.add({ title: "Could not delete item", description: r.error, type: "error" });
                              }
                            }}
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
              {isOwner && (
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="gradient-primary border-0 text-white gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Invite Member
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {team.map((member) => (
                <Card key={member.id} className={cn("shadow-sm", !member.active && "opacity-60")}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {member.full_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <Badge variant={member.active ? "outline" : "destructive"} className="text-[10px]">
                        {member.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{member.full_name}</p>
                      <p className="text-xs text-indigo-600 font-medium">{member.title || "Team Member"}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="capitalize text-[10px]">
                          {ROLE_LABELS[r] || r}
                        </Badge>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {member.email}
                      </p>
                      {member.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" /> {member.phone}
                        </p>
                      )}
                    </div>
                    {isOwner && (
                      <div className="pt-2 border-t border-border space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Capacity (h/w)</label>
                            <Input
                              type="number"
                              min="0"
                              max="80"
                              className="h-7 text-xs px-2"
                              value={staffTerms[member.id]?.capacity ?? member.weekly_capacity_hours ?? 45}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setStaffTerms((prev) => ({
                                  ...prev,
                                  [member.id]: { ...(prev[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" }), capacity: val }
                                }));
                              }}
                              onBlur={async () => {
                                const current = staffTerms[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" };
                                const r = await setStaffTermsAction({
                                  id: member.id,
                                  weekly_capacity_hours: Number(current.capacity),
                                  billable_target_percent: Number(current.target),
                                  rate_band_id: current.rate_band_id || undefined,
                                });
                                if (!r.ok) toast.add({ title: "Failed to update staff terms", description: r.error, type: "error" });
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Target %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="h-7 text-xs px-2"
                              value={staffTerms[member.id]?.target ?? member.billable_target_percent ?? 75}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setStaffTerms((prev) => ({
                                  ...prev,
                                  [member.id]: { ...(prev[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" }), target: val }
                                }));
                              }}
                              onBlur={async () => {
                                const current = staffTerms[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" };
                                const r = await setStaffTermsAction({
                                  id: member.id,
                                  weekly_capacity_hours: Number(current.capacity),
                                  billable_target_percent: Number(current.target),
                                  rate_band_id: current.rate_band_id || undefined,
                                });
                                if (!r.ok) toast.add({ title: "Failed to update staff terms", description: r.error, type: "error" });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Rate Band</label>
                          <select
                            className="w-full h-7 text-xs border border-input rounded px-2 bg-background"
                            value={staffTerms[member.id]?.rate_band_id ?? member.rate_band_id ?? ""}
                            onChange={async (e) => {
                              const newBandId = e.target.value;
                              setStaffTerms((prev) => ({
                                ...prev,
                                [member.id]: { ...(prev[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" }), rate_band_id: newBandId }
                              }));
                              const current = staffTerms[member.id] || { capacity: member.weekly_capacity_hours ?? 45, target: member.billable_target_percent ?? 75, rate_band_id: member.rate_band_id ?? "" };
                              const r = await setStaffTermsAction({
                                id: member.id,
                                weekly_capacity_hours: Number(current.capacity),
                                billable_target_percent: Number(current.target),
                                rate_band_id: newBandId || undefined,
                              });
                              if (!r.ok) toast.add({ title: "Failed to update rate band", description: r.error, type: "error" });
                            }}
                          >
                            <option value="">No rate band (costed at ₹0)</option>
                            {rateBands.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({formatCurrency(b.blended_rate)}/h)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => setEditingMemberRoles({ user: member, roles: [...member.roles] })}
                          >
                            Edit Roles
                          </Button>
                          <Button
                            size="sm"
                            variant={member.active ? "destructive" : "secondary"}
                            className="text-xs h-7 px-2"
                            onClick={() => handleToggleActive(member)}
                          >
                            {member.active ? "Deactivate" : "Reactivate"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB: Staff Rates & Rate Bands */}
          {canSeeRates && (
            <TabsContent value="rates" className="space-y-6">
              {/* Blended Rate Bands */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Blended Rate Bands</CardTitle>
                  <CardDescription className="text-xs">
                    Standard hourly billing and cost bands used for project labour costing. Visible across the studio without exposing individual salaries.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground text-left bg-slate-50/70">
                          <th className="py-2.5 px-4">Band Name</th>
                          <th className="py-2.5 px-4 text-right">Blended Hourly Rate</th>
                          {isOwner && <th className="py-2.5 px-4 text-center w-24">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rateBands.map((band) => (
                          <RateBandRow key={band.id} band={band} isOwner={isOwner} onSave={upsertRateBand} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isOwner && (
                    <form onSubmit={handleCreateRateBand} className="flex flex-wrap items-center gap-3 pt-2 border-t">
                      <Input
                        placeholder="New band name (e.g. Senior Architect)"
                        value={newBandName}
                        onChange={(e) => setNewBandName(e.target.value)}
                        className="h-8 max-w-xs text-xs"
                      />
                      <div className="relative max-w-xs">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Blended rate (₹/h)"
                          value={newBandRate}
                          onChange={(e) => setNewBandRate(e.target.value)}
                          className="h-8 pl-6 text-xs w-40"
                        />
                      </div>
                      <Button size="sm" type="submit" disabled={creatingBand || !newBandName.trim() || !newBandRate} className="gap-1.5 text-xs h-8">
                        <Plus className="w-3.5 h-3.5" /> Add Rate Band
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Private Cost Rates */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        Private Cost Rates
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                          Owner & Finance Only
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Individual staff hourly cost rates used for actual margin calculation. Visible only to the owner and finance. Others see blended band rates.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground text-left bg-slate-50/70">
                          <th className="py-2.5 px-4">Team Member</th>
                          <th className="py-2.5 px-4">Current Hourly Cost</th>
                          <th className="py-2.5 px-4">Effective Since</th>
                          <th className="py-2.5 px-4">Rate History</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {team.map((member) => {
                          const memberRates = costRates
                            .filter((c) => c.profile_id === member.id)
                            .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
                          const today = localToday();
                          const activeRate = memberRates.find((c) => c.effective_from <= today) ?? memberRates[0];

                          return (
                            <tr key={member.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-medium">
                                {member.full_name}
                                <span className="block text-xs text-muted-foreground">{member.title || "Team Member"}</span>
                              </td>
                              <td className="py-2.5 px-4 font-bold">
                                {activeRate ? formatCurrency(activeRate.cost_rate) + "/h" : <span className="text-muted-foreground text-xs font-normal">None set</span>}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                {activeRate ? activeRate.effective_from : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                {memberRates.length > 1 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {memberRates.slice(1).map((r) => (
                                      <Badge key={r.id} variant="secondary" className="text-[10px]">
                                        {formatCurrency(r.cost_rate)} ({r.effective_from})
                                      </Badge>
                                    ))}
                                  </div>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add / Update Cost Rate Form */}
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-xs font-bold text-foreground">Add New Cost Rate</p>
                    <form onSubmit={handleAddCostRateSubmit} className="flex flex-wrap items-center gap-3">
                      <select
                        value={newCostMemberId}
                        onChange={(e) => setNewCostMemberId(e.target.value)}
                        className="h-8 text-xs border border-input rounded px-2.5 bg-background"
                        required
                      >
                        <option value="">Select team member…</option>
                        {team.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={newCostEffectiveFrom}
                        onChange={(e) => setNewCostEffectiveFrom(e.target.value)}
                        className="h-8 text-xs w-36"
                        required
                      />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Cost rate (₹/h)"
                          value={newCostRate}
                          onChange={(e) => setNewCostRate(e.target.value)}
                          className="h-8 pl-6 text-xs w-36"
                          required
                          min="0"
                        />
                      </div>
                      <Button size="sm" type="submit" disabled={savingCostRate || !newCostMemberId || !newCostRate} className="gap-1.5 text-xs h-8">
                        <Plus className="w-3.5 h-3.5" /> Save Rate
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB: Risk & Targets */}
          {isOwner && (
            <TabsContent value="risk" className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-indigo-600" /> Project Risk Weights & Billing Targets
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure weights used in portfolio risk scoring and studio monthly billing targets.
                      </CardDescription>
                    </div>
                    {savedRiskSuccess && (
                      <Badge className="bg-emerald-600 text-white border-0 text-xs gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveRiskSettings} className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Risk Scoring Weights (0–100)
                        </h4>
                        <Badge variant="outline" className={cn("text-xs", weightSum === 100 ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-amber-300 text-amber-700 bg-amber-50")}>
                          Sum: {weightSum} / 100
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Factors without data yet are left out automatically during score calculation.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { key: "fee_burn" as const, label: "Fee Burn vs Progress", desc: "Penalizes stages where labour cost outpaces completion %" },
                          { key: "overdue" as const, label: "Overdue Milestones", desc: "Penalizes past-due project milestone commitments" },
                          { key: "schedule" as const, label: "Schedule Delay", desc: "Penalizes projects running past their estimated end date" },
                          { key: "cost_variance" as const, label: "Cost Variance", desc: "Flags stages where labour exceeds the design fee" },
                          { key: "approvals" as const, label: "Pending Approvals", desc: "Penalizes unapproved change orders or BOQ versions" },
                          { key: "critical_snags" as const, label: "Critical Snags", desc: "Weights high or critical severity defects on site" },
                          { key: "pending_changes" as const, label: "Pending Changes", desc: "Penalizes scope changes awaiting client decision" },
                        ].map((factor) => (
                          <div key={factor.key} className="p-3 border rounded-lg bg-slate-50/50 space-y-1.5">
                            <label className="text-xs font-semibold text-foreground block">
                              {factor.label}
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={riskWeights[factor.key] ?? 0}
                              onChange={(e) => setRiskWeights({ ...riskWeights, [factor.key]: Number(e.target.value) })}
                              className="h-8 text-xs bg-white"
                            />
                            <p className="text-[11px] text-muted-foreground">{factor.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Revenue Goals
                      </h4>
                      <div className="max-w-xs space-y-1.5">
                        <label className="text-xs font-semibold text-foreground block">
                          Monthly Billing Target (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 500000"
                            value={billingTarget}
                            onChange={(e) => setBillingTarget(e.target.value)}
                            className="h-8 pl-6 text-xs"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Shown on owner dashboard alongside month-to-date invoiced volume.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={savingRisk} className="gradient-primary border-0 text-white gap-2 shadow-sm">
                        <Save className="w-4 h-4" /> Save Risk & Target Settings
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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
                    { key: "whatsapp_digest" as const, title: "WhatsApp Daily Site Photo Digest", desc: "Notify clients via WhatsApp when new photo updates are posted." },
                    { key: "payment_reminders" as const, title: "Payment Milestone Reminders", desc: "Send automated gentle reminders 3 days before invoice due date." },
                    { key: "snag_fix_alerts" as const, title: "Snag Fix Instant Alerts", desc: "Notify client immediately when site supervisor marks a defect as fixed." },
                    { key: "boq_ack" as const, title: "BOQ Approval Acknowledgment", desc: "Send email PDF copy to client immediately upon digital approval." },
                  ].map((notif) => (
                    <div key={notif.key} className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(studioSettings.alert_preferences?.[notif.key])}
                        onChange={async (e) => {
                          const updated = {
                            whatsapp_digest: studioSettings.alert_preferences?.whatsapp_digest ?? false,
                            payment_reminders: studioSettings.alert_preferences?.payment_reminders ?? false,
                            snag_fix_alerts: studioSettings.alert_preferences?.snag_fix_alerts ?? false,
                            boq_ack: studioSettings.alert_preferences?.boq_ack ?? false,
                            [notif.key]: e.target.checked,
                          };
                          const r = await updateStudioSettings({ alert_preferences: updated });
                          if (!r.ok) {
                            toast.add({ title: "Failed to update alert preference", description: r.error, type: "error" });
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Delivery starts in Phase 1 (email) and Phase 5 (WhatsApp); preferences are saved now.
                </p>
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

      {/* Role Editor Dialog */}
      <Dialog open={Boolean(editingMemberRoles)} onOpenChange={(open) => !open && setEditingMemberRoles(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Roles — {editingMemberRoles?.user.full_name}</DialogTitle>
            <DialogDescription>
              Select the system roles for this team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map((role) => {
                const checked = editingMemberRoles?.roles.includes(role) ?? false;
                return (
                  <label
                    key={role}
                    className="flex items-center gap-2 p-2 border rounded-md text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (!editingMemberRoles) return;
                        const next = e.target.checked
                          ? [...editingMemberRoles.roles, role]
                          : editingMemberRoles.roles.filter((r) => r !== role);
                        setEditingMemberRoles({ ...editingMemberRoles, roles: next });
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>{ROLE_LABELS[role]}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingMemberRoles(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveRoles} className="gradient-primary border-0 text-white">
              Save Roles
            </Button>
          </DialogFooter>
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
              <label className="text-xs font-semibold text-foreground block mb-1">Job Title</label>
              <Input
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
                placeholder="e.g. Site Supervisor"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">System Roles *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALL_ROLES.map((role) => {
                  const checked = inviteRoles.includes(role);
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-2 p-2 border rounded-md text-xs cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setInviteRoles((prev) =>
                            e.target.checked ? [...prev, role] : prev.filter((r) => r !== role)
                          );
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{ROLE_LABELS[role]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)} disabled={inviting}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviting || inviteRoles.length === 0} className="gradient-primary border-0 text-white">
                {inviting ? "Creating Login…" : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RateBandRow({
  band,
  isOwner,
  onSave,
}: {
  band: RateBand;
  isOwner: boolean;
  onSave: (input: unknown) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [rate, setRate] = useState(band.blended_rate);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const r = await onSave({ id: band.id, name: band.name, blended_rate: Number(rate) });
    setSaving(false);
    if (!r.ok) {
      toast.add({ title: "Could not update rate band", description: r.error, type: "error" });
    } else {
      toast.add({ title: "Rate band updated", description: `${band.name} updated to ₹${rate}/h.`, type: "success" });
      setEditing(false);
    }
  };

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="py-3 px-4 font-semibold text-foreground">{band.name}</td>
      <td className="py-3 px-4 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-muted-foreground">₹</span>
            <Input
              type="number"
              min="0"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="h-7 w-28 text-xs text-right"
            />
            <span className="text-xs text-muted-foreground">/h</span>
          </div>
        ) : (
          <span className="font-bold text-foreground">{formatCurrency(band.blended_rate)}/h</span>
        )}
      </td>
      {isOwner && (
        <td className="py-3 px-4 text-center">
          {editing ? (
            <div className="flex items-center justify-center gap-1">
              <Button size="sm" className="h-6 text-[11px] px-2" disabled={saving} onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-1" onClick={() => { setRate(band.blended_rate); setEditing(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}
