"use client";
import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Building2,
  Banknote,
  Calculator,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  ADD_INVOICE_STEPS,
  PAYMENT_TERMS,
  HSN_CODES,
  stateNameFromCode,
  isValidGSTIN,
  computeLineAmount,
  computeLineTax,
  computeTotals,
  EMPTY_INVOICE_FORM,
  EMPTY_LINE_ITEM,
  nextInvoiceNumber,
  formToInvoicePatch,
  contactsForCustomer,
  contactById,
  type InvoiceForm,
  type InvoiceLineItem,
  FieldLabel,
  addDays,
  formatINR,
  formatDate,
} from "./_helpers";
import type { Invoice, Customer, Trip } from "@/lib/types";

interface AddInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Create callback - persists the new invoice via the real API. Resolves
   *  false (not a throw) on failure - the caller already surfaces its own
   *  error toast. The second arg carries the assigned customer-contact IDs
   *  (Task 15-d, still local-only meta). */
  onAdd?: (invoice: Invoice, assignedContactIds?: string[]) => Promise<boolean>;
}

const SUPPLIER_STATE = "27"; // Maharashtra
const SUPPLIER_STATE_NAME = stateNameFromCode("27");

const TIER_DESCRIPTIONS: Record<number, { tagline: string }> = {
  1: { tagline: "Select customer & billing reference" },
  2: { tagline: "Add services with HSN codes & tax rates" },
  3: { tagline: "Payment terms, due date & bank details" },
  4: { tagline: "Review totals and create invoice" },
};

