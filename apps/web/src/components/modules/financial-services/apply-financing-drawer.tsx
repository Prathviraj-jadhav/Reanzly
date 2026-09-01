"use client";

import { useState, useEffect, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { SectionCard } from "@/components/shared/section-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Check, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { offerFor } from "./_data";
import {
  formatINR, formatDate, ADVANCE_RATE, FieldLabel,
  FINANCING_PRODUCT_TYPES, type FinancingProductType,
} from "./_helpers";
import type { EligibleInvoice, FinancingApplicationDTO } from "./use-financial-services-data";

interface ApplyFinancingDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selects a product when opened from an offer card's "Apply" CTA. */
  initialProduct?: FinancingProductType;
  eligibleInvoices: EligibleInvoice[];
  onSubmit: (payload: {
    productType: FinancingProductType;
    linkedInvoiceIds: string[];
    requestedAmount: number;
    tenureMonths: number;
    notes?: string;
  }) => Promise<FinancingApplicationDTO | null>;
}

interface FormState {
  productType: FinancingProductType;
  linkedInvoiceIds: string[];
  requestedAmount: string;
  tenureMonths: string;
  notes: string;
}

function emptyForm(product?: FinancingProductType): FormState {
  const offer = offerFor(product ?? "Invoice Discounting");
  return {
    productType: offer.productType,
    linkedInvoiceIds: [],
    requestedAmount: "",
    tenureMonths: String(offer.minTenureMonths),
    notes: "",
  };
}

export function ApplyFinancingDrawer({ open, onClose, initialProduct, eligibleInvoices, onSubmit }: ApplyFinancingDrawerProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(initialProduct));
  const [submitting, setSubmitting] = useState(false);

  const offer = offerFor(form.productType);
  const isInvoiceDiscounting = form.productType === "Invoice Discounting";

  // Reset the form whenever the drawer opens (fresh application each time).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setForm(emptyForm(initialProduct));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialProduct]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const selectedInvoices = useMemo(
    () => eligibleInvoices.filter((inv) => form.linkedInvoiceIds.includes(inv.id)),
    [eligibleInvoices, form.linkedInvoiceIds],
  );
  const selectedOutstanding = selectedInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
  const suggestedAmount = isInvoiceDiscounting
    ? Math.round(selectedOutstanding * ADVANCE_RATE)
    : undefined;

  const toggleInvoice = (id: string) => {
    update(
      "linkedInvoiceIds",
      form.linkedInvoiceIds.includes(id)
        ? form.linkedInvoiceIds.filter((x) => x !== id)
        : [...form.linkedInvoiceIds, id],
    );
  };

  const handleProductChange = (productType: FinancingProductType) => {
    const nextOffer = offerFor(productType);
    setForm((s) => ({
      ...s,
      productType,
      tenureMonths: String(nextOffer.minTenureMonths),
      linkedInvoiceIds: productType === "Invoice Discounting" ? s.linkedInvoiceIds : [],
    }));
  };

  const handleSubmit = async () => {
    if (isInvoiceDiscounting && form.linkedInvoiceIds.length === 0) {
      toast("Select at least one invoice to finance against");
      return;
    }
    const amount = Number(form.requestedAmount);
    if (!form.requestedAmount || amount <= 0) {
      toast("Requested amount must be greater than zero");
      return;
    }
    const tenure = Number(form.tenureMonths);
    if (!form.tenureMonths || tenure <= 0) {
      toast("Tenure must be greater than zero");
      return;
    }

    setSubmitting(true);
    const created = await onSubmit({
      productType: form.productType,
      linkedInvoiceIds: form.linkedInvoiceIds,
      requestedAmount: amount,
      tenureMonths: tenure,
      notes: form.notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!created) return;

    toast.success("Application submitted for review", {
      description: `${offer.title} · ${formatINR(amount)} · saved for real, no funds move`,
    });
    setForm(emptyForm());
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Apply for Financing</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Real eligibility from your invoice data, illustrative underwriting only - no real credit decision or disbursal.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <SectionCard title="Product">
              <div className="flex flex-col gap-3">
                <div>
                  <FieldLabel required>Financing Product</FieldLabel>
                  <Select value={form.productType} onValueChange={(v) => handleProductChange(v as FinancingProductType)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FINANCING_PRODUCT_TYPES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
                  <p className="text-[12px] text-muted-foreground">{offer.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Rate: <span className="text-foreground">{offer.rateLabel}</span></span>
                    <span>Tenure: <span className="text-foreground">{offer.tenureLabel}</span></span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Invoices to finance against"
              description={
                isInvoiceDiscounting
                  ? "Required for Invoice Discounting - pick unpaid, overdue or partially paid invoices"
                  : "Optional context for this product - Working Capital and Fuel Card offers aren't tied to specific invoices"
              }
              flush
              bodyClassName="p-0"
            >
              {eligibleInvoices.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                  No outstanding invoices eligible for financing right now.
                </div>
              ) : (
                <div className="max-h-64 divide-y divide-border overflow-y-auto scrollbar-thin">
                  {eligibleInvoices.map((inv) => {
                    const checked = form.linkedInvoiceIds.includes(inv.id);
                    return (
                      <label
                        key={inv.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40",
                          checked && "bg-accent/30",
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleInvoice(inv.id)} className="h-4 w-4" />
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-foreground">{inv.invoiceNumber}</span>
                            <span className="text-[11px] text-muted-foreground">{inv.status}</span>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {inv.customer} · Due {formatDate(inv.dueDate)}
                          </div>
                        </div>
                        <span className="shrink-0 tabular text-[12px] font-medium text-foreground">
                          {formatINR(inv.totalAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {form.linkedInvoiceIds.length > 0 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px]">
                  <span className="text-muted-foreground">
                    {form.linkedInvoiceIds.length} invoice{form.linkedInvoiceIds.length === 1 ? "" : "s"} selected · {formatINR(selectedOutstanding)} outstanding
                  </span>
                  {suggestedAmount !== undefined && (
                    <button
                      type="button"
                      onClick={() => update("requestedAmount", String(suggestedAmount))}
                      className="font-medium text-foreground hover:underline underline-offset-2"
                    >
                      Use suggested {formatINR(suggestedAmount)} ({Math.round(ADVANCE_RATE * 100)}%)
                    </button>
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Amount & Tenure">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required hint="₹">Requested Amount</FieldLabel>
                  <SavageInput
                    category="amount"
                    type="number"
                    value={form.requestedAmount}
                    onChange={(e) => update("requestedAmount", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required hint={offer.tenureLabel}>Tenure (months)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={form.tenureMonths}
                    onChange={(e) => update("tenureMonths", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Notes" description="Optional">
              <SavageTextarea
                category="remarks"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="text-[13px]"
              />
            </SectionCard>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Application"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
