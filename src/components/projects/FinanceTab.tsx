"use client";

import { useRequestKey } from "@/lib/hooks/use-request-key";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { formatMoney as formatCurrency, formatDate, getStatusColor, cn, localToday } from "@/lib/utils";
import { InvoiceComposer } from "@/components/finance/InvoiceComposer";
import { cashOutflows, invoiceSummary } from "@/lib/finance/summary";
import { canRecordPayments, hasAnyRole } from "@/lib/permissions";
import { PAYMENT_MODE_LABELS, type PaymentMode, type CostType } from "@/types";
import type { Project, Invoice, Expense } from "@/types";
import { CreditNoteDialog } from "@/components/finance/CreditNoteDialog";
import { toast } from "@/components/ui/toast";
import { uploadToProject } from "@/lib/supabase/upload";

export default function FinanceTab({
  project,
  invoices,
  expenses,
}: {
  project: Project;
  invoices: Invoice[];
  expenses: Expense[];
}) {
  const {
    vendorPayments,
    cancelInvoice,
    recordPayment,
    addExpense,
    setRetention,
    releaseRetention,
    me,
    vendors,
    costControl,
    decideExpense,
  } = useAppStore();

  const requestKey=useRequestKey();
  const [savingPayment,setSavingPayment]=useState(false);
  const totals = invoiceSummary(invoices);
  const totalInvoiced = totals.invoiced;
  const totalPaid = totals.collected;
  const totalExp = cashOutflows(expenses, vendorPayments.filter(p => p.project_id === project.id)).reduce((sum, spend) => sum + spend.amount, 0);
  const netProfit = totalPaid - totalExp;

  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(
    null,
  );
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    tds: 0,
    mode: "bank_transfer" as PaymentMode,
    reference: "",
    paymentDate: localToday(),
  });

  const isFinance = hasAnyRole(me, ["owner", "finance"]);
  const projectCostRows = costControl.filter(
    (r) => r.project_id === project.id,
  );

  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    description: "",
    amount: 15000,
    vendor_id: "",
    boq_line_item_id: "",
    cost_type: "design" as CostType,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId||savingPayment) return;
    setSavingPayment(true);
    const r = await recordPayment(
      selectedInvoiceId,
      Number(paymentForm.amount),
      paymentForm.paymentDate,
      paymentForm.mode,
      paymentForm.reference || undefined,
      Number(paymentForm.tds || 0),
      requestKey({invoice_id:selectedInvoiceId,...paymentForm}),
    );
    setSavingPayment(false);
    if (r.ok) setRecordPaymentModalOpen(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    let receipt_url: string | undefined;
    if (receiptFile) {
      try {
        receipt_url = await uploadToProject(project.id, receiptFile);
      } catch (err) {
        return toast.add({
          title: "Upload failed",
          description: (err as Error).message,
          type: "error",
        });
      }
    }
    const r = await addExpense({
      project_id: project.id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      expense_date: new Date().toISOString().slice(0, 10),
      vendor_id: expenseForm.vendor_id || undefined,
      boq_line_item_id: expenseForm.boq_line_item_id || undefined,
      cost_type: expenseForm.cost_type,
      receipt_url,
    });
    if (r.ok) {
      setExpenseForm({
        category: "Materials",
        description: "",
        amount: 15000,
        vendor_id: "",
        boq_line_item_id: "",
        cost_type: "design",
      });
      setReceiptFile(null);
      setAddExpenseModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
          <span className="text-primary">
            Total Billed: {formatCurrency(totalInvoiced)}
          </span>
          <span className="text-emerald-600">
            Collected: {formatCurrency(totalPaid)}
          </span>
          <span className="text-rose-600">
            Cash outflows: {formatCurrency(totalExp)}
          </span>
          <span className="text-foreground">
            Cash position (collected − outflows): {formatCurrency(netProfit)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddExpenseModalOpen(true)}
            className="text-xs"
          >
            + Add Expense
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateInvoiceModalOpen(true)}
            className="gradient-primary border-0 text-xs"
          >
            + Create Invoice
          </Button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Invoices ({invoices.length})
        </h4>
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground">
                    {inv.invoice_number ?? "Draft"}
                  </span>
                  <Badge
                    className={cn(
                      "text-[10px] border-0 uppercase",
                      getStatusColor(inv.status),
                    )}
                  >
                    {inv.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Due: {inv.due_date ? formatDate(inv.due_date) : "—"} ·{" "}
                  {inv.notes}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-bold text-sm">
                    {formatCurrency(inv.total_amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Paid: {formatCurrency(inv.amount_paid || 0)}
                  </p>
                  {inv.tds_amount > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      TDS: {formatCurrency(inv.tds_amount)}
                    </p>
                  )}
                  {inv.credited > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Credited: {formatCurrency(inv.credited)}
                    </p>
                  )}
                  {inv.retention_held > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Retention: {formatCurrency(inv.retention_held)}
                    </p>
                  )}
                  {inv.amount_due > 0 && (
                    <p className="text-[10px] font-semibold text-amber-600">
                      Due: {formatCurrency(inv.amount_due)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {canRecordPayments(me) && inv.amount_due > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInvoiceId(inv.id);
                        setPaymentForm((prev) => ({
                          ...prev,
                          amount: inv.amount_due,
                          tds: 0,
                        }));
                        setRecordPaymentModalOpen(true);
                      }}
                      className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    >
                      Record Payment
                    </Button>
                  )}
                  {canRecordPayments(me) &&
                    (inv.status === "sent" ||
                      inv.status === "partial" ||
                      inv.status === "overdue") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCreditNoteInvoice(inv)}
                        className="text-xs"
                      >
                        Credit note
                      </Button>
                    )}
                  {canRecordPayments(me) &&
                    inv.status === "sent" &&
                    (inv.amount_paid || 0) === 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Cancel invoice ${inv.invoice_number ?? "Draft"}?`,
                            )
                          ) {
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
              {project.engagement_type === "design_and_execution" &&
                inv.status !== "draft" && (
                  <div className="w-full flex items-center gap-2 mt-2 pt-2 border-t text-xs">
                    <label
                      htmlFor={`ret-${inv.id}`}
                      className="text-muted-foreground"
                    >
                      Retention (₹):
                    </label>
                    <Input
                      id={`ret-${inv.id}`}
                      type="number"
                      min="0"
                      className="w-28 h-7 text-xs"
                      defaultValue={inv.retention_amount}
                      onBlur={(e) =>
                        setRetention(inv.id, Number(e.target.value) || 0)
                      }
                    />
                    {inv.retention_held > 0 && !inv.retention_released_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => releaseRetention(inv.id)}
                      >
                        Release retention
                      </Button>
                    )}
                    {inv.retention_released_at && (
                      <Badge variant="outline" className="text-[10px]">
                        Retention released
                      </Badge>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Project Expenses ({expenses.length})
        </h4>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Amount</th>
                  {isFinance && <th className="p-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((exp) => {
                  const vendor = vendors.find((v) => v.id === exp.vendor_id);
                  return (
                    <tr key={exp.id}>
                      <td className="p-2.5">{formatDate(exp.expense_date)}</td>
                      <td className="p-2.5 font-medium">
                        {exp.category}
                        {exp.cost_type && (
                          <span className="block text-[10px] text-muted-foreground capitalize">
                            {exp.cost_type}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        <div>{exp.description}</div>
                        {vendor && (
                          <div className="text-[10px] text-foreground font-medium">
                            Vendor: {vendor.name}
                          </div>
                        )}
                        {exp.receipt_url && (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-primary hover:underline"
                          >
                            View receipt
                          </a>
                        )}
                      </td>
                      <td className="p-2.5">
                        {exp.status === "pending" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            Pending approval
                          </Badge>
                        ) : exp.status === "approved" ? (
                          <Badge variant="outline" className="text-emerald-700">
                            Approved
                          </Badge>
                        ) : exp.status === "rejected" ? (
                          <Badge variant="outline" className="text-rose-700">
                            Rejected
                          </Badge>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </td>
                      {isFinance && (
                        <td className="p-2.5 text-right">
                          {exp.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => decideExpense(exp.id, true)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const note = window.prompt(
                                    "Reason for rejecting expense?",
                                  );
                                  if (note !== null)
                                    decideExpense(
                                      exp.id,
                                      false,
                                      note || undefined,
                                    );
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODAL: Create Invoice */}
      {createInvoiceModalOpen && <InvoiceComposer projectId={project.id} onClose={() => setCreateInvoiceModalOpen(false)} />}

      {/* MODAL: Record Payment */}
      <Dialog
        open={recordPaymentModalOpen}
        onOpenChange={setRecordPaymentModalOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment Received</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input aria-label="Amount Received (₹)"
                type="number"
                required
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">TDS deducted (₹)</Label>
              <Input aria-label="TDS deducted (₹)"
                type="number"
                min="0"
                value={paymentForm.tds}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    tds: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input aria-label="Payment Date"
                type="date"
                required
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <select aria-label="Payment Mode"
                value={paymentForm.mode}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    mode: e.target.value as PaymentMode,
                  })
                }
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                {Object.entries(PAYMENT_MODE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction Reference / UTR</Label>
              <Input aria-label="Transaction Reference / UTR"
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, reference: e.target.value })
                }
                placeholder="Optional reference"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecordPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={savingPayment} type="submit" className="gradient-primary border-0">
                {savingPayment?"Saving…":"Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Expense */}
      <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Project Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Expense Category</Label>
              <select aria-label="Expense Category"
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
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
              <Input aria-label="Description"
                required
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                placeholder="e.g. Plywood transport crane charges"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input aria-label="Amount (₹)"
                type="number"
                required
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor (optional)</Label>
              <select aria-label="Vendor (optional)"
                value={expenseForm.vendor_id}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, vendor_id: e.target.value })
                }
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                <option value="">None</option>
                {vendors
                  .filter((v) => v.status !== "blacklisted")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
              </select>
            </div>
            {projectCostRows.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">BOQ line (optional)</Label>
                <select aria-label="BOQ line (optional)"
                  value={expenseForm.boq_line_item_id}
                  onChange={(e) => {
                    const lineId = e.target.value;
                    setExpenseForm({
                      ...expenseForm,
                      boq_line_item_id: lineId,
                      cost_type: lineId ? "execution" : expenseForm.cost_type,
                    });
                  }}
                  className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
                >
                  <option value="">None (general expense)</option>
                  {projectCostRows.map((r) => (
                    <option key={r.line_item_id} value={r.line_item_id}>
                      {r.category} · {r.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Receipt scan (PDF/image)</Label>
              <Input aria-label="Receipt scan (PDF/image)"
                type="file"
                accept="application/pdf,image/*"
                className="text-xs h-9"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0">
                Log Expense
              </Button>
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
