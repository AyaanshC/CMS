"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Plus, MoreHorizontal, Download, IndianRupee, Clock, ArrowUpRight,
  CheckCircle2, AlertCircle, Building2, CreditCard, Check, Receipt, Printer
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { Invoice } from "@/types";

export default function InvoicesPage() {
  const { invoices, projects, clients, studioSettings, addInvoice, recordPayment } = useAppStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  const [invoiceTitle, setInvoiceTitle] = useState("Carpentry & Wardrobe Milestone (40%)");
  const [subtotal, setSubtotal] = useState(250000);
  const [dueDate, setDueDate] = useState("2025-01-15");

  // Record Payment Modal State
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");

  // Invoice PDF View Modal State
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.project_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || inv.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    const gstPercent = studioSettings.gst_rate || 18;
    const tax = Math.round((subtotal * gstPercent) / 100);
    const total = subtotal + tax;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
      project_id: proj.id,
      project_name: proj.name,
      client_name: proj.client_name,
      issue_date: new Date().toISOString(),
      due_date: new Date(dueDate).toISOString(),
      subtotal,
      discount: 0,
      gst_rate: gstPercent,
      gst_amount: tax,
      total_amount: total,
      amount_paid: 0,
      amount_due: total,
      status: "sent",
      items: [
        {
          id: `item_${Date.now()}`,
          description: invoiceTitle,
          quantity: 1,
          unit_rate: subtotal,
          amount: subtotal,
        },
      ],
    };

    addInvoice(newInvoice);
    setShowCreateModal(false);
  };

  const openPaymentModal = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPaymentAmount(inv.amount_due);
    setPaymentRef(`TXN-${Date.now().toString().slice(-6)}`);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || paymentAmount <= 0) return;

    recordPayment(paymentInvoice.id, paymentAmount, paymentDate, paymentMode, paymentRef);
    setPaymentInvoice(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <TopBar title="Invoices & Finance" subtitle={`${invoices.length} total invoices issued`} />
      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <IndianRupee className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Invoiced</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("shadow-sm", overdueCount > 0 ? "border-red-200 bg-red-50/50" : "")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overdue Invoices</p>
                <p className="text-xl font-bold text-red-600">{overdueCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, client or project…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-input rounded-md px-2.5 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="issued">Issued / Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 gradient-primary border-0 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>

        {/* Invoices Table */}
        <Card className="shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Invoice No.</TableHead>
                <TableHead>Client & Project</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="w-12 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-semibold text-foreground">
                    <button
                      type="button"
                      onClick={() => setViewInvoice(inv)}
                      className="hover:underline text-indigo-600 font-mono text-xs flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {inv.invoice_number}
                    </button>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{inv.client_name}</p>
                    <Link
                      href={`/projects/${inv.project_id}`}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      {inv.project_name} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-foreground">Issued: {inv.issue_date ? formatDate(inv.issue_date) : "—"}</p>
                    <p className="text-[11px] text-muted-foreground">Due: {inv.due_date ? formatDate(inv.due_date) : "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] border-0", getStatusColor(inv.status))}>
                      {inv.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(inv.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.amount_due > 0 ? (
                      <span className="font-bold text-amber-600 text-sm">
                        {formatCurrency(inv.amount_due)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-xs font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer border-0 bg-transparent text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewInvoice(inv)}>
                          <Receipt className="w-3.5 h-3.5 mr-2 text-indigo-600" /> View & Print Invoice
                        </DropdownMenuItem>
                        {inv.amount_due > 0 && (
                          <DropdownMenuItem
                            onClick={() => openPaymentModal(inv)}
                            className="text-emerald-700 font-medium"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Record Payment
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No invoices found</p>
              <p className="text-xs mt-0.5">Try clearing the search or filter query.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tax Invoice</DialogTitle>
            <DialogDescription>
              Issue an invoice for project milestones or custom deliverable phases.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Select Project *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.client_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Milestone Description *</label>
              <Input
                required
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
                placeholder="e.g. Carpentry Work 40% Advance"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Subtotal (₹) *</label>
                <Input
                  type="number"
                  required
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Due Date *</label>
                <Input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({studioSettings.gst_rate}%):</span>
                <span className="font-semibold">{formatCurrency((subtotal * studioSettings.gst_rate) / 100)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold text-sm text-foreground">
                <span>Total Invoice Value:</span>
                <span>{formatCurrency(subtotal * (1 + studioSettings.gst_rate / 100))}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0 text-white">
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      {paymentInvoice && (
        <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Payment for {paymentInvoice.invoice_number}
              </DialogTitle>
              <DialogDescription>
                Client: {paymentInvoice.client_name} · Due: {formatCurrency(paymentInvoice.amount_due)}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Amount Received (₹) *</label>
                <Input
                  type="number"
                  max={paymentInvoice.amount_due}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Payment Date *</label>
                  <Input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Transaction Ref / Cheque No.</label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR194820129"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setPaymentInvoice(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5">
                  <Check className="w-4 h-4" /> Save Receipt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice PDF / View Dialog */}
      {viewInvoice && (
        <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
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
                  <p className="text-xs text-muted-foreground">PAN: {studioSettings.pan}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    TAX INVOICE
                  </span>
                  <p className="text-lg font-bold text-indigo-600 font-mono">{viewInvoice.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">Issued: {viewInvoice.issue_date ? formatDate(viewInvoice.issue_date) : "—"}</p>
                  <p className="text-xs text-muted-foreground">Due: {viewInvoice.due_date ? formatDate(viewInvoice.due_date) : "—"}</p>

                  {viewInvoice.status === "paid" && (
                    <div className="mt-2 inline-block border-2 border-emerald-500 text-emerald-600 font-extrabold text-xs px-2.5 py-0.5 rounded tracking-widest uppercase rotate-[-6deg]">
                      PAID
                    </div>
                  )}
                </div>
              </div>

              {/* Billed To & Project */}
              <div className="bg-slate-50 p-3 rounded-lg border border-border text-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground block font-medium mb-0.5">Billed To:</span>
                  <p className="font-bold text-sm text-foreground">{viewInvoice.client_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium mb-0.5">Project:</span>
                  <p className="font-semibold text-foreground">{viewInvoice.project_name}</p>
                </div>
              </div>

              {/* Line Items */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewInvoice.items && viewInvoice.items.length > 0 ? (
                    viewInvoice.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-3 font-medium text-foreground">{it.description}</td>
                        <td className="py-3 text-center text-muted-foreground">{it.quantity}</td>
                        <td className="py-3 text-right text-muted-foreground">{formatCurrency(it.unit_rate || 0)}</td>
                        <td className="py-3 text-right font-semibold">{formatCurrency(it.amount || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 font-medium text-foreground">Project Milestone Payment</td>
                      <td className="py-3 text-center text-muted-foreground">1</td>
                      <td className="py-3 text-right text-muted-foreground">{formatCurrency(viewInvoice.subtotal)}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(viewInvoice.subtotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({studioSettings.gst_rate}%):</span>
                  <span>{formatCurrency(viewInvoice.gst_amount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(viewInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(viewInvoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-600">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(viewInvoice.amount_due)}</span>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-50 rounded-lg border border-border text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Bank Payment Instructions:</p>
                <p>Beneficiary: {studioSettings.bank_details.account_name}</p>
                <p>Account: {studioSettings.bank_details.account_number} | IFSC: {studioSettings.bank_details.ifsc_code} | Bank: {studioSettings.bank_details.bank_name}</p>
                <p>UPI ID: {studioSettings.bank_details.upi_id}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setViewInvoice(null)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="gradient-primary border-0 text-white gap-1.5">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
