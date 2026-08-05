"use client";
import { useState, useMemo } from "react";
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
  Banknote,
  Wallet,
  ArrowDownToLine,
  ArrowLeftRight,
  Truck,
  Scale,
  RotateCcw,
  Receipt,
  Calculator,
  ShieldCheck,
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
import { DRIVERS, TRIPS } from "@/lib/mock-data";
import type { Payment, VoucherType } from "@/lib/types";
import {
  VOUCHER_TYPES,
  VOUCHER_TYPE_META,
  PAYMENT_MODES,
  EMPTY_VOUCHER_FORM,
  type VoucherForm,
  FieldLabel,
  formatINR,
} from "./_helpers";

const VOUCHER_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Advance: Banknote,
  "Add Money": Wallet,
  Withdrawal: ArrowDownToLine,
  Movement: ArrowLeftRight,
  "Truck Forwarding": Truck,
  Settlement: Scale,
  Recovery: RotateCcw,
};

interface AddVoucherDrawerProps {
  open: boolean;
  onClose: () => void;
  initialVoucherType?: string;
  record?: Payment;
  onAdd?: (payment: Payment) => void;
  onUpdate?: (id: string, data: Partial<Payment>) => void;
}

function recordToForm(record: Payment): VoucherForm {
  return {
    ...EMPTY_VOUCHER_FORM,
    voucherType: record.voucherType,
    date: record.date,
    amount: String(record.amount),
    mode: record.mode,
    reference: record.referenceNumber,
    remarks: "",
    driver: record.party,
    trip: record.linkedTrip || "",
    party: record.party,
    forwardingAgent: record.voucherType === "Truck Forwarding" ? record.party : "",
  };
}

function formToData(form: VoucherForm, existing?: Payment): Partial<Payment> {
  const party =
    form.party || form.driver || form.forwardingAgent || existing?.party || "";
  return {
    voucherType: form.voucherType as VoucherType,
    referenceNumber: form.reference || existing?.referenceNumber || "",
    date: form.date,
    party,
    amount: Number(form.amount) || 0,
    mode: form.mode,
    status: existing?.status || "Pending",
    linkedInvoice: existing?.linkedInvoice,
    linkedTrip: form.trip || undefined,
  };
}

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Details" },
  { id: 3, label: "Review" },
];

