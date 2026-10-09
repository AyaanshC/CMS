"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { invoiceAmounts } from "@/lib/finance/money";
import { canRecordPayments } from "@/lib/permissions";
import { PAYMENT_MODE_LABELS, type PaymentMode } from "@/types";
import type { Project, Invoice, Expense } from "@/types";
import { CreditNoteDialog } from "@/components/finance/CreditNoteDialog";

export default function FinanceTab({
  project,
  invoices,
  expenses,
}: {
  project: Project;
  invoices: Invoice[];
  expenses: Expense[];
}) {
  const { addInvoice, cancelInvoice, recordPayment, addExpense, setRetention, releaseRetention, studioSettings, me } = useAppStore();

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalExp = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalPaid - totalExp;

  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    subtotal: 250000,
    dueDate: "",
    notes: "Payment due for Phase 2 carpentry & electrical works.",
    send: true,
  });

  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    tds: 0,
    mode: "bank_transfer" as PaymentMode,
    reference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    description: "",
    amount: 15000,
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await addInvoice({
      project_id: project.id,
      subtotal: invoiceForm.subtotal,
      discount: 0,
      gst_rate: studioSettings.gst_rate,
      due_date: invoiceForm.dueDate,
      notes: invoiceForm.notes,
      send: invoiceForm.send,
    });
    if (r.ok) setCreateInvoiceModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    const r = await recordPayment(
      selectedInvoiceId,
      Number(paymentForm.amount),
      paymentForm.paymentDate,
      paymentForm.mode,
      paymentForm.reference || undefined,
      Number(paymentForm.tds || 0)
    );
    if (r.ok) setRecordPaymentModalOpen(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await addExpense({
      project_id: project.id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      expense_date: new Date().toISOString().slice(0, 10),
    });
    if (r.ok) {
      setExpenseForm({ category: "Materials", description: "", amount: 15000 });
      setAddExpenseModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-xs font-semibold">
          <span className="text-indigo-600">Total Billed: {formatCurrency(totalInvoiced)}</span>
          <span className="text-emerald-600">Collected: {formatCurrency(totalPaid)}</span>
          <span className="text-rose-600">Expenses: {formatCurrency(totalExp)}</span>
          <span className="text-foreground">Cash position (collected − expenses): {formatCurrency(netProfit)}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddExpenseModalOpen(true)} className="text-xs">
            + Add Expense
          </Button>
          <Button size="sm" onClick={() => setCreateInvoiceModalOpen(true)} className="gradient-primary border-0 text-xs">
            + Create Invoice
          </Button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoices ({invoices.length})</h4>
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground">{inv.invoice_number ?? "Draft"}</span>
                  <Badge className={cn("text-[10px] border-0 uppercase", getStatusColor(inv.status))}>{inv.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Due: {inv.due_date ? formatDate(inv.due_date) : "—"} · {inv.notes}</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(inv.total_amount)}</p>
                  <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(inv.amount_paid || 0)}</p>
                  {inv.tds_amount > 0 && <p className="text-[10px] text-muted-foreground">TDS: {formatCurrency(inv.tds_amount)}</p>}
                  {inv.credited > 0 && <p className="text-[10px] text-muted-foreground">Credited: {formatCurrency(inv.credited)}</p>}
                  {inv.retention_held > 0 && <p className="text-[10px] text-muted-foreground">Retention: {formatCurrency(inv.retention_held)}</p>}
                  {inv.amount_due > 0 && <p className="text-[10px] font-semibold text-amber-600">Due: {formatCurrency(inv.amount_due)}</p>}
                </div>
                <div className="flex gap-2">
                  {canRecordPayments(me) && inv.amount_due > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedInvoiceId(inv.id);
                        setPaymentForm((prev) => ({ ...prev, amount: inv.amount_due, tds: 0 }));
                        setRecordPaymentModalOpen(true);
                      }}
                      className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    >
                      Record Payment
                    </Button>
                  )}
                  {canRecordPayments(me) && (inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreditNoteInvoice(inv)}
                      className="text-xs"
                    >
                      Credit note
                    </Button>
                  )}
                  {canRecordPayments(me) && inv.status === "sent" && (inv.amount_paid || 0) === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (window.confirm(`Cancel invoice ${inv.invoice_number ?? "Draft"}?`)) {
                          await cancelInvoice(inv.id);
                        }
                      }}
                      className="text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
                    >
                      Cancel invoice
                    </Button>
                  )}
                </div>
              </div>
              {project.engagement_type === "design_and_execution" && inv.status !== "draft" && (
                <div className="w-full flex items-center gap-2 mt-2 pt-2 border-t text-xs">
                  <label htmlFor={`ret-${inv.id}`} className="text-muted-foreground">Retention (₹):</label>
                  <Input
                    id={`ret-${inv.id}`}
                    type="number"
                    min="0"
                    className="w-28 h-7 text-xs"
                    defaultValue={inv.retention_amount}
                    onBlur={(e) => setRetention(inv.id, Number(e.target.value) || 0)}
                  />
                  {inv.retention_held > 0 && !inv.retention_released_at && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => releaseRetention(inv.id)}>
                      Release retention
                    </Button>
                  )}
                  {inv.retention_released_at && (
                    <Badge variant="outline" className="text-[10px]">Retention released</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Expenses ({expenses.length})</h4>
        <Card>
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground border-b">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td className="p-2.5">{formatDate(exp.expense_date)}</td>
                  <td className="p-2.5 font-medium">{exp.category}</td>
                  <td className="p-2.5 text-muted-foreground">{exp.description}</td>
                  <td className="p-2.5 text-right font-semibold text-rose-600">{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* MODAL: Create Invoice */}
      <Dialog open={createInvoiceModalOpen} onOpenChange={setCreateInvoiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="send-now"
                checked={invoiceForm.send}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, send: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="send-now" className="text-xs cursor-pointer">Send now (assigns the invoice number)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Subtotal (₹)</Label>
                <Input 
                  type="number"
                  required 
                  value={invoiceForm.subtotal} 
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input 
                  type="date"
                  required
                  value={invoiceForm.dueDate} 
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / Milestones</Label>
              <Textarea 
                value={invoiceForm.notes} 
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            {(() => {
              const preview = invoiceAmounts({ subtotal: invoiceForm.subtotal, discount: 0, gstRate: studioSettings.gst_rate });
              return (
                <div className="p-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded text-right space-y-0.5">
                  <div>Taxable: {formatCurrency(preview.taxable)} · GST ({studioSettings.gst_rate}%): {formatCurrency(preview.gst)}</div>
                  <div>Total: {formatCurrency(preview.total)}</div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateInvoiceModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Generate Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Record Payment */}
      <Dialog open={recordPaymentModalOpen} onOpenChange={setRecordPaymentModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment Received</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input 
                type="number"
                required 
                value={paymentForm.amount} 
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">TDS deducted (₹)</Label>
              <Input 
                type="number"
                min="0"
                value={paymentForm.tds} 
                onChange={(e) => setPaymentForm({ ...paymentForm, tds: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input 
                type="date"
                required
                value={paymentForm.paymentDate} 
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value as PaymentMode })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                {Object.entries(PAYMENT_MODE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction Reference / UTR</Label>
              <Input 
                value={paymentForm.reference} 
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Expense */}
      <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Project Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Expense Category</Label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                <option value="Materials">Materials</option>
                <option value="Labor">Labor</option>
                <option value="Transport">Transport</option>
                <option value="Consultant">Consultant</option>
                <option value="Misc">Miscellaneous</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input 
                required 
                value={expenseForm.description} 
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g. Plywood transport crane charges"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input 
                type="number"
                required 
                value={expenseForm.amount} 
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddExpenseModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Log Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {creditNoteInvoice && (
        <CreditNoteDialog
          invoice={creditNoteInvoice}
          open={!!creditNoteInvoice}
          onOpenChange={(o) => !o && setCreditNoteInvoice(null)}
        />
      )}
    </>
  );
}