export function AddInvoiceDrawer({ open, onClose, onAdd }: AddInvoiceDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<InvoiceForm>(() => ({
    ...EMPTY_INVOICE_FORM,
    invoiceDate: new Date().toISOString(),
    dueDate: addDays(new Date().toISOString(), 30),
  }));

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    fetch("/api/customers").then(r => r.ok ? r.json() : { customers: [] }).then(d => setCustomers(d.customers ?? [])).catch(() => {});
    fetch("/api/trips").then(r => r.ok ? r.json() : { trips: [] }).then(d => setTrips(d.trips ?? [])).catch(() => {});
  }, []);

  const update = <K extends keyof InvoiceForm>(k: K, v: InvoiceForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Per-step validation =====
  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    const s1: string[] = [];
    if (!form.customerId) s1.push("Customer is required");
    if (s1.length) errors[1] = s1;
    const s2: string[] = [];
    const validItems = form.lineItems.filter(
      (li) => li.description.trim() && li.rate > 0,
    );
    if (validItems.length === 0)
      s2.push("At least one line item with description & rate is required");
    if (s2.length) errors[2] = s2;
    const s3: string[] = [];
    if (!form.invoiceDate) s3.push("Invoice date is required");
    if (!form.dueDate) s3.push("Due date is required");
    if (form.dueDate && form.invoiceDate && new Date(form.dueDate) < new Date(form.invoiceDate))
      s3.push("Due date cannot be before invoice date");
    if (s3.length) errors[3] = s3;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === 4;
  const canAdvance = currentErrors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: currentErrors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < 4) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const goTo = (s: number) => {
    if (s <= step) {
      setStep(s);
      return;
    }
    for (let i = step; i < s; i++) {
      if (stepErrors[i]?.length) {
        toast("Complete step " + i + " first", {
          description: stepErrors[i][0],
        });
        setStep(i);
        return;
      }
    }
    setStep(s);
  };

  // ===== Totals (live) =====
  const totals = useMemo(
    () => computeTotals(form.lineItems, SUPPLIER_STATE, form.customerState),
    [form.lineItems, form.customerState],
  );

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    const invNum = nextInvoiceNumber(Math.floor(Math.random() * 999));
    if (onAdd) {
      const patch = formToInvoicePatch(form);
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: invNum,
        customer: patch.customer ?? form.customerName,
        invoiceDate: patch.invoiceDate ?? form.invoiceDate,
        dueDate: patch.dueDate ?? form.dueDate,
        amount: patch.amount ?? 0,
        taxAmount: patch.taxAmount ?? 0,
        totalAmount: patch.totalAmount ?? 0,
        status: patch.status ?? "Draft",
        paymentStatus: patch.paymentStatus ?? "Unpaid",
        tripRef: patch.tripRef,
        igst: patch.igst,
        cgst: patch.cgst,
        sgst: patch.sgst,
      };
      setSubmitting(true);
      const ok = await onAdd(newInvoice, form.assignedContactIds);
      setSubmitting(false);
      if (!ok) return; // onAdd already surfaced its own error toast
      toast.success("Invoice created", {
        description: `${invNum} · ${form.customerName} · ${formatINR(totals.total)}`,
      });
      setStep(1);
      setForm({ ...EMPTY_INVOICE_FORM, invoiceDate: new Date().toISOString(), dueDate: addDays(new Date().toISOString(), 30) });
      onClose();
      return;
    }
    toast.success("Invoice created", {
      description: `${invNum} · ${form.customerName} · ${formatINR(totals.total)}`,
    });
    setStep(1);
    setForm({ ...EMPTY_INVOICE_FORM, invoiceDate: new Date().toISOString(), dueDate: addDays(new Date().toISOString(), 30) });
    onClose();
  };

  // ===== Customer selection handler =====
  // Auto-selects the customer's primary Billing contact as the default
  // assignee (Task 15-d) - finance user can refine in the Assign To panel.
  const selectCustomer = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (!c) {
      update("customerId", "");
      update("customerName", "");
      update("customerGstin", "");
      update("customerState", "");
      update("customerCity", "");
      update("billingAddress", "");
      update("assignedContactIds", []);
      return;
    }
    const stateCode = c.gstin.slice(0, 2);
    const primary = contactsForCustomer(c.companyName).find((ct) => ct.isPrimary);
    setForm((s) => ({
      ...s,
      customerId: c.id,
      customerName: c.companyName,
      customerGstin: c.gstin,
      customerState: stateCode,
      customerCity: c.city,
      billingAddress: `${c.contactPerson}\n${c.companyName}\n${c.city}, ${stateNameFromCode(stateCode)}`,
      assignedContactIds: primary ? [primary.id] : [],
    }));
  };

  // ===== Payment terms → due date auto =====
  const applyPaymentTerms = (terms: string) => {
    update("paymentTerms", terms);
    let days = 30;
    if (terms === "Advance") days = 0;
    else if (terms === "COD") days = 0;
    else if (terms === "Net 7") days = 7;
    else if (terms === "Net 15") days = 15;
    else if (terms === "Net 30") days = 30;
    else if (terms === "Net 45") days = 45;
    else if (terms === "Net 60") days = 60;
    update("dueDate", addDays(form.invoiceDate, days));
  };

  // ===== Assign To: toggle a contact on/off (Task 15-d) =====
  const toggleAssignee = (contactId: string) => {
    setForm((s) => ({
      ...s,
      assignedContactIds: s.assignedContactIds.includes(contactId)
        ? s.assignedContactIds.filter((id) => id !== contactId)
        : [...s.assignedContactIds, contactId],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Create Invoice
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              GST-compliant · auto tax computation · live totals
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

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {ADD_INVOICE_STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const errored = stepErrors[s.id]?.length && step <= s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => goTo(s.id)}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors",
                        active && "border-foreground bg-foreground text-background",
                        done && "border-foreground bg-foreground text-background",
                        !active && !done && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[12px] font-medium md:inline",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    {errored && (
                      <AlertCircle className="h-3 w-3 text-foreground" />
                    )}
                  </button>
                  {i < ADD_INVOICE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-4",
                        step > s.id ? "bg-foreground" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Step {step}
            </span>
            <span className="text-[13px] font-medium text-foreground">
              {ADD_INVOICE_STEPS[step - 1].label}
            </span>
            <span className="text-[12px] text-muted-foreground">
              · {TIER_DESCRIPTIONS[step].tagline}
            </span>
          </div>

          {step === 1 && (
            <Step1Customer
              form={form}
              update={update}
              selectCustomer={selectCustomer}
              applyPaymentTerms={applyPaymentTerms}
              toggleAssignee={toggleAssignee}
              customers={customers}
              trips={trips}
            />
          )}
          {step === 2 && (
            <Step2LineItems form={form} update={update} totals={totals} />
          )}
          {step === 3 && (
            <Step3Terms form={form} update={update} applyPaymentTerms={applyPaymentTerms} />
          )}
          {step === 4 && (
            <Step4Review form={form} totals={totals} />
          )}
        </div>

        {/* Validation strip */}
        {currentErrors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{currentErrors[0]}</span>
              {currentErrors.length > 1 && (
                <span className="text-muted-foreground">
                  · {currentErrors.length - 1} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live totals strip (hidden on step 4 since review shows it) */}
        {step !== 4 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Live Total
            </span>
            <div className="flex items-center gap-4 text-[12px] tabular">
              <span className="text-muted-foreground">
                Taxable: {formatINR(totals.subtotal)}
              </span>
              <span className="text-muted-foreground">
                Tax: {formatINR(totals.totalTax)}
              </span>
              <span className="font-medium text-foreground">
                {formatINR(totals.total)}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn
            variant="ghost"
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            onClick={goBack}
            disabled={step === 1}
          >
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of 4
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create Invoice"}
            </Btn>
          ) : (
            <Btn
              variant="primary"
              onClick={goNext}
              disabled={!canAdvance}
            >
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Step 1: Customer & Billing =====
function Step1Customer({
  form,
  update,
  selectCustomer,
  applyPaymentTerms,
  toggleAssignee,
  customers,
  trips,
}: {
  form: InvoiceForm;
  update: <K extends keyof InvoiceForm>(k: K, v: InvoiceForm[K]) => void;
  selectCustomer: (id: string) => void;
  applyPaymentTerms: (t: string) => void;
  toggleAssignee: (id: string) => void;
  customers: Customer[];
  trips: Trip[];
}) {
  const isInterState =
    !!form.customerState && form.customerState !== SUPPLIER_STATE;

  // Contacts for the selected customer - used by the Assign To picker.
  const customerContacts = form.customerName
    ? contactsForCustomer(form.customerName)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Customer
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel required>Customer</FieldLabel>
            <Select
              value={form.customerId}
              onValueChange={selectCustomer}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName} · {c.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.customerId && (
            <>
              <div>
                <FieldLabel hint="auto-filled">GSTIN</FieldLabel>
                <Input
                  value={form.customerGstin}
                  readOnly
                  className="h-8 rounded-[5px] font-mono text-[12px] tabular bg-muted/40"
                />
              </div>
              <div>
                <FieldLabel hint="auto-filled">State</FieldLabel>
                <div className="flex h-8 items-center gap-2 rounded-[5px] border border-border bg-muted/40 px-3 text-[12px]">
                  <span className="tabular text-muted-foreground">
                    {form.customerState}
                  </span>
                  <span className="text-foreground">
                    {stateNameFromCode(form.customerState)}
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px]">
                <span className="text-muted-foreground">Tax type:</span>{" "}
                <span className="font-medium text-foreground">
                  {isInterState ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"}
                </span>
                <span className="ml-2 text-muted-foreground">
                  · Supplier is in {SUPPLIER_STATE_NAME}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign To - Task 15-d: assign invoice to specific customer contacts */}
      {form.customerId && (
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Assign To
              </span>
            </div>
            <span className="tabular text-[11px] text-muted-foreground">
              {form.assignedContactIds.length} selected
            </span>
          </div>
          {customerContacts.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              No contacts on file for this customer.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {customerContacts.map((c) => {
                const checked = form.assignedContactIds.includes(c.id);
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
                          <span className="rounded-[2px] bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
                            Primary
                          </span>
                        )}
                        <span className="rounded-[2px] border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground">
                          {c.role}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            These contacts receive the invoice when it is released, and appear
            on the invoice detail as the assigned recipients.
          </p>
        </div>
      )}

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Billing Reference
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Trip / LR Reference</FieldLabel>
            <Select
              value={form.tripRef}
              onValueChange={(v) => update("tripRef", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Link to trip" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                <SelectItem value="none">- Not linked -</SelectItem>
                {trips.slice(0, 20).map((t) => (
                  <SelectItem key={t.id} value={t.tripId}>
                    {t.tripId} · {t.origin} → {t.destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Service Description</FieldLabel>
            <Input
              value={form.serviceDescription}
              onChange={(e) => update("serviceDescription", e.target.value)}
              placeholder="e.g. Goods transport Mumbai → Pune (FTL)"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Billing Address</FieldLabel>
            <Textarea
              value={form.billingAddress}
              onChange={(e) => update("billingAddress", e.target.value)}
              placeholder="Auto-fills from customer - edit if needed"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 2: Line Items =====
function Step2LineItems({
  form,
  update,
  totals,
}: {
  form: InvoiceForm;
  update: <K extends keyof InvoiceForm>(k: K, v: InvoiceForm[K]) => void;
  totals: ReturnType<typeof computeTotals>;
}) {
  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => {
    update(
      "lineItems",
      form.lineItems.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        next.amount = computeLineAmount(next.quantity, next.rate);
        next.taxAmount = computeLineTax(next.amount, next.taxRate);
        return next;
      }),
    );
  };

  const addLine = () => {
    const nextId = `li-${form.lineItems.length + 1}-${Date.now()}`;
    update("lineItems", [
      ...form.lineItems,
      { ...EMPTY_LINE_ITEM, id: nextId, taxRate: 5 },
    ]);
  };

  const removeLine = (id: string) => {
    if (form.lineItems.length === 1) {
      toast("At least one line required");
      return;
    }
    update(
      "lineItems",
      form.lineItems.filter((li) => li.id !== id),
    );
  };

  const setHsn = (id: string, hsnCode: string) => {
    const hsn = HSN_CODES.find((h) => h.code === hsnCode);
    if (hsn) {
      updateLine(id, {
        hsn: hsn.code,
        taxRate: hsn.rate,
        description: hsn.description,
      });
    } else {
      updateLine(id, { hsn: hsnCode });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Line Items
            </span>
          </div>
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addLine}>
            Add Line
          </Btn>
        </div>

        <div className="flex flex-col gap-3">
          {form.lineItems.map((li, idx) => (
            <div
              key={li.id}
              className="rounded-[5px] border border-border bg-background p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground tabular">
                  Line {idx + 1}
                </span>
                <button
                  onClick={() => removeLine(li.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    value={li.description}
                    onChange={(e) =>
                      updateLine(li.id, { description: e.target.value })
                    }
                    placeholder="Service description"
                    className="h-8 rounded-[5px] text-[12px]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <FieldLabel hint={li.taxRate ? `${li.taxRate}%` : undefined}>
                    HSN/SAC
                  </FieldLabel>
                  <Select
                    value={li.hsn}
                    onValueChange={(v) => setHsn(li.id, v)}
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px] tabular">
                      <SelectValue placeholder="Lookup" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                      {HSN_CODES.map((h) => (
                        <SelectItem key={h.code} value={h.code}>
                          <span className="tabular">{h.code}</span>
                          <span className="ml-2 text-muted-foreground">
                            {h.description}
                          </span>
                          <span className="ml-2 tabular text-muted-foreground">
                            {h.rate}%
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Qty</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={li.quantity}
                    onChange={(e) =>
                      updateLine(li.id, { quantity: Number(e.target.value) })
                    }
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Rate (₹)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={li.rate}
                    onChange={(e) =>
                      updateLine(li.id, { rate: Number(e.target.value) })
                    }
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-[3px] bg-muted/40 px-2 py-1 text-[11px] tabular">
                <span className="text-muted-foreground">
                  Taxable: {formatINR(li.amount)} · Tax: {formatINR(li.taxAmount)} ({li.taxRate}%)
                </span>
                <span className="font-medium text-foreground">
                  Line total: {formatINR(li.amount + li.taxAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live totals */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Live Calculation
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Subtotal (Taxable)</span>
            <span className="tabular">{formatINR(totals.subtotal)}</span>
          </div>
          {totals.isInterState ? (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">IGST</span>
              <span className="tabular">{formatINR(totals.igst)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">CGST</span>
                <span className="tabular">{formatINR(totals.cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">SGST</span>
                <span className="tabular">{formatINR(totals.sgst)}</span>
              </div>
            </>
          )}
          <div className="border-t border-border pt-1.5">
            <div className="flex items-center justify-between text-[14px] font-medium">
              <span>Grand Total</span>
              <span className="tabular">{formatINR(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 3: Terms & Bank =====
function Step3Terms({
  form,
  update,
  applyPaymentTerms,
}: {
  form: InvoiceForm;
  update: <K extends keyof InvoiceForm>(k: K, v: InvoiceForm[K]) => void;
  applyPaymentTerms: (t: string) => void;
}) {
  const toInputDate = (iso: string) => iso.slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Payment Terms
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Payment Terms</FieldLabel>
            <Select
              value={form.paymentTerms}
              onValueChange={applyPaymentTerms}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Invoice Date</FieldLabel>
            <Input
              type="date"
              value={toInputDate(form.invoiceDate)}
              onChange={(e) => {
                const v = new Date(e.target.value).toISOString();
                update("invoiceDate", v);
              }}
              className="h-8 rounded-[5px] text-[12px] tabular"
            />
          </div>
          <div>
            <FieldLabel required hint="auto from terms">Due Date</FieldLabel>
            <Input
              type="date"
              value={toInputDate(form.dueDate)}
              onChange={(e) =>
                update("dueDate", new Date(e.target.value).toISOString())
              }
              className="h-8 rounded-[5px] text-[12px] tabular"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={form.reverseCharge}
                onChange={(e) => update("reverseCharge", e.target.checked)}
                className="h-3.5 w-3.5 rounded-[3px] border-border"
              />
              Reverse charge applicable
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Bank Details
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Bank Name</FieldLabel>
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Account Number</FieldLabel>
            <Input
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value)}
              className="h-8 rounded-[5px] text-[12px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">IFSC Code</FieldLabel>
            <Input
              value={form.bankIfsc}
              onChange={(e) =>
                update("bankIfsc", e.target.value.toUpperCase())
              }
              className="h-8 rounded-[5px] text-[12px] tabular"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Notes
          </span>
        </div>
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Notes for the customer, payment instructions, etc."
          className="min-h-[80px] rounded-[5px] text-[13px]"
        />
      </div>
    </div>
  );
}

// ===== Step 4: Review =====
function Step4Review({
  form,
  totals,
}: {
  form: InvoiceForm;
  totals: ReturnType<typeof computeTotals>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Compliance check
            </span>
          </div>
          <StatusBadge variant={form.customerGstin && isValidGSTIN(form.customerGstin) ? "outline" : "muted"}>
            {form.customerGstin && isValidGSTIN(form.customerGstin)
              ? "All checks passed"
              : "Pending"}
          </StatusBadge>
        </div>
        <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
          <ChecklistRow ok={!!form.customerId} label="Customer selected" />
          <ChecklistRow
            ok={!!form.customerGstin && isValidGSTIN(form.customerGstin)}
            label="GSTIN valid"
          />
          <ChecklistRow
            ok={form.lineItems.some((li) => li.description && li.rate > 0)}
            label="Line items added"
          />
          <ChecklistRow ok={!!form.invoiceDate} label="Invoice date set" />
          <ChecklistRow ok={!!form.dueDate} label="Due date set" />
          <ChecklistRow ok={!!form.bankName} label="Bank details captured" />
          <ChecklistRow
            ok={form.assignedContactIds.length > 0}
            label="Assignees selected"
          />
        </div>
      </div>

      {/* Customer summary */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Customer
          </span>
        </div>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <ReviewRow label="Company" value={form.customerName || "-"} />
          <ReviewRow label="GSTIN" value={form.customerGstin || "-"} mono />
          <ReviewRow
            label="State"
            value={
              form.customerState
                ? `${form.customerState} · ${stateNameFromCode(form.customerState)}`
                : "-"
            }
          />
          <ReviewRow label="City" value={form.customerCity || "-"} />
          <ReviewRow label="Trip Ref" value={form.tripRef || "-"} mono />
          <ReviewRow label="Tax Type" value={totals.isInterState ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"} />
          <ReviewRow
            label="Assigned To"
            value={
              form.assignedContactIds.length === 0
                ? "-"
                : form.assignedContactIds
                    .map((id) => {
                      const c = contactById(id);
                      return c ? `${c.name} (${c.role})` : "";
                    })
                    .filter(Boolean)
                    .join(", ")
            }
          />
        </div>
      </div>

      {/* Line items summary */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Line Items ({form.lineItems.length})
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          {form.lineItems.map((li, i) => (
            <div
              key={li.id}
              className="flex items-center justify-between rounded-[3px] bg-muted/30 px-2 py-1.5 text-[12px]"
            >
              <div className="min-w-0 flex-1">
                <span className="tabular text-muted-foreground">
                  {i + 1}.
                </span>{" "}
                <span className="text-foreground">
                  {li.description || "-"}
                </span>
                {li.hsn && (
                  <span className="ml-2 tabular text-muted-foreground">
                    {li.hsn}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 tabular">
                <span className="text-muted-foreground">
                  {formatINR(li.amount)}
                </span>
                <span className="font-medium text-foreground">
                  {formatINR(li.amount + li.taxAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Totals
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular">{formatINR(totals.subtotal)}</span>
          </div>
          {totals.isInterState ? (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">IGST</span>
              <span className="tabular">{formatINR(totals.igst)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">CGST</span>
                <span className="tabular">{formatINR(totals.cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">SGST</span>
                <span className="tabular">{formatINR(totals.sgst)}</span>
              </div>
            </>
          )}
          <div className="border-t border-border pt-1.5">
            <div className="flex items-center justify-between text-[16px] font-medium">
              <span>Grand Total</span>
              <span className="tabular">{formatINR(totals.total)}</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 border-t border-border pt-2 text-[12px]">
            <ReviewRow label="Invoice Date" value={formatDate(form.invoiceDate)} mono />
            <ReviewRow label="Due Date" value={formatDate(form.dueDate)} mono />
            <ReviewRow label="Payment Terms" value={form.paymentTerms} />
            <ReviewRow label="Reverse Charge" value={form.reverseCharge ? "Yes" : "No"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          ok
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground",
        )}
      >
        {ok && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className={cn("text-[12px]", ok ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[13px] text-foreground text-right",
          mono && "tabular",
        )}
      >
        {value}
      </span>
    </div>
  );
}
