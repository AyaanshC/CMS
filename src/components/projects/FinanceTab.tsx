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
import type { Project, Invoice, Expense } from "@/types";

export default function FinanceTab({
  project,
  invoices,
  expenses,
}: {
  project: Project;
  invoices: Invoice[];
  expenses: Expense[];
}) {
  const { addInvoice, recordPayment, addExpense } = useAppStore();

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalExp = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalPaid - totalExp;

  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: `STU-INV-2024-00${invoices.length + 1}`,
    subtotal: 250000,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: "Payment due for Phase 2 carpentry & electrical works."
  });

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    mode: "bank_transfer",
    reference: "HDFC-REF-8921"
  });

  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    description: "",
    amount: 15000,
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const gst = (invoiceForm.subtotal * 18) / 100;
    const total = invoiceForm.subtotal + gst;
    const newInv: Invoice = {
      id: 'inv-' + Date.now(),
      project_id: project.id,
      project_name: project.name,
      client_name: project.client_name,
      invoice_number: invoiceForm.invoiceNumber,
      status: 'sent',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: invoiceForm.dueDate,
      subtotal: invoiceForm.subtotal,
      discount: 0,
      gst_rate: 18,
      gst_amount: gst,
      total_amount: total,
      amount_paid: 0,
      amount_due: total,
      notes: invoiceForm.notes
    };
    addInvoice(newInv);
    setCreateInvoiceModalOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    recordPayment(selectedInvoiceId, Number(paymentForm.amount), new Date().toISOString().split('T')[0], paymentForm.mode, paymentForm.reference);
    setRecordPaymentModalOpen(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense({
      id: 'exp-' + Date.now(),
      project_id: project.id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      expense_date: new Date().toISOString().split('T')[0]
    });
    setExpenseForm({ category: "Materials", description: "", amount: 15000 });
    setAddExpenseModalOpen(false);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-xs font-semibold">
          <span className="text-indigo-600">Total Billed: {formatCurrency(totalInvoiced)}</span>
          <span className="text-emerald-600">Collected: {formatCurrency(totalPaid)}</span>
          <span className="text-rose-600">Expenses: {formatCurrency(totalExp)}</span>
          <span className="text-foreground">Net Margin: {formatCurrency(netProfit)}</span>
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
                  <span className="font-bold text-sm text-foreground">{inv.invoice_number}</span>
                  <Badge className={cn("text-[10px] border-0 uppercase", getStatusColor(inv.status))}>{inv.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Due: {inv.due_date ? formatDate(inv.due_date) : "—"} · {inv.notes}</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(inv.total_amount)}</p>
                  <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(inv.amount_paid || 0)}</p>
                </div>
                {inv.amount_due > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoiceId(inv.id);
                      setPaymentForm({ ...paymentForm, amount: inv.amount_due });
                      setRecordPaymentModalOpen(true);
                    }}
                    className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  >
                    Record Payment
                  </Button>
                )}
              </div>
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
            <div className="space-y-1">
              <Label className="text-xs">Invoice Number</Label>
              <Input 
                required 
                value={invoiceForm.invoiceNumber} 
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
              />
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
            <div className="p-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded text-right">
              Total with 18% GST: {formatCurrency(invoiceForm.subtotal * 1.18)}
            </div>
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
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction Reference / UTR</Label>
              <Input 
                value={paymentForm.reference} 
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
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
    </>
  );
}
