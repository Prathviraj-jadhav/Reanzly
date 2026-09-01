"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  Plus,
  ShoppingCart,
  Calendar,
  Building2,
  User,
  Truck,
  Coins,
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
import { VENDORS } from "@/lib/mock-data";
import {
  PO_CATEGORIES,
  PO_PAYMENT_TERMS,
  PO_UOM,
  BUYER_OPTIONS,
  WAREHOUSE_OPTIONS,
  EMPTY_PO_FORM,
  getItemSuggestions,
  toInputDate,
  formatINR,
  formatDate,
  FieldLabel,
  type POForm,
  type POLineForm,
  type PurchaseOrder,
} from "./_helpers";

interface AddPODrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (po: PurchaseOrder) => void;
}

const STEPS = [
  { id: 1, label: "Vendor & Dates" },
  { id: 2, label: "Line Items" },
  { id: 3, label: "Review" },
];

export function AddPODrawer({ open, onClose, onAdd }: AddPODrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<POForm>(() => EMPTY_PO_FORM());
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof POForm>(k: K, v: POForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const updateLine = (id: string, patch: Partial<POLineForm>) =>
    setForm((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const addLine = () =>
    setForm((s) => ({
      ...s,
      lines: [
        ...s.lines,
        {
          id: `pol-new-${Date.now()}`,
          itemCode: "",
          description: "",
          category: s.category,
          uom: "Each",
          qty: "1",
          unitPrice: "0",
          taxRate: "18",
        },
      ],
    }));

  const removeLine = (id: string) =>
    setForm((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }));

  const applySuggestion = (lineId: string, code: string) => {
    const sug = getItemSuggestions(form.category).find((s) => s.code === code);
    if (!sug) return;
    updateLine(lineId, {
      itemCode: sug.code,
      description: sug.description,
      uom: sug.uom,
      unitPrice: String(sug.unitPrice),
      category: form.category,
    });
  };

  const handleCategoryChange = (category: string) => {
    setForm((s) => ({
      ...s,
      category,
      // Reset line item code/description if they don't belong to new category
      lines: s.lines.map((l) => ({
        ...l,
        category,
        itemCode: "",
        description: "",
      })),
    }));
  };

  // Validation
  const errors: string[] = [];
  if (step === 1) {
    if (!form.vendor) errors.push("Vendor is required");
    if (!form.buyer.trim()) errors.push("Buyer name is required");
    if (!form.expectedDelivery) errors.push("Expected delivery date is required");
    if (new Date(form.expectedDelivery).getTime() < new Date(form.poDate).getTime() - 86400000) {
      errors.push("Expected delivery cannot be before PO date");
    }
  }
  if (step === 2) {
    if (form.lines.length === 0) errors.push("At least one line item is required");
    const badLines = form.lines.filter(
      (l) => !l.description.trim() || !l.qty || Number(l.qty) <= 0 || !l.unitPrice || Number(l.unitPrice) < 0,
    );
    if (badLines.length > 0) errors.push(`${badLines.length} line item${badLines.length === 1 ? "" : "s"} missing details or with invalid qty/price`);
  }

  const isLastStep = step === 3;
  const canAdvance = errors.length === 0;

  // Compute totals
  const subtotal = form.lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);
  const taxTotal = form.lines.reduce((s, l) => {
    const sub = Number(l.qty || 0) * Number(l.unitPrice || 0);
    return s + (sub * Number(l.taxRate || 0)) / 100;
  }, 0);
  const total = subtotal + taxTotal;

  const goNext = () => {
    if (!canAdvance) {
      toastInfo("Cannot continue", errors[0]);
      return;
    }
    if (step < 3) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const vendor = VENDORS.find((v) => v.id === form.vendor);
    if (!vendor) {
      toastInfo("Vendor missing", "Select a vendor before saving");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: vendor.id,
        category: form.category,
        poDate: form.poDate,
        expectedDelivery: form.expectedDelivery,
        deliveryLocation: form.deliveryLocation,
        paymentTerms: form.paymentTerms,
        buyer: form.buyer,
        notes: form.notes.trim() || undefined,
        lines: form.lines.map((l) => ({
          itemCode: l.itemCode || "MISC",
          description: l.description,
          category: l.category,
          uom: l.uom,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Could not create PO" }));
      toastInfo("Could not create PO", error);
      return;
    }
    const { purchaseOrder } = await res.json();
    onAdd?.(purchaseOrder);
    toastSuccess(`PO ${purchaseOrder.poNumber} created`, `Vendor: ${vendor.companyName} · ${formatINR(purchaseOrder.total)} · Draft`);
    setStep(1);
    setForm(EMPTY_PO_FORM());
    onClose();
  };

  const suggestions = getItemSuggestions(form.category);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Purchase Order</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              3 steps · vendor + line items · auto-tax · save as Draft
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
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { if (s.id < step) setStep(s.id); }}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors ${
                        active || done
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span className={`hidden text-[12px] font-medium md:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-6 ${step > s.id ? "bg-foreground" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Vendor & Dates */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vendor & Schedule</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Vendor</FieldLabel>
                    <Select value={form.vendor || "none"} onValueChange={(v) => update("vendor", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select vendor -</SelectItem>
                        {VENDORS.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.companyName} · {v.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Supply Category</FieldLabel>
                    <Select value={form.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PO_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required hint="terms">Payment Terms</FieldLabel>
                    <Select value={form.paymentTerms} onValueChange={(v) => update("paymentTerms", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PO_PAYMENT_TERMS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>PO Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.poDate)}
                      onChange={(e) => update("poDate", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Expected Delivery</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.expectedDelivery)}
                      onChange={(e) => update("expectedDelivery", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>

                  <div>
                    <FieldLabel required hint="destination">Delivery Location</FieldLabel>
                    <Select value={form.deliveryLocation} onValueChange={(v) => update("deliveryLocation", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WAREHOUSE_OPTIONS.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Buyer</FieldLabel>
                    <Select value={form.buyer} onValueChange={(v) => update("buyer", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUYER_OPTIONS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
                </div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Optional instructions for the vendor - batch number, special delivery notes…"
                  className="min-h-[80px] rounded-[5px] text-[12px] bg-background"
                />
              </div>
            </div>
          )}

          {/* Step 2: Line items */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-muted/40 px-4 py-2.5 text-[12px] text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                Category is <span className="font-medium text-foreground">{form.category}</span>. Pick a suggestion or enter manually.
              </div>

              <div className="flex flex-col gap-3">
                {form.lines.map((line, idx) => (
                  <div key={line.id} className="rounded-[6px] border border-border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Line {idx + 1}</span>
                      {form.lines.length > 1 && (
                        <button
                          onClick={() => removeLine(line.id)}
                          className="flex h-6 items-center gap-1 rounded-[4px] border border-border px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-7">
                        <FieldLabel hint="description">Item / Description</FieldLabel>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          placeholder="e.g. Apollo EnduMile LHD 315/80R22.5 drive tyre"
                          className="h-8 rounded-[5px] text-[12px]"
                        />
                        {suggestions.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {suggestions.slice(0, 3).map((s) => (
                              <button
                                key={s.code}
                                onClick={() => applySuggestion(line.id, s.code)}
                                className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors tabular"
                              >
                                {s.code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-5">
                        <FieldLabel hint="code">Item Code</FieldLabel>
                        <Input
                          value={line.itemCode}
                          onChange={(e) => updateLine(line.id, { itemCode: e.target.value })}
                          placeholder="e.g. TYR-315-80R22"
                          className="h-8 rounded-[5px] text-[12px] tabular"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FieldLabel required>Qty</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          value={line.qty}
                          onChange={(e) => updateLine(line.id, { qty: e.target.value })}
                          className="h-8 rounded-[5px] text-[12px] tabular"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FieldLabel>UOM</FieldLabel>
                        <Select value={line.uom} onValueChange={(v) => updateLine(line.id, { uom: v })}>
                          <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PO_UOM.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-3">
                        <FieldLabel required hint="₹">Unit Price</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                          className="h-8 rounded-[5px] text-[12px] tabular"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FieldLabel hint="GST%">Tax Rate</FieldLabel>
                        <Select value={line.taxRate} onValueChange={(v) => updateLine(line.id, { taxRate: v })}>
                          <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["0", "5", "12", "18", "28"].map((r) => (
                              <SelectItem key={r} value={r}>{r}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <div className="text-[11px] text-muted-foreground tabular">
                        Line total: <span className="text-foreground font-medium">{formatINR(Math.round(Number(line.qty || 0) * Number(line.unitPrice || 0) * (1 + Number(line.taxRate || 0) / 100)))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addLine}
                className="flex items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-background px-3 py-2.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Line Item
              </button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">PO Summary</span>
                  <span className="text-[11px] text-muted-foreground tabular">{formatDate(form.poDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Vendor" value={VENDORS.find((v) => v.id === form.vendor)?.companyName || "-"} />
                  <ReviewRow label="Category" value={form.category} />
                  <ReviewRow label="Buyer" value={form.buyer} />
                  <ReviewRow label="Payment Terms" value={form.paymentTerms} />
                  <ReviewRow label="Delivery Location" value={form.deliveryLocation} />
                  <ReviewRow label="Expected Delivery" value={formatDate(form.expectedDelivery)} mono />
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Line Items ({form.lines.length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {form.lines.map((l, i) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-background px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[13px] text-foreground truncate">{l.description || `Line ${i + 1}`}</div>
                        <div className="text-[11px] text-muted-foreground tabular mt-0.5">
                          {l.qty} {l.uom} · {formatINR(Number(l.unitPrice))} · {l.taxRate}% GST
                        </div>
                      </div>
                      <div className="text-[13px] tabular font-medium text-foreground shrink-0">
                        {formatINR(Math.round(Number(l.qty) * Number(l.unitPrice) * (1 + Number(l.taxRate) / 100)))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-border pt-3 grid grid-cols-3 gap-3">
                  <ReviewStat label="Subtotal" value={formatINR(Math.round(subtotal))} icon={<Coins className="h-3.5 w-3.5" />} />
                  <ReviewStat label="Tax" value={formatINR(Math.round(taxTotal))} icon={<Coins className="h-3.5 w-3.5" />} />
                  <ReviewStat label="PO Total" value={formatINR(Math.round(total))} icon={<Coins className="h-3.5 w-3.5" />} />
                </div>
              </div>

              <div className="rounded-[5px] border border-border bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground flex items-start gap-2">
                <User className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="text-foreground font-medium">PO will be saved as Draft.</span> Use <span className="font-medium">Send</span> from the PO detail to email it to the vendor.
                </div>
              </div>
            </div>
          )}
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goBack} disabled={step === 1}>
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular flex items-center gap-2">
            <Truck className="h-3 w-3" />
            Step {step} of 3
          </div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create Draft PO"}
            </Btn>
          ) : (
            <Btn variant="primary" onClick={goNext} disabled={!canAdvance}>
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] text-foreground ${mono ? "tabular" : ""}`}>{value}</span>
    </div>
  );
}

function ReviewStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <span className="text-[16px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}