export function AddVoucherDrawer({
  open,
  onClose,
  initialVoucherType = "Advance",
  record,
  onAdd,
  onUpdate,
}: AddVoucherDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form with the requested
  // voucher type. The parent passes a `key` based on record.id (or voucher type)
  // so the drawer remounts fresh each time, re-running this initializer.
  const [form, setForm] = useState<VoucherForm>(() =>
    record
      ? recordToForm(record)
      : { ...EMPTY_VOUCHER_FORM, voucherType: initialVoucherType },
  );

  // Reset form when voucher type changes via prop (create flow)
  const [lastType, setLastType] = useState<string>(initialVoucherType);
  if (!record && initialVoucherType !== lastType) {
    setLastType(initialVoucherType);
    setForm({ ...EMPTY_VOUCHER_FORM, voucherType: initialVoucherType });
    setStep(1);
  }

  const update = <K extends keyof VoucherForm>(k: K, v: VoucherForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Live settlement preview (when Settlement type) =====
  const settlementPreview = useMemo(() => {
    if (form.voucherType !== "Settlement") return null;
    const amt = Number(form.amount) || 0;
    return {
      advancePaid: Math.round(amt * 0.4),
      expensesClaimed: Math.round(amt * 0.3),
      driverRecovery: Math.round(amt * 0.1),
      netPayable: Math.round(amt * 0.2),
    };
  }, [form.voucherType, form.amount]);

  // ===== Validation =====
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (step === 2) {
      if (!form.amount || Number(form.amount) <= 0)
        errs.push("Amount must be greater than zero");
      if (form.voucherType === "Advance" && !form.driver)
        errs.push("Driver is required for Advance");
      if (form.voucherType === "Recovery" && !form.driver)
        errs.push("Driver is required for Recovery");
      if (form.voucherType === "Withdrawal" && !form.purpose)
        errs.push("Purpose is required for Withdrawal");
      if (form.voucherType === "Movement" && (!form.fromAccount || !form.toAccount))
        errs.push("Both From and To accounts are required for Movement");
      if (form.voucherType === "Truck Forwarding" && !form.forwardingAgent)
        errs.push("Forwarding agent is required for Truck Forwarding");
    }
    return errs;
  }, [step, form]);

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

  const handleSubmit = () => {
    const payload = formToData(form, record);
    if (record && onUpdate) {
      onUpdate(record.id, payload);
      toast.success("Voucher updated", {
        description: `${record.referenceNumber} · ${form.voucherType} · ${formatINR(Number(form.amount) || 0)}`,
      });
    } else if (onAdd) {
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        voucherType: payload.voucherType ?? "Advance",
        referenceNumber: payload.referenceNumber || `RZ-VCH-${String(Math.floor(Math.random() * 9999) + 5000).padStart(5, "0")}`,
        date: payload.date ?? new Date().toISOString(),
        party: payload.party ?? "",
        amount: payload.amount ?? 0,
        mode: payload.mode ?? "Cash",
        status: payload.status ?? "Pending",
        linkedInvoice: payload.linkedInvoice,
        linkedTrip: payload.linkedTrip,
      };
      onAdd(newPayment);
      toast.success("Voucher created", {
        description: `${newPayment.referenceNumber} · ${form.voucherType} · ${formatINR(Number(form.amount) || 0)}`,
      });
    } else {
      const ref = `RZ-VCH-${String(Math.floor(Math.random() * 9999) + 5000).padStart(5, "0")}`;
      toast.success("Voucher created", {
        description: `${ref} · ${form.voucherType} · ${formatINR(Number(form.amount) || 0)}`,
      });
    }
    setStep(1);
    setForm({ ...EMPTY_VOUCHER_FORM, voucherType: initialVoucherType });
    onClose();
  };

  const toInputDate = (iso: string) => iso.slice(0, 10);
  const VTypeIcon = VOUCHER_ICON[form.voucherType] ?? Receipt;
  const typeMeta = VOUCHER_TYPE_META[form.voucherType];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit Voucher" : "Create Voucher"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update voucher details"
                : "Adapts to voucher type · 3 steps · live settlement preview"}
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
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
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
                  </button>
                  {i < STEPS.length - 1 && (
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Choose type */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Select Voucher Type
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {VOUCHER_TYPES.map((v) => {
                    const Icon = VOUCHER_ICON[v] ?? Receipt;
                    const meta = VOUCHER_TYPE_META[v];
                    const selected = form.voucherType === v;
                    return (
                      <button
                        key={v}
                        onClick={() => update("voucherType", v)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-[5px] border p-3 text-left transition-colors",
                          selected
                            ? "border-foreground bg-foreground/5"
                            : "border-border bg-background hover:bg-accent/30",
                        )}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-foreground">
                              {v}
                            </span>
                            {selected && (
                              <Check className="h-3.5 w-3.5 text-foreground" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                            {meta.tagline}
                          </p>
                          <span className="mt-1 inline-block rounded-[3px] border border-border px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                            {meta.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Common: Date & Amount & Mode */}
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Basic Info
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.date)}
                      onChange={(e) =>
                        update("date", new Date(e.target.value).toISOString())
                      }
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel required hint="₹">
                      Amount
                    </FieldLabel>
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
                    <FieldLabel required>Payment Mode</FieldLabel>
                    <Select
                      value={form.mode}
                      onValueChange={(v) => update("mode", v)}
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
            </div>
          )}

          {/* Step 2: Type-specific details */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-[5px] border border-border bg-muted/30 px-3 py-2">
                <VTypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium text-foreground">
                  {form.voucherType}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · {typeMeta.tagline}
                </span>
              </div>

              {/* Advance: Driver, Trip, Amount, Date, Mode, Remarks */}
              {form.voucherType === "Advance" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Advance Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Driver / Staff</FieldLabel>
                      <Select
                        value={form.driver || "none"}
                        onValueChange={(v) => update("driver", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                          <SelectItem value="none">- Not linked -</SelectItem>
                          {DRIVERS.slice(0, 24).map((d) => (
                            <SelectItem key={d.id} value={d.name}>
                              {d.name} · {d.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Trip</FieldLabel>
                      <Select
                        value={form.trip || "none"}
                        onValueChange={(v) => update("trip", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Link to trip" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                          <SelectItem value="none">- Not linked -</SelectItem>
                          {TRIPS.slice(0, 20).map((t) => (
                            <SelectItem key={t.id} value={t.tripId}>
                              {t.tripId} · {t.origin} → {t.destination}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Remarks</FieldLabel>
                      <Textarea
                        value={form.remarks}
                        onChange={(e) => update("remarks", e.target.value)}
                        placeholder="Reason for advance, settlement terms, etc."
                        className="min-h-[64px] rounded-[5px] text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Add Money: Fleet/Prepaid Card, Amount, Date, Mode, Reference */}
              {form.voucherType === "Add Money" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Add Money Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Fleet / Prepaid Card</FieldLabel>
                      <Select
                        value={form.card || "none"}
                        onValueChange={(v) => update("card", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["Indian Oil Fleet Card · ****4521", "HPCL Prepaid · ****8892", "BPCL SmartFleet · ****1276"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Reference</FieldLabel>
                      <Input
                        value={form.reference}
                        onChange={(e) => update("reference", e.target.value)}
                        placeholder="UTR / Transaction ref"
                        className="h-8 rounded-[5px] text-[12px] tabular"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Remarks</FieldLabel>
                      <Textarea
                        value={form.remarks}
                        onChange={(e) => update("remarks", e.target.value)}
                        placeholder="Top-up reason, card balance after credit, etc."
                        className="min-h-[64px] rounded-[5px] text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Withdrawal: Driver/Staff, Amount, Date, Purpose, Authorization */}
              {form.voucherType === "Withdrawal" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Withdrawal Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Driver / Staff</FieldLabel>
                      <Select
                        value={form.driver || "none"}
                        onValueChange={(v) => update("driver", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Who is withdrawing?" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                          <SelectItem value="none">- Select -</SelectItem>
                          {DRIVERS.slice(0, 24).map((d) => (
                            <SelectItem key={d.id} value={d.name}>
                              {d.name} · {d.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel required>Purpose</FieldLabel>
                      <Select
                        value={form.purpose || "none"}
                        onValueChange={(v) => update("purpose", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["Fuel", "Toll", "Driver Allowance", "Repair", "Loading/Unloading", "Misc"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel required>Authorization</FieldLabel>
                      <Select
                        value={form.authorization || "none"}
                        onValueChange={(v) => update("authorization", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Authorised by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["Vikram Deshmukh (Owner)", "Reena Mehta (Finance)", "Rohit Sharma (Ops Mgr)"].map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Movement: details */}
              {form.voucherType === "Movement" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Fund Movement Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>From Account</FieldLabel>
                      <Select
                        value={form.fromAccount || "none"}
                        onValueChange={(v) => update("fromAccount", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["HDFC Operations · 5020xxxx5678", "ICICI Fuel Float · 6220xxxx9012", "Cash Box · Mumbai HQ", "Petty Cash · Pune"].map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel required>To Account</FieldLabel>
                      <Select
                        value={form.toAccount || "none"}
                        onValueChange={(v) => update("toAccount", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Destination" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["HDFC Operations · 5020xxxx5678", "ICICI Fuel Float · 6220xxxx9012", "Cash Box · Mumbai HQ", "Petty Cash · Pune"].map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Remarks</FieldLabel>
                      <Textarea
                        value={form.remarks}
                        onChange={(e) => update("remarks", e.target.value)}
                        placeholder="Internal fund movement reason"
                        className="min-h-[64px] rounded-[5px] text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Truck Forwarding: details */}
              {form.voucherType === "Truck Forwarding" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Truck Forwarding Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Forwarding Agent</FieldLabel>
                      <Input
                        value={form.forwardingAgent}
                        onChange={(e) => update("forwardingAgent", e.target.value)}
                        placeholder="Agent / vendor name"
                        className="h-8 rounded-[5px] text-[13px]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Trip</FieldLabel>
                      <Select
                        value={form.trip || "none"}
                        onValueChange={(v) => update("trip", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Link to trip" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                          <SelectItem value="none">- Not linked -</SelectItem>
                          {TRIPS.slice(0, 20).map((t) => (
                            <SelectItem key={t.id} value={t.tripId}>
                              {t.tripId} · {t.origin} → {t.destination}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel hint="optional">Reference</FieldLabel>
                      <Input
                        value={form.reference}
                        onChange={(e) => update("reference", e.target.value)}
                        placeholder="Agent invoice / LR ref"
                        className="h-8 rounded-[5px] text-[12px] tabular"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement: auto-populated from trip data + manual entry */}
              {form.voucherType === "Settlement" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[6px] border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                        Settlement Inputs
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel required>Driver</FieldLabel>
                        <Select
                          value={form.driver || "none"}
                          onValueChange={(v) => update("driver", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                            <SelectItem value="none">- Select -</SelectItem>
                            {DRIVERS.filter((d) => d.role === "Driver").slice(0, 16).map((d) => (
                              <SelectItem key={d.id} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel required>Trip</FieldLabel>
                        <Select
                          value={form.trip || "none"}
                          onValueChange={(v) => update("trip", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                            <SelectValue placeholder="Select trip" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                            <SelectItem value="none">- Select -</SelectItem>
                            {TRIPS.slice(0, 16).map((t) => (
                              <SelectItem key={t.id} value={t.tripId}>
                                {t.tripId} · {t.origin} → {t.destination}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {settlementPreview && Number(form.amount) > 0 && (
                    <div className="rounded-[6px] border border-border bg-card p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                          Live Settlement Preview
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[13px]">
                          <span className="text-muted-foreground">Advance Paid</span>
                          <span className="tabular">{formatINR(settlementPreview.advancePaid)}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                          <span className="text-muted-foreground">+ Expenses Claimed</span>
                          <span className="tabular">{formatINR(settlementPreview.expensesClaimed)}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                          <span className="text-muted-foreground">− Driver Recovery</span>
                          <span className="tabular">{formatINR(settlementPreview.driverRecovery)}</span>
                        </div>
                        <div className="border-t border-border pt-1.5">
                          <div className="flex justify-between text-[14px] font-medium">
                            <span>Net Payable</span>
                            <span className="tabular">{formatINR(settlementPreview.netPayable)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recovery: Driver, Reason, Amount, Deduction Schedule */}
              {form.voucherType === "Recovery" && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Recovery Details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Driver</FieldLabel>
                      <Select
                        value={form.driver || "none"}
                        onValueChange={(v) => update("driver", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Recover from which driver?" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                          <SelectItem value="none">- Select -</SelectItem>
                          {DRIVERS.filter((d) => d.role === "Driver").slice(0, 16).map((d) => (
                            <SelectItem key={d.id} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel required>Reason</FieldLabel>
                      <Select
                        value={form.reason || "none"}
                        onValueChange={(v) => update("reason", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Recovery reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Select -</SelectItem>
                          {["Outstanding advance balance", "Damage to vehicle", "Short delivery", "Fuel pilferage", "Fine / Challan", "Other"].map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel required>Deduction Schedule</FieldLabel>
                      <Select
                        value={form.deductionSchedule}
                        onValueChange={(v) => update("deductionSchedule", v)}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Next 1 trip", "Next 3 trips", "Next 5 trips", "Next 10 trips", "Monthly salary"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Final Review
                    </span>
                  </div>
                  <StatusBadge variant="outline">Ready to create</StatusBadge>
                </div>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <ReviewRow label="Voucher Type" value={form.voucherType} />
                  <ReviewRow label="Amount" value={formatINR(Number(form.amount) || 0)} mono />
                  <ReviewRow label="Date" value={toInputDate(form.date)} mono />
                  <ReviewRow label="Mode" value={form.mode} />
                  {form.driver && <ReviewRow label="Driver / Staff" value={form.driver} />}
                  {form.trip && <ReviewRow label="Trip" value={form.trip} mono />}
                  {form.purpose && <ReviewRow label="Purpose" value={form.purpose} />}
                  {form.authorization && <ReviewRow label="Authorised By" value={form.authorization} />}
                  {form.card && <ReviewRow label="Card" value={form.card} />}
                  {form.fromAccount && <ReviewRow label="From Account" value={form.fromAccount} />}
                  {form.toAccount && <ReviewRow label="To Account" value={form.toAccount} />}
                  {form.forwardingAgent && <ReviewRow label="Forwarding Agent" value={form.forwardingAgent} />}
                  {form.reason && <ReviewRow label="Recovery Reason" value={form.reason} />}
                  {form.voucherType === "Recovery" && (
                    <ReviewRow label="Deduction Schedule" value={form.deductionSchedule} />
                  )}
                  {form.reference && <ReviewRow label="Reference" value={form.reference} mono />}
                </div>
              </div>

              {/* Settlement breakdown if applicable */}
              {settlementPreview && Number(form.amount) > 0 && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Settlement Breakdown
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Advance Paid</span>
                      <span className="tabular">{formatINR(settlementPreview.advancePaid)}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">+ Expenses Claimed</span>
                      <span className="tabular">{formatINR(settlementPreview.expensesClaimed)}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">− Driver Recovery</span>
                      <span className="tabular">{formatINR(settlementPreview.driverRecovery)}</span>
                    </div>
                    <div className="border-t border-border pt-1.5">
                      <div className="flex justify-between text-[14px] font-medium">
                        <span>Net Payable</span>
                        <span className="tabular">{formatINR(settlementPreview.netPayable)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {form.remarks && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      Remarks
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">{form.remarks}</p>
                </div>
              )}
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

        {/* Live total strip */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {form.voucherType} · {typeMeta.category}
          </span>
          <span className="tabular text-[13px] font-medium text-foreground">
            {formatINR(Number(form.amount) || 0)}
          </span>
        </div>

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
            >
              {record ? "Save Changes" : "Create Voucher"}
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
