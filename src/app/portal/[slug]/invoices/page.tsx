"use client";

import { useState } from "react";
import { use, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Receipt, Download, CheckCircle2, Clock, Copy, Check, Building2,
  CreditCard, ShieldCheck, FileText, ArrowUpRight
} from "lucide-react";
import { Invoice } from "@/types";

export default function PortalInvoicesPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading invoices...</div>}>
      <PortalInvoicesContent params={params} />
    </Suspense>
  );
}

function PortalInvoicesContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, invoices, clients, studioSettings } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  const client = clients.find((c) => c.id === project?.client_id);
  const projectInvoices = invoices.filter((i) => i.project_id === project?.id);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  }

  const totalInvoiced = projectInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = projectInvoices.reduce((s, i) => s + i.amount_paid, 0);
  const totalDue = projectInvoices.reduce((s, i) => s + i.amount_due, 0);

  const copyUpiId = () => {
    if (studioSettings.bank_details.upi_id) {
      navigator.clipboard.writeText(studioSettings.bank_details.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices & Payment Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Track milestone billing, download tax invoices, and view studio bank transfer details.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Invoiced Value</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(totalInvoiced)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across {projectInvoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-emerald-50/50 border-emerald-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-800">Total Amount Paid</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Receipts acknowledged</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-amber-50/50 border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-800">Outstanding Balance</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatCurrency(totalDue)}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Payable as per milestones</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank & NEFT/UPI Payment Details */}
      <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-950">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Official Bank & Transfer Details
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-white border-indigo-200 text-indigo-700">
              Verified Studio Account
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Beneficiary Name</p>
              <p className="font-semibold text-foreground mt-0.5">{studioSettings.bank_details.account_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Bank & Branch</p>
              <p className="font-semibold text-foreground mt-0.5">{studioSettings.bank_details.bank_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account Number / IFSC</p>
              <p className="font-semibold text-foreground mt-0.5">
                {studioSettings.bank_details.account_number} <br />
                <span className="text-indigo-600 font-mono text-[11px]">{studioSettings.bank_details.ifsc_code}</span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">UPI ID for Quick Transfer</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono font-bold text-foreground text-xs">
                  {studioSettings.bank_details.upi_id}
                </span>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="p-1 rounded hover:bg-white text-muted-foreground transition-colors"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Invoices ({projectInvoices.length})</h2>

        {projectInvoices.map((inv) => (
          <Card
            key={inv.id}
            className="shadow-sm hover:border-indigo-200 transition-all cursor-pointer"
            onClick={() => setSelectedInvoice(inv)}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-700">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">{inv.invoice_number}</p>
                    <Badge className={cn("text-[10px] border-0", getStatusColor(inv.status))}>
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Issued: {inv.issue_date ? formatDate(inv.issue_date) : "—"} · Due: {inv.due_date ? formatDate(inv.due_date) : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                <div className="text-right">
                  <p className="font-bold text-base text-foreground">
                    {formatCurrency(inv.total_amount)}
                  </p>
                  {inv.amount_due > 0 ? (
                    <p className="text-xs font-semibold text-amber-600">
                      {formatCurrency(inv.amount_due)} due
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" /> Fully Paid
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInvoice(inv);
                  }}
                >
                  <FileText className="w-3.5 h-3.5" /> View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {projectInvoices.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No invoices generated yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invoices will be published here as project milestones are completed.
            </p>
          </div>
        )}
      </div>

      {/* Invoice PDF / View Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-white space-y-6">
              {/* Studio Header */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold mb-2">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{studioSettings.name}</h2>
                  <p className="text-xs text-muted-foreground">{studioSettings.address}</p>
                  <p className="text-xs text-muted-foreground">GSTIN: {studioSettings.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    TAX INVOICE
                  </span>
                  <p className="text-lg font-bold text-indigo-600">{selectedInvoice.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">Date: {selectedInvoice.issue_date ? formatDate(selectedInvoice.issue_date) : "—"}</p>
                  <p className="text-xs text-muted-foreground">Due: {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : "—"}</p>

                  {selectedInvoice.status === "paid" && (
                    <div className="mt-2 inline-block border-2 border-emerald-500 text-emerald-600 font-extrabold text-xs px-2.5 py-0.5 rounded tracking-widest uppercase rotate-[-6deg]">
                      PAID
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-slate-50 p-3 rounded-lg border border-border text-xs">
                <span className="text-muted-foreground block font-medium mb-0.5">Billed To:</span>
                <p className="font-bold text-sm text-foreground">{client?.full_name || selectedInvoice.client_name}</p>
                <p className="text-muted-foreground">{project.name}</p>
                <p className="text-muted-foreground">{project.property_address}</p>
                {client?.phone && <p className="text-muted-foreground">Phone: {client.phone}</p>}
              </div>

              {/* Items Table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left uppercase">
                    <th className="py-2">Milestone / Description</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3">
                      <p className="font-semibold text-foreground text-sm">
                        Project Milestone Payment
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        As per approved agreement and work completion stage.
                      </p>
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(selectedInvoice.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({studioSettings.gst_rate}%):</span>
                  <span>{formatCurrency(selectedInvoice.gst_amount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-600">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(selectedInvoice.amount_due)}</span>
                </div>
              </div>

              {/* Bank Details in Invoice */}
              <div className="p-3 bg-slate-50 rounded-lg border border-border text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Payment Instructions:</p>
                <p>Transfer via NEFT/RTGS to: {studioSettings.bank_details.account_name}</p>
                <p>A/C: {studioSettings.bank_details.account_number} | IFSC: {studioSettings.bank_details.ifsc_code} | Bank: {studioSettings.bank_details.bank_name}</p>
                <p>UPI ID: {studioSettings.bank_details.upi_id}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="gradient-primary border-0 text-white gap-1.5">
                <Download className="w-4 h-4" /> Print / Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
