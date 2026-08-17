"use client";

import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
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
import {
  FIN_OPS_PAYMENT_MODES,
  FIN_OPS_STATUSES,
  type FinOpsType,
  type PaymentMode,
  type FinOpsStatus,
  type FinOpsVoucher,
} from "@/lib/store/financial-ops-store";
import { useTreasuryData } from "./use-treasury-data";
import { DRIVERS, TRIPS, VEHICLES, VENDORS } from "@/lib/mock-data";
import { FieldLabel, formatINR, formatDate } from "./_helpers";

/* ============================================================
   VoucherForm - adapts fields by FinOpsType.
   Used inside a Sheet drawer. Type-driven field visibility.
   ============================================================ */

const STEPS_BY_TYPE: Record<FinOpsType, string[]> = {
  Advance: ["Details", "Review"],
  "Add Money": ["Details", "Review"],
  Withdrawal: ["Details", "Review"],
  Movement: ["Details", "Review"],
  "Truck Forwarding": ["Details", "Review"],
  Settlement: ["Details", "Review"],
  "Recovery Voucher": ["Details", "Review"],
};

export interface VoucherFormProps {
  open: boolean;
  onClose: () => void;
  type: FinOpsType;
  /** When provided the form operates in edit mode for this voucher. */
  voucher?: FinOpsVoucher;
  /** Shared hook instance from the parent, so a save here is immediately
   *  reflected in the parent's voucher list without a second fetch. */
  data: ReturnType<typeof useTreasuryData>;
}

interface FormState {
  party: string;
  amount: string;
  mode: PaymentMode;
  reference: string;
  date: string;
  against: string;
  remarks: string;
  status: FinOpsStatus;
  // Settlement
  totalAdvance: string;
  totalExpense: string;
  settledAmount: string;
  // Movement
  fromAccount: string;
  toAccount: string;
  // Truck Forwarding
  vehicle: string;
  vendor: string;
  lrNumber: string;
  from: string;
  to: string;
  // Withdrawal
  approvedBy: string;
}

function emptyForm(): FormState {
  return {
    party: "",
    amount: "",
    mode: "UPI",
    reference: "",
    date: new Date().toISOString().slice(0, 10),
    against: "",
    remarks: "",
    status: "Pending",
    totalAdvance: "",
    totalExpense: "",
    settledAmount: "",
    fromAccount: "",
    toAccount: "",
    vehicle: "",
    vendor: "",
    lrNumber: "",
    from: "",
    to: "",
    approvedBy: "",
  };
}

const PLACEHOLDER_PARTY: Record<FinOpsType, string> = {
  Advance: "Select driver / staff",
  "Add Money": "Cash counter / Bank / Customer",
  Withdrawal: "Account name",
  Movement: "Internal movement",
  "Truck Forwarding": "Forwarding vendor",
  Settlement: "Driver / staff to settle",
  "Recovery Voucher": "Driver / customer to recover from",
};

function fromVoucher(v: FinOpsVoucher): FormState {
  return {
    party: v.party,
    amount: String(v.amount),
    mode: v.mode,
    reference: v.reference,
    date: v.date.slice(0, 10),
    against: v.against,
    remarks: v.remarks,
    status: v.status,
    totalAdvance: v.totalAdvance != null ? String(v.totalAdvance) : "",
    totalExpense: v.totalExpense != null ? String(v.totalExpense) : "",
    settledAmount: v.settledAmount != null ? String(v.settledAmount) : "",
    fromAccount: v.fromAccount ?? "",
    toAccount: v.toAccount ?? "",
    vehicle: v.vehicle ?? "",
    vendor: v.vendor ?? "",
    lrNumber: v.lrNumber ?? "",
    from: v.from ?? "",
    to: v.to ?? "",
    approvedBy: v.approvedBy ?? "",
  };
}

