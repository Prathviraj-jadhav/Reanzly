"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  Banknote,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Invoice } from "@/lib/types";
import {
  PAYMENT_MODES,
  formatINR,
  formatDate,
  FieldLabel,
  type RecordPaymentForm,
} from "./_helpers";

interface RecordPaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  /** Called when a payment is recorded so the parent can mutate invoice state. */
  onPaymentRecorded?: (invoice: Invoice, received: number, isFull: boolean) => void;
}

export function RecordPaymentDrawer({
  open,
  onClose,
  invoice,
  onPaymentRecorded,
}: RecordPaymentDrawerProps) {
  const [form, setForm] = useState<RecordPaymentForm>(() => ({
    paymentDate: new Date().toISOString(),
    amountReceived: invoice ? String(invoice.totalAmount) : "",
    paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
    transactionRef: "",
    notes: "",
  }));

  // Reset form when invoice changes
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  if (invoice && invoice.id !== lastInvoiceId) {
    setLastInvoiceId(invoice.id);
    setForm({
      paymentDate: new Date().toISOString(),
      amountReceived: String(invoice.totalAmount),
      paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
      transactionRef: "",
      notes: "",
    });
  }

  const update = <K extends keyof RecordPaymentForm>(
    k: K,
    v: RecordPaymentForm[K],
  ) => setForm((s) => ({ ...s, [k]: v }));

  const received = Number(form.amountReceived) || 0;
  const total = invoice?.totalAmount ?? 0;
  const balanceAfter = total - received;
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!invoice) return errs;
    if (received <= 0) errs.push("Amount must be greater than zero");
    if (received > total) errs.push("Amount exceeds invoice total");
    if (!form.paymentMode) errs.push("Payment mode is required");
    return errs;
  }, [received, total, form.paymentMode, invoice]);

  const isFullPayment = received === total;
  const isPartial = received > 0 && received < total;

  const handleSubmit = () => {
    if (errors.length) {
      toast("Cannot record payment", { description: errors[0] });
      return;
    }
    if (!invoice) return;
    const newStatus: Invoice["paymentStatus"] = isFullPayment ? "Paid" : "Partially Paid";
    if (onPaymentRecorded) {
      onPaymentRecorded(invoice, received, isFullPayment);
    }
    toast.success("Payment recorded", {
      description: `${invoice.invoiceNumber} · ${formatINR(received)} · ${newStatus}`,
    });
    onClose();
  };

  const toInputDate = (iso: string) => iso.slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[16px] font-medium tracking-tight">
              Record Payment
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {invoice
                ? `Against ${invoice.invoiceNumber} · ${invoice.customer}`
                : "Select an invoice first"}
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

        {/* Invoice summary */}
        {invoice && (
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Invoice
                </div>
                <div className="tabular font-medium text-foreground">
                  {invoice.invoiceNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Date
                </div>
                <div className="tabular text-foreground">
                  {formatDate(invoice.invoiceDate)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </div>
                <div className="tabular font-medium text-foreground">
                  {formatINR(invoice.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Payment Details
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <FieldLabel required>Payment Date</FieldLabel>
                  <Input
                    type="date"
                    value={toInputDate(form.paymentDate)}
                    onChange={(e) =>
                      update(
                        "paymentDate",
                        new Date(e.target.value).toISOString(),
                      )
                    }
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel
                    required
                    hint={
                      invoice
                        ? `Max ${formatINR(invoice.totalAmount)}`
                        : undefined
                    }
                  >
                    Amount Received (₹)
                  </FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.amountReceived}
                    onChange={(e) => update("amountReceived", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                  {invoice && received > 0 && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      {isFullPayment ? (
                        <span className="inline-flex items-center gap-1 rounded-[3px] bg-foreground px-1.5 py-0.5 font-medium text-background">
                          <Check className="h-3 w-3" /> Full payment
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-foreground">
                          Partial · Balance {formatINR(balanceAfter)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel required>Payment Mode</FieldLabel>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(v) => update("paymentMode", v)}
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel hint="optional">Transaction Reference</FieldLabel>
                  <Input
                    value={form.transactionRef}
                    onChange={(e) => update("transactionRef", e.target.value)}
                    placeholder="UTR / Cheque # / UPI ref"
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </span>
              </div>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any reconciliation notes, deduction reasons, etc."
                className="min-h-[64px] rounded-[5px] text-[13px]"
              />
            </div>
          </div>
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
            </div>
          </div>
        )}

        {/* Live total strip */}
        {invoice && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {isFullPayment ? "Will mark as Paid" : "Will mark as Partially Paid"}
            </span>
            <div className="flex items-center gap-3 text-[12px] tabular">
              <span className="text-muted-foreground">
                {formatINR(total)} →{" "}
                <span className="font-medium text-foreground">
                  {formatINR(Math.max(0, balanceAfter))}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
            disabled={!invoice || errors.length > 0}
          >
            Record Payment
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
