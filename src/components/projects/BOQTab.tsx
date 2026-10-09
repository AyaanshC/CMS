"use client";

import React, { useState } from "react";
import { BOQVersion, BOQLineItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { Download, FileText, Check, History, Plus, Trash2, BookOpen, Printer, X, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function BOQTab({ projectId, boqVersions }: { projectId: string; boqVersions: BOQVersion[] }) {
  const { 
    itemLibrary, 
    addBOQVersion, 
    updateBOQVersion, 
    addLineItemToBOQ, 
    deleteLineItemFromBOQ,
    studioSettings
  } = useAppStore();

  const [selectedVersionId, setSelectedVersionId] = useState(boqVersions[0]?.id || "");
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [compareVersionId, setCompareVersionId] = useState<string>(boqVersions[1]?.id || boqVersions[0]?.id || "");

  // Form for adding new item
  const [newItemForm, setNewItemForm] = useState({
    description: "",
    unit: "sqft",
    quantity: 1,
    unit_rate: 100,
    remarks: "",
  });

  const selectedBoq = boqVersions.find((b) => b.id === selectedVersionId) || boqVersions[0];

  if (!boqVersions.length || !selectedBoq) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
        <FileText className="w-10 h-10 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">No BOQ created yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Start by creating your first Bill of Quantities version.</p>
        <Button 
          onClick={async () => {
            const r = await addBOQVersion({
              id: "", project_id: projectId, version_number: 1, version_label: "Initial estimate", status: "draft",
              gst_percent: studioSettings.gst_rate, discount_amount: 0, designer_fee: 0, grand_total: 0, created_at: "",
              sections: [{ id: "", boq_version_id: "", name: "General", category: "General", sort_order: 1, subtotal: 0, items: [] }],
            });
            if (r.ok && r.id) setSelectedVersionId(r.id);
          }}
          className="gradient-primary border-0"
        >
          Create First BOQ
        </Button>
      </div>
    );
  }

  const handleSubmitForApproval = () => {
    updateBOQVersion(selectedBoq.id, {
      status: "submitted",
    });
  };

  const handleCreateNewVersion = async () => {
    const nextVerNumber = Math.max(...boqVersions.map(v => v.version_number), 0) + 1;
    const clonedSections = (selectedBoq.sections || []).map(sec => ({
      ...sec,
      id: "",
      items: (sec.items || []).map(it => ({ ...it, id: "" }))
    }));

    const newVersion: BOQVersion = {
      id: "",
      project_id: projectId,
      version_number: nextVerNumber,
      version_label: `Revision v${nextVerNumber}`,
      status: "draft",
      grand_total: selectedBoq.grand_total,
      gst_percent: selectedBoq.gst_percent,
      discount_amount: selectedBoq.discount_amount,
      designer_fee: selectedBoq.designer_fee,
      created_by: "",
      created_at: "",
      sections: clonedSections,
    };
    const r = await addBOQVersion(newVersion);
    if (r.ok && r.id) setSelectedVersionId(r.id);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSectionId) return;
    addLineItemToBOQ(selectedBoq.id, activeSectionId, {
      description: newItemForm.description,
      unit: newItemForm.unit,
      quantity: Number(newItemForm.quantity),
      unit_rate: Number(newItemForm.unit_rate),
      remarks: newItemForm.remarks,
      sort_order: 99
    });
    setNewItemForm({ description: "", unit: "sqft", quantity: 1, unit_rate: 100, remarks: "" });
    setAddItemModalOpen(false);
  };

  // Version diff calculations for comparison
  const compareTargetBoq = boqVersions.find(b => b.id === compareVersionId) || selectedBoq;
  const netDifference = selectedBoq.grand_total - compareTargetBoq.grand_total;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            className="h-9 px-3 rounded-md border border-input bg-card text-sm shadow-sm font-medium"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
          >
            {boqVersions.map((v) => (
              <option key={v.id} value={v.id}>
                Version {v.version_number} {v.version_label ? `— ${v.version_label}` : ""}
              </option>
            ))}
          </select>
          <Badge className={cn("border-0 uppercase text-[10px] tracking-wider", getStatusColor(selectedBoq.status))}>
            {selectedBoq.status}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Created {formatDate(selectedBoq.created_at)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {boqVersions.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setCompareModalOpen(true)} className="gap-2 text-xs">
              <History className="w-3.5 h-3.5" /> Compare Versions
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateNewVersion} className="gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Save New Version
          </Button>
          {selectedBoq.status === "draft" && (
            <Button size="sm" onClick={handleSubmitForApproval} className="gradient-primary border-0 text-xs">
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {selectedBoq.status !== "draft" && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This version is locked. Create a new version to make changes.
        </div>
      )}

      {/* BOQ Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Subtotal (Excl. Tax)</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(selectedBoq.sections?.reduce((sum, s) => sum + s.subtotal, 0) || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">GST ({selectedBoq.gst_percent || 18}%)</p>
            <p className="text-xl font-bold text-muted-foreground">
              {formatCurrency(((selectedBoq.sections?.reduce((sum, s) => sum + s.subtotal, 0) || 0) * (selectedBoq.gst_percent || 18)) / 100)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Designer Fee</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(selectedBoq.designer_fee || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50/50 border-indigo-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-indigo-700 mb-1">Grand Total</p>
            <p className="text-xl font-bold text-indigo-700">{formatCurrency(selectedBoq.grand_total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* BOQ Sections Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="py-3 px-4 w-5/12">Description</th>
                <th className="py-3 px-4 w-20 text-center">Unit</th>
                <th className="py-3 px-4 w-24 text-right">Qty</th>
                <th className="py-3 px-4 w-32 text-right">Rate</th>
                <th className="py-3 px-4 w-32 text-right">Total</th>
                <th className="py-3 px-4 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedBoq.sections?.map((section) => (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr className="bg-muted/40 border-b border-border">
                    <td colSpan={4} className="py-2.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {section.room_name} — {section.category}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-right text-foreground">
                      {formatCurrency(section.subtotal)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {selectedBoq.status === 'draft' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setActiveSectionId(section.id);
                            setAddItemModalOpen(true);
                          }}
                          className="h-7 text-xs text-indigo-600 gap-1 hover:text-indigo-700"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </Button>
                      )}
                    </td>
                  </tr>

                  {/* Line Items */}
                  {section.items?.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {item.description}
                        {item.remarks && <span className="block text-xs text-muted-foreground mt-0.5">{item.remarks}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-center text-muted-foreground">{item.unit}</td>
                      <td className="py-2.5 px-4 text-right">{item.quantity}</td>
                      <td className="py-2.5 px-4 text-right">{formatCurrency(item.unit_rate)}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                      <td className="py-2.5 px-4 text-center">
                        {selectedBoq.status === 'draft' && (
                          <button
                            onClick={() => deleteLineItemFromBOQ(selectedBoq.id, section.id, item.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Approval Status Banner */}
      {selectedBoq.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800 text-sm">Digitally Approved by Client</p>
            <p className="text-green-700 text-xs mt-0.5">Approved on {formatDate(selectedBoq.approved_at!)}</p>
            {selectedBoq.approval_note && (
              <p className="text-green-800 text-sm mt-2 p-2 bg-green-100/60 rounded italic border-l-2 border-green-400">
                &ldquo;{selectedBoq.approval_note}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {selectedBoq.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800 text-sm">Revision Requested by Client</p>
            <p className="text-red-700 text-xs mt-0.5">Client reason: {selectedBoq.approval_note || "Adjustments required"}</p>
            <Button size="sm" onClick={handleCreateNewVersion} className="mt-3 gap-1 bg-red-600 hover:bg-red-700 text-white border-0 text-xs">
              <Plus className="w-3.5 h-3.5" /> Create Revision v{selectedBoq.version_number + 1}
            </Button>
          </div>
        </div>
      )}

      {/* MODAL: Add Line Item */}
      <Dialog open={addItemModalOpen} onOpenChange={setAddItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItemSubmit} className="space-y-4">
            {/* Quick Pick from Library */}
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Pick from Rate Master
              </div>
              <select 
                className="w-full text-xs p-2 rounded border border-input bg-card"
                onChange={(e) => {
                  const item = itemLibrary.find(i => i.id === e.target.value);
                  if (item) {
                    setNewItemForm({
                      ...newItemForm,
                      description: item.item_name || "",
                      unit: item.unit,
                      unit_rate: item.standard_rate || 0
                    });
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select from item library...</option>
                {itemLibrary.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.item_name} ({item.unit} @ ₹{item.standard_rate})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input 
                required
                value={newItemForm.description}
                onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                placeholder="e.g. 18mm Kalinga Stone Quartz Countertop"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <select
                  value={newItemForm.unit}
                  onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                  className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
                >
                  <option value="sqft">sqft</option>
                  <option value="RFT">RFT</option>
                  <option value="nos">nos</option>
                  <option value="lumpsum">lumpsum</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input 
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={newItemForm.quantity}
                  onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Rate (₹)</Label>
                <Input 
                  type="number"
                  min="0"
                  required
                  value={newItemForm.unit_rate}
                  onChange={(e) => setNewItemForm({ ...newItemForm, unit_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks (Optional)</Label>
              <Input 
                value={newItemForm.remarks}
                onChange={(e) => setNewItemForm({ ...newItemForm, remarks: e.target.value })}
                placeholder="e.g. Saint-Gobain 6mm toughened glass"
              />
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded text-right">
              Total: {formatCurrency(newItemForm.quantity * newItemForm.unit_rate)}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddItemModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Compare Versions */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare BOQ Versions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Comparing:</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">
                  v{selectedBoq.version_number} (Current)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={compareVersionId}
                  onChange={(e) => setCompareVersionId(e.target.value)}
                  className="text-xs p-1.5 rounded border border-input bg-card font-medium"
                >
                  {boqVersions.filter(v => v.id !== selectedBoq.id).map(v => (
                    <option key={v.id} value={v.id}>
                      Version {v.version_number} ({v.version_label || v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">Net Cost Change: </span>
                <span className={cn("text-sm font-bold", netDifference > 0 ? "text-amber-600" : "text-emerald-600")}>
                  {netDifference > 0 ? `+${formatCurrency(netDifference)}` : formatCurrency(netDifference)}
                </span>
              </div>
            </div>

            {/* Diff Comparison Table */}
            <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2.5 text-left">Item Description</th>
                    <th className="p-2.5 text-right">v{compareTargetBoq.version_number} Total</th>
                    <th className="p-2.5 text-right">v{selectedBoq.version_number} Total</th>
                    <th className="p-2.5 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedBoq.sections?.flatMap(s => s.items || []).map((item) => {
                    const oldItem = compareTargetBoq.sections?.flatMap(s => s.items || []).find(i => i.description === item.description);
                    const diff = item.total - (oldItem?.total || 0);
                    return (
                      <tr key={item.id} className={cn(
                        "hover:bg-muted/10",
                        !oldItem ? "bg-emerald-50/50" : diff !== 0 ? "bg-amber-50/50" : ""
                      )}>
                        <td className="p-2.5">
                          <span className="font-medium text-foreground">{item.description}</span>
                          {!oldItem && <span className="ml-2 text-[10px] text-emerald-600 font-bold uppercase">(Added)</span>}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {oldItem ? formatCurrency(oldItem.total) : "—"}
                        </td>
                        <td className="p-2.5 text-right font-medium">
                          {formatCurrency(item.total)}
                        </td>
                        <td className={cn("p-2.5 text-right font-semibold", diff > 0 ? "text-amber-600" : diff < 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? formatCurrency(diff) : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCompareModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Export PDF Branded Preview */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>BOQ Export Preview</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-white text-slate-800 rounded-lg border border-slate-200 shadow-sm space-y-4 print:p-0">
            {/* Document Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{studioSettings.name}</h2>
                <p className="text-xs text-slate-500">{studioSettings.tagline}</p>
                <p className="text-xs text-slate-500 mt-1">{studioSettings.address}</p>
                <p className="text-xs text-slate-500">GST: {studioSettings.gstin || "—"}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 uppercase">
                  BOQ v{selectedBoq.version_number}
                </span>
                <p className="text-xs text-slate-500 mt-2">Date: {formatDate(selectedBoq.created_at)}</p>
                <p className="text-xs font-semibold text-slate-700">Status: {selectedBoq.status.toUpperCase()}</p>
              </div>
            </div>

            {/* Sections summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Scope of Work & Quantities</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-center">Unit</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedBoq.sections?.flatMap(s => s.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center">{it.unit}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_rate)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end pt-3 border-t">
              <div className="w-56 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(selectedBoq.sections?.reduce((s, x) => s + x.subtotal, 0) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST ({selectedBoq.gst_percent || 18}%):</span>
                  <span className="font-medium">{formatCurrency(((selectedBoq.sections?.reduce((s, x) => s + x.subtotal, 0) || 0) * (selectedBoq.gst_percent || 18)) / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Designer Fee:</span>
                  <span className="font-medium">{formatCurrency(selectedBoq.designer_fee || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-1.5 text-slate-900">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(selectedBoq.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Close</Button>
            <Button onClick={() => window.print()} className="gap-2 gradient-primary border-0">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