export function VoucherForm({ open, onClose, type, voucher, data }: VoucherFormProps) {
  const { addVoucher, updateVoucher } = data;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Reset when (re)opened with a new type
  const [lastType, setLastType] = useState<FinOpsType>(type);
  if (type !== lastType) {
    setLastType(type);
    setForm(voucher ? fromVoucher(voucher) : emptyForm());
    setStep(1);
  }

  // Pre-fill from voucher when entering edit mode.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && voucher) {
      setForm(fromVoucher(voucher));
      setStep(1);
    } else if (open && !voucher) {
      setForm(emptyForm());
      setStep(1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, voucher?.id]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Live settlement preview
  const settlementPreview = useMemo(() => {
    if (type !== "Settlement") return null;
    const adv = Number(form.totalAdvance) || 0;
    const exp = Number(form.totalExpense) || 0;
    const net = adv - exp;
    const settled = Number(form.settledAmount) || 0;
    return { net, settled, balance: net - settled };
  }, [type, form.totalAdvance, form.totalExpense, form.settledAmount]);

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (step === 1) {
      if (!form.amount || Number(form.amount) <= 0) errs.push("Amount must be greater than zero");
      if (type !== "Movement" && !form.party.trim()) errs.push("Party is required");
      if (type === "Movement" && (!form.fromAccount.trim() || !form.toAccount.trim())) errs.push("From and To accounts are required");
      if (type === "Truck Forwarding" && !form.vehicle.trim()) errs.push("Vehicle is required");
      if (type === "Settlement" && !form.party.trim()) errs.push("Party is required");
    }
    return errs;
  }, [step, form, type]);

  const goNext = () => {
    if (errors.length) {
      toast("Cannot continue", { description: errors[0] });
      return;
    }
    setStep(2);
  };
  const goBack = () => setStep(1);

  const handleSubmit = async () => {
    const amt = Number(form.amount) || 0;
    const base: Omit<FinOpsVoucher, "id" | "number" | "createdAt" | "updatedAt"> = {
      type,
      party: form.party || "Internal",
      amount: amt,
      mode: form.mode,
      reference: form.reference,
      date: new Date(form.date).toISOString(),
      status: form.status,
      against: form.against,
      remarks: form.remarks,
      fromAccount: type === "Movement" ? form.fromAccount : undefined,
      toAccount: type === "Movement" ? form.toAccount : undefined,
      vehicle: type === "Truck Forwarding" ? form.vehicle : undefined,
      vendor: type === "Truck Forwarding" ? form.vendor : undefined,
      lrNumber: type === "Truck Forwarding" ? form.lrNumber : undefined,
      from: type === "Truck Forwarding" ? form.from : undefined,
      to: type === "Truck Forwarding" ? form.to : undefined,
      approvedBy: type === "Withdrawal" ? form.approvedBy : undefined,
      totalAdvance: type === "Settlement" ? Number(form.totalAdvance) || 0 : undefined,
      totalExpense: type === "Settlement" ? Number(form.totalExpense) || 0 : undefined,
      netPayable: settlementPreview?.net,
      settledAmount: type === "Settlement" ? Number(form.settledAmount) || 0 : undefined,
      balance: settlementPreview?.balance,
      createdBy: voucher?.createdBy ?? "Current user",
    };
    if (voucher) {
      await updateVoucher(voucher.id, base);
      toast.success("Voucher updated", {
        description: `${type} · ${formatINR(amt)} · ${voucher.number}`,
      });
      onClose();
      return;
    }
    const id = await addVoucher(base);
    if (!id) return; // addVoucher already toasted the error
    toast.success("Voucher created", {
      description: `${type} · ${formatINR(amt)}`,
    });
    onClose();
  };

  const steps = STEPS_BY_TYPE[type];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {voucher ? `Edit ${type} Voucher` : `Create ${type} Voucher`}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {voucher
                ? `Editing ${voucher.number} · ${voucher.party}`
                : typeDesc(type)}
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

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium",
                      (active || done) && "border-foreground bg-foreground text-background",
                      !active && !done && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : n}
                  </span>
                  <span className={cn("text-[12px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                    {s}
                  </span>
                  {i < steps.length - 1 && <div className={cn("h-px w-4", done ? "bg-foreground" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {/* Common fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {type !== "Movement" && (
                  <div className="sm:col-span-2">
                    <FieldLabel required>Party</FieldLabel>
                    {type === "Advance" || type === "Settlement" || type === "Recovery Voucher" ? (
                      <Select value={form.party} onValueChange={(v) => update("party", v)}>
                        <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder={PLACEHOLDER_PARTY[type]} /></SelectTrigger>
                        <SelectContent>
                          {DRIVERS.slice(0, 12).map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          {VENDORS.slice(0, 4).map((v) => <SelectItem key={v.id} value={v.companyName}>{v.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : type === "Truck Forwarding" ? (
                      <Select value={form.party} onValueChange={(v) => update("party", v)}>
                        <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder={PLACEHOLDER_PARTY[type]} /></SelectTrigger>
                        <SelectContent>
                          {VENDORS.slice(0, 8).map((v) => <SelectItem key={v.id} value={v.companyName}>{v.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <SavageInput category="name" value={form.party}
                        onChange={(e) => update("party", e.target.value)}
                        placeholder={PLACEHOLDER_PARTY[type]} />
                    )}
                  </div>
                )}

                <div>
                  <FieldLabel required hint="₹">Amount</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.amount}
                    onChange={(e) => update("amount", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Mode</FieldLabel>
                  <Select value={form.mode} onValueChange={(v) => update("mode", v as PaymentMode)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIN_OPS_PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <input type="date" value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel>Reference</FieldLabel>
                  <SavageInput category="consignmentNumber" value={form.reference}
                    onChange={(e) => update("reference", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel hint="Trip / LR / Invoice / Account">Against</FieldLabel>
                  {type === "Advance" || type === "Settlement" || type === "Truck Forwarding" || type === "Recovery Voucher" ? (
                    <Select value={form.against} onValueChange={(v) => update("against", v)}>
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Select trip / LR" /></SelectTrigger>
                      <SelectContent>
                        {TRIPS.slice(0, 12).map((t) => <SelectItem key={t.id} value={t.tripId}>{t.tripId} · {t.lrNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <SavageInput category="consignmentNumber" value={form.against}
                      onChange={(e) => update("against", e.target.value)} />
                  )}
                </div>
              </div>

              {/* Type-specific fields */}
              {type === "Movement" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>From Account</FieldLabel>
                    <SavageInput category="name" value={form.fromAccount}
                      onChange={(e) => update("fromAccount", e.target.value)} placeholder="HDFC Current - 0452" />
                  </div>
                  <div>
                    <FieldLabel required>To Account</FieldLabel>
                    <SavageInput category="name" value={form.toAccount}
                      onChange={(e) => update("toAccount", e.target.value)} placeholder="ICICI Fleet - 6610" />
                  </div>
                </div>
              )}

              {type === "Withdrawal" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel hint="optional">Approved By</FieldLabel>
                    <SavageInput category="name" value={form.approvedBy}
                      onChange={(e) => update("approvedBy", e.target.value)} placeholder="Owner / Manager name" />
                  </div>
                </div>
              )}

              {type === "Truck Forwarding" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Vehicle</FieldLabel>
                    <Select value={form.vehicle} onValueChange={(v) => update("vehicle", v)}>
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>
                        {VEHICLES.slice(0, 12).map((v) => <SelectItem key={v.id} value={v.licensePlate}>{v.licensePlate} · {v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Vendor</FieldLabel>
                    <Select value={form.vendor} onValueChange={(v) => update("vendor", v)}>
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Forwarding vendor" /></SelectTrigger>
                      <SelectContent>
                        {VENDORS.slice(0, 8).map((v) => <SelectItem key={v.id} value={v.companyName}>{v.companyName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel hint="optional">LR Number</FieldLabel>
                    <SavageInput category="consignmentNumber" value={form.lrNumber}
                      onChange={(e) => update("lrNumber", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>From</FieldLabel>
                      <SavageInput category="city" value={form.from}
                        onChange={(e) => update("from", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>To</FieldLabel>
                      <SavageInput category="city" value={form.to}
                        onChange={(e) => update("to", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {type === "Settlement" && (
                <div className="rounded-[6px] border border-border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-medium">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    Settlement breakdown
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <FieldLabel hint="₹">Total Advance</FieldLabel>
                      <SavageInput category="amount" type="number" value={form.totalAdvance}
                        onChange={(e) => update("totalAdvance", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel hint="₹">Total Expense</FieldLabel>
                      <SavageInput category="amount" type="number" value={form.totalExpense}
                        onChange={(e) => update("totalExpense", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel hint="₹">Settled Amount</FieldLabel>
                      <SavageInput category="amount" type="number" value={form.settledAmount}
                        onChange={(e) => update("settledAmount", e.target.value)} />
                    </div>
                  </div>
                  {settlementPreview && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Net Payable</span>
                        <span className="tabular font-medium text-foreground">{formatINR(settlementPreview.net)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="tabular font-medium text-foreground">{formatINR(settlementPreview.balance)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Initial Status</FieldLabel>
                  <Select value={form.status} onValueChange={(v) => update("status", v as FinOpsStatus)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIN_OPS_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <FieldLabel>Remarks</FieldLabel>
                <SavageTextarea category="remarks" rows={3} value={form.remarks}
                  onChange={(e) => update("remarks", e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <ReviewRow label="Type" value={type} />
              <ReviewRow label="Party" value={form.party || "Internal"} />
              <ReviewRow label="Amount" value={formatINR(Number(form.amount) || 0)} mono />
              <ReviewRow label="Mode" value={form.mode} />
              <ReviewRow label="Date" value={formatDate(new Date(form.date).toISOString())} mono />
              <ReviewRow label="Reference" value={form.reference || "-"} mono />
              <ReviewRow label="Against" value={form.against || "-"} mono />
              <ReviewRow label="Status" value={form.status} />
              {type === "Movement" && (
                <>
                  <ReviewRow label="From Account" value={form.fromAccount || "-"} />
                  <ReviewRow label="To Account" value={form.toAccount || "-"} />
                </>
              )}
              {type === "Truck Forwarding" && (
                <>
                  <ReviewRow label="Vehicle" value={form.vehicle || "-"} mono />
                  <ReviewRow label="Vendor" value={form.vendor || "-"} />
                  <ReviewRow label="Route" value={`${form.from || "-"} → ${form.to || "-"}`} />
                  <ReviewRow label="LR #" value={form.lrNumber || "-"} mono />
                </>
              )}
              {type === "Settlement" && settlementPreview && (
                <>
                  <ReviewRow label="Total Advance" value={formatINR(Number(form.totalAdvance) || 0)} mono />
                  <ReviewRow label="Total Expense" value={formatINR(Number(form.totalExpense) || 0)} mono />
                  <ReviewRow label="Net Payable" value={formatINR(settlementPreview.net)} mono />
                  <ReviewRow label="Settled" value={formatINR(Number(form.settledAmount) || 0)} mono />
                  <ReviewRow label="Balance" value={formatINR(settlementPreview.balance)} mono />
                </>
              )}
              {form.remarks && <ReviewRow label="Remarks" value={form.remarks} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          {step === 1 ? (
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          ) : (
            <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goBack}>Back</Btn>
          )}
          {step === 1 ? (
            <Btn variant="primary" onClick={goNext}>
              Review
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          ) : (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
              {voucher ? "Save Changes" : "Create Voucher"}
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function typeDesc(type: FinOpsType): string {
  switch (type) {
    case "Advance":
      return "Cash/UPI advance to driver or staff for an upcoming trip.";
    case "Add Money":
      return "Top-up cash or inflow from customer / bank to operating account.";
    case "Withdrawal":
      return "Cash withdrawal from account for a specific purpose.";
    case "Movement":
      return "Internal fund movement between two accounts - no external party.";
    case "Truck Forwarding":
      return "Payment to a forwarding vendor for a vehicle/leg you didn't run.";
    case "Settlement":
      return "Close a trip - net advance, expenses, balance and settled amount.";
    case "Recovery Voucher":
      return "Recover advance, dues or claims from a driver or customer.";
  }
}
