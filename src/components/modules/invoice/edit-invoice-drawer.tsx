"use client";

import { useState, useEffect, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Check, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invoice, InvoiceStatus, PaymentStatus } from "@/lib/types";
import {
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  contactsForCustomer,
  FieldLabel,
} from "./_helpers";

/**
 * EditInvoiceDrawer - focused editor for an existing Invoice.
 *
 * Only Draft invoices are editable in production (the GSTN-compliant flow
 * locks down Sent/Paid/Cancelled). The parent component is responsible for
 * gating the trigger; this drawer just renders the form when called.
 *
 * Task 15-d: also surfaces an "Assign To" picker (parity with the Add drawer)
 * so the finance user can refine the recipient set without leaving the edit
 * context.
 *
 * Hick's Law: 8 fields - customer, dates, amount, tax, totals, status +
 * the assign-to picker below the form.
 */
interface EditInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onUpdate?: (id: string, data: Partial<Invoice>) => void;
  /** Current assigned contact IDs (Task 15-d). */
  assignedContactIds?: string[];
  /** Update the assigned-contact list (Task 15-d). */
  onAssign?: (invoice: Invoice, contactIds: string[]) => void;
}

interface EditForm {
  customer: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  taxAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
}

function fromInvoice(i: Invoice): EditForm {
  return {
    customer: i.customer,
    invoiceDate: i.invoiceDate.slice(0, 10),
    dueDate: i.dueDate.slice(0, 10),
    amount: String(i.amount),
    taxAmount: String(i.taxAmount),
    totalAmount: String(i.totalAmount),
    status: i.status,
    paymentStatus: i.paymentStatus,
  };
}

function toPatch(form: EditForm): Partial<Invoice> {
  return {
    customer: form.customer.trim(),
    invoiceDate: new Date(form.invoiceDate).toISOString(),
    dueDate: new Date(form.dueDate).toISOString(),
    amount: Number(form.amount) || 0,
    taxAmount: Number(form.taxAmount) || 0,
    totalAmount: Number(form.totalAmount) || 0,
    status: form.status,
    paymentStatus: form.paymentStatus,
  };
}

const EMPTY_INVOICE: Invoice = {
  id: "",
  invoiceNumber: "",
  customer: "",
  invoiceDate: new Date().toISOString(),
  dueDate: new Date().toISOString(),
  amount: 0,
  taxAmount: 0,
  totalAmount: 0,
  status: "Draft",
  paymentStatus: "Unpaid",
};

export function EditInvoiceDrawer({
  open,
  onClose,
  invoice,
  onUpdate,
  assignedContactIds,
  onAssign,
}: EditInvoiceDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    invoice ? fromInvoice(invoice) : fromInvoice(EMPTY_INVOICE),
  );
  // Task 15-d: local draft of assigned contact IDs. Kept in sync via the
  // `key` remount pattern (parent passes a stable key based on the assigned
  // set), so we only initialize once per mount.
  const [draftAssignees, setDraftAssignees] = useState<string[]>(
    assignedContactIds ?? [],
  );

  useEffect(() => {
    if (!open) return;
    if (!invoice) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on open
    setForm(fromInvoice(invoice));
    setDraftAssignees(assignedContactIds ?? []);
  }, [open, invoice?.id, invoice, assignedContactIds]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const toggleAssignee = (id: string) => {
    setDraftAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const customerContacts = useMemo(
    () => (invoice ? contactsForCustomer(invoice.customer) : []),
    [invoice],
  );

  const handleSubmit = () => {
    if (!invoice) return;
    if (!form.customer.trim()) {
      toast("Customer is required");
      return;
    }
    if (onUpdate) {
      onUpdate(invoice.id, toPatch(form));
    }
    // Persist the assignee draft alongside the invoice patch (Task 15-d).
    // Only call onAssign if the set actually changed to avoid a spurious
    // activity-log entry.
    const original = assignedContactIds ?? [];
    const changed =
      draftAssignees.length !== original.length ||
      draftAssignees.some((id, i) => id !== original[i]);
    if (onAssign && changed) {
      onAssign(invoice, draftAssignees);
    }
    toast.success("Invoice updated", {
      description: `${invoice.invoiceNumber} · ${form.customer}`,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit Invoice
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {invoice ? `${invoice.invoiceNumber} · ${invoice.customer}` : "Update invoice"}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => update("customer", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
              <div>
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => update("invoiceDate", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => update("dueDate", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <Label>Taxable Amount (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <Label>Tax Amount (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={form.taxAmount}
                  onChange={(e) => update("taxAmount", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <Label>Total Amount (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={form.totalAmount}
                  onChange={(e) => update("totalAmount", e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v as InvoiceStatus)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select value={form.paymentStatus} onValueChange={(v) => update("paymentStatus", v as PaymentStatus)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task 15-d: Assign To — parity with the Add Invoice drawer. */}
            {onAssign && (
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Assign To
                    </span>
                  </div>
                  <span className="tabular text-[11px] text-muted-foreground">
                    {draftAssignees.length} selected
                  </span>
                </div>
                {customerContacts.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    No contacts on file for this customer.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {customerContacts.map((c) => {
                      const checked = draftAssignees.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-2 transition-colors",
                            checked
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:bg-accent/40",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAssignee(c.id)}
                          />
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-foreground">
                                {c.name}
                              </span>
                              <span className="text-[11px] tabular text-muted-foreground">
                                {c.email} · {c.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.isPrimary && (
                                <StatusBadge variant="solid">Primary</StatusBadge>
                              )}
                              <StatusBadge variant="outline">{c.role}</StatusBadge>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Saved assignees will receive the invoice when it is released.
                </p>
              </div>
            )}

            {/* Helpful hint */}
            <div className="rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              <FieldLabel hint="production guard">
                Edit scope
              </FieldLabel>
              Only Draft invoices are editable. Once an invoice is Sent /
              Paid / Cancelled, the GSTN-compliant flow locks the record.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
          >
            Save Changes
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
