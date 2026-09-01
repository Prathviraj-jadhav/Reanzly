"use client";
import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Paperclip,
  Upload,
  FileText,
  Banknote,
  Truck,
  Route,
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
import type { Expense, Vehicle, Trip } from "@/lib/types";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_MODES,
  EMPTY_EXPENSE_FORM,
  type ExpenseForm,
  FieldLabel,
  formatINR,
} from "./_helpers";

interface AddExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: Expense;
  onAdd?: (expense: Expense) => Promise<boolean>;
  onUpdate?: (id: string, data: Partial<Expense>) => Promise<boolean>;
}

function recordToForm(record: Expense): ExpenseForm {
  return {
    date: record.date,
    category: record.category,
    description: record.description,
    amount: String(record.amount),
    paymentMode: record.paymentMode,
    reference: "",
    vehicle: record.vehicle || "",
    trip: record.trip || "",
    notes: "",
    receiptName: record.receiptStatus === "Attached" ? "receipt-on-file.pdf" : "",
    receiptSize: record.receiptStatus === "Attached" ? "1.2 MB" : "",
    submittedBy: record.submittedBy,
  };
}

function formToData(form: ExpenseForm): Partial<Expense> {
  return {
    date: form.date,
    category: form.category,
    description: form.description,
    amount: Number(form.amount) || 0,
    paymentMode: form.paymentMode,
    vehicle: form.vehicle || undefined,
    trip: form.trip || undefined,
    receiptStatus: form.receiptName ? "Attached" : "Missing",
    submittedBy: form.submittedBy,
  };
}

export function AddExpenseDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: AddExpenseDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. The parent passes a
  // `key` based on record.id (or "create") so the drawer remounts fresh each
  // time, re-running this initializer.
  const [form, setForm] = useState<ExpenseForm>(() =>
    record ? recordToForm(record) : EMPTY_EXPENSE_FORM,
  );
  const [submitting, setSubmitting] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
    ]).then(([v, t]) => {
      setVehicles(v.vehicles ?? []);
      setTrips(t.trips ?? []);
    }).catch(() => toast.error("Couldn't load fleet/trip data"));
  }, []);

  const update = <K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (step === 1) {
    if (!form.category) errors.push("Category is required");
    if (!form.amount || Number(form.amount) <= 0)
      errors.push("Amount must be greater than zero");
    if (!form.description.trim())
      errors.push("Description is required");
  }
  if (step === 2) {
    if (!form.paymentMode) errors.push("Payment mode is required");
  }

  const isLastStep = step === 3;
  const canAdvance = errors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: errors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < 3) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const payload = formToData(form);
    setSubmitting(true);
    let ok = true;
    if (record && onUpdate) {
      ok = await onUpdate(record.id, payload);
      if (ok) {
        toast.success("Expense updated", {
          description: `${form.category} · ${formatINR(Number(form.amount) || 0)}`,
        });
      }
    } else if (onAdd) {
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        date: payload.date ?? new Date().toISOString(),
        category: payload.category ?? "Other",
        description: payload.description ?? "",
        vehicle: payload.vehicle,
        trip: payload.trip,
        amount: payload.amount ?? 0,
        paymentMode: payload.paymentMode ?? "Cash",
        submittedBy: payload.submittedBy ?? "Unknown",
        receiptStatus: payload.receiptStatus ?? "Missing",
      };
      ok = await onAdd(newExpense);
      if (ok) {
        toast.success("Expense logged", {
          description: `${form.category} · ${formatINR(Number(form.amount) || 0)}`,
        });
      }
    }
    setSubmitting(false);
    if (!ok) return; // onAdd/onUpdate already surfaced their own error toast
    setStep(1);
    setForm(EMPTY_EXPENSE_FORM);
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      update("receiptName", f.name);
      update("receiptSize", `${(f.size / 1024 / 1024).toFixed(2)} MB`);
      toast.success("Receipt attached", { description: f.name });
    }
  };

  const toInputDate = (iso: string) => iso.slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit Expense" : "Log Expense"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update expense details · receipt optional"
                : "3 steps · receipt optional · auto-categorised"}
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
            {[
              { id: 1, label: "Details" },
              { id: 2, label: "Linked" },
              { id: 3, label: "Receipt" },
            ].map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors " +
                        (active || done
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={
                        "hidden text-[12px] font-medium md:inline " +
                        (active ? "text-foreground" : "text-muted-foreground")
                      }
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < 2 && (
                    <div
                      className={
                        "h-px w-4 " + (step > s.id ? "bg-foreground" : "bg-border")
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Expense Details
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Category</FieldLabel>
                    <Select
                      value={form.category}
                      onValueChange={(v) => update("category", v)}
                    >
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required hint="₹">Amount</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) => update("amount", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel required>Description</FieldLabel>
                    <Input
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="e.g. Diesel refill at IOC pump"
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.date)}
                      onChange={(e) =>
                        update(
                          "date",
                          new Date(e.target.value).toISOString(),
                        )
                      }
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="optional">Reference</FieldLabel>
                    <Input
                      value={form.reference}
                      onChange={(e) => update("reference", e.target.value)}
                      placeholder="Bill # / Invoice ref"
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Linked entities + payment */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Payment
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Linked Vehicle
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Select
                    value={form.vehicle || "none"}
                    onValueChange={(v) =>
                      update("vehicle", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                      <SelectItem value="none">- Not linked -</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name} · {v.licensePlate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Linked Trip
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Select
                    value={form.trip || "none"}
                    onValueChange={(v) =>
                      update("trip", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Select trip" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                      <SelectItem value="none">- Not linked -</SelectItem>
                      {trips.slice(0, 20).map((t) => (
                        <SelectItem key={t.id} value={t.tripId}>
                          {t.tripId} · {t.origin} → {t.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  placeholder="Additional context for approvers…"
                  className="min-h-[64px] rounded-[5px] text-[13px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Receipt upload */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Receipt
                  </span>
                </div>
                <label
                  htmlFor="receipt-upload"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-foreground/30 hover:bg-accent/30"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    Click to upload receipt
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    PDF, JPG, PNG · up to 10 MB
                  </span>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFile}
                  />
                </label>
                {form.receiptName && (
                  <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-[12px] text-foreground">
                        {form.receiptName}
                      </span>
                    </div>
                    <span className="tabular text-[11px] text-muted-foreground">
                      {form.receiptSize}
                    </span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Review
                  </span>
                  <span className="tabular text-[12px] font-medium text-foreground">
                    {formatINR(Number(form.amount) || 0)}
                  </span>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-foreground">{form.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode</span>
                    <span className="text-foreground">{form.paymentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-foreground text-right max-w-[60%] truncate">
                      {form.description || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="text-foreground tabular">
                      {form.vehicle || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trip</span>
                    <span className="text-foreground tabular">
                      {form.trip || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt</span>
                    <span className="text-foreground">
                      {form.receiptName ? "Attached" : "Missing"}
                    </span>
                  </div>
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
          <Btn
            variant="ghost"
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            onClick={goBack}
            disabled={step === 1}
          >
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of 3
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : record ? "Save Changes" : "Log Expense"}
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
