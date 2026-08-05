"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Truck,
  User,
  Fuel,
  Coins,
  Gauge,
  Upload,
  FileText,
  Paperclip,
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
import { VEHICLES, DRIVERS } from "@/lib/mock-data";
import type { FuelEntry } from "@/lib/types";
import {
  FUEL_TYPES,
  STATIONS,
  PAYMENT_MODES,
  EMPTY_FUEL_FORM,
  type FuelForm,
  FieldLabel,
  toInputDate,
  formatINR,
} from "./_helpers";

interface LogFuelDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: FuelEntry;
  onAdd?: (fuelEntry: FuelEntry) => void;
  onUpdate?: (id: string, data: Partial<FuelEntry>) => void;
}

function recordToForm(record: FuelEntry): FuelForm {
  return {
    ...EMPTY_FUEL_FORM,
    date: record.date,
    vehicle: record.vehicle,
    driver: record.driver || "",
    fuelType: record.fuelType,
    station: record.station,
    quantity: String(record.quantity),
    unitPrice: String(record.unitPrice),
    totalCost: String(record.totalCost),
    odometer: String(record.odometer),
  };
}

function formToData(form: FuelForm, existing?: FuelEntry): Partial<FuelEntry> {
  const qty = Number(form.quantity) || 0;
  const unitPrice = Number(form.unitPrice) || 0;
  const total = (Number(form.totalCost) || 0) > 0 ? Number(form.totalCost) : qty * unitPrice;
  return {
    date: form.date,
    vehicle: form.vehicle,
    driver: form.driver || undefined,
    station: form.station,
    fuelType: form.fuelType,
    quantity: qty,
    unitPrice,
    totalCost: total,
    odometer: Number(form.odometer) || 0,
    efficiency: existing?.efficiency,
    anomaly: existing?.anomaly,
    anomalyNote: existing?.anomalyNote,
  };
}

const STEPS = [
  { id: 1, label: "Vehicle & Qty" },
  { id: 2, label: "Cost & Meter" },
  { id: 3, label: "Review" },
];

export function LogFuelDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: LogFuelDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh each time.
  const [form, setForm] = useState<FuelForm>(() =>
    record ? recordToForm(record) : EMPTY_FUEL_FORM,
  );

  const update = <K extends keyof FuelForm>(k: K, v: FuelForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Auto-compute total cost from qty × price
  const computedTotal = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0);

  const errors: string[] = [];
  if (step === 1) {
    if (!form.vehicle) errors.push("Vehicle is required");
    if (!form.quantity || Number(form.quantity) <= 0) errors.push("Quantity must be greater than zero");
    if (!form.fuelType) errors.push("Fuel type is required");
  }
  if (step === 2) {
    if (!form.unitPrice || Number(form.unitPrice) <= 0) errors.push("Unit price is required");
    if (!form.odometer || Number(form.odometer) < 0) errors.push("Odometer reading is required");
    if (!form.paymentMode) errors.push("Payment mode is required");
  }

  const isLastStep = step === 3;
  const canAdvance = errors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", { description: errors[0] });
      return;
    }
    if (step < 3) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      update("receiptName", f.name);
      update("receiptSize", `${(f.size / 1024 / 1024).toFixed(2)} MB`);
      toast.success("Receipt attached", { description: f.name });
    }
  };

  const handleSubmit = () => {
    const payload = formToData(form, record);
    if (record && onUpdate) {
      onUpdate(record.id, payload);
      toast.success("Fuel entry updated", {
        description: `${form.vehicle} · ${form.quantity} L · ${formatINR(computedTotal)}`,
      });
    } else if (onAdd) {
      const newFuelEntry: FuelEntry = {
        id: `fuel-${Date.now()}`,
        date: payload.date ?? new Date().toISOString(),
        vehicle: payload.vehicle ?? "",
        driver: payload.driver,
        station: payload.station ?? "",
        fuelType: payload.fuelType ?? "Diesel",
        quantity: payload.quantity ?? 0,
        unitPrice: payload.unitPrice ?? 0,
        totalCost: payload.totalCost ?? 0,
        odometer: payload.odometer ?? 0,
        efficiency: payload.efficiency ?? 0,
        anomaly: payload.anomaly ?? false,
        anomalyNote: payload.anomalyNote,
      };
      onAdd(newFuelEntry);
      toast.success("Fuel entry logged", {
        description: `${form.vehicle} · ${form.quantity} L · ${formatINR(computedTotal)}`,
      });
    } else {
      toast.success("Fuel entry logged", {
        description: `${form.vehicle} · ${form.quantity} L · ${formatINR(computedTotal)}`,
      });
    }
    setStep(1);
    setForm(EMPTY_FUEL_FORM);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Fuel Entry" : "Log Fuel Entry"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update fuel entry details"
                : "3 steps · auto-compute total · Rean checks for anomalies on save"}
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
                  {i < STEPS.length - 1 && (
                    <div className={"h-px w-6 " + (step > s.id ? "bg-foreground" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Vehicle & Qty */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vehicle & Driver</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <FieldLabel required>Vehicle</FieldLabel>
                    <Select value={form.vehicle || "none"} onValueChange={(v) => update("vehicle", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select vehicle -</SelectItem>
                        {VEHICLES.map((v) => (
                          <SelectItem key={v.id} value={v.name}>{v.name} · {v.licensePlate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel hint="optional">Driver</FieldLabel>
                    <Select value={form.driver || "none"} onValueChange={(v) => update("driver", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not assigned -</SelectItem>
                        {DRIVERS.filter((d) => d.role === "Driver").map((d) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Fuel & Station</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Fuel Type</FieldLabel>
                    <Select value={form.fuelType} onValueChange={(v) => update("fuelType", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Station</FieldLabel>
                    <Select value={form.station} onValueChange={(v) => update("station", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <FieldLabel required hint="litres">Quantity</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.quantity}
                      onChange={(e) => update("quantity", e.target.value)}
                      placeholder="0.0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel required>Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.date)}
                      onChange={(e) => update("date", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Cost & Meter */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Cost</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required hint="₹/L">Unit Price</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unitPrice}
                      onChange={(e) => update("unitPrice", e.target.value)}
                      placeholder="0.00"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="auto">Total Cost</FieldLabel>
                    <div className="flex h-8 items-center rounded-[5px] border border-border bg-muted/40 px-3 text-[13px] tabular text-foreground font-medium">
                      {formatINR(computedTotal)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <FieldLabel required>Payment Mode</FieldLabel>
                    <Select value={form.paymentMode} onValueChange={(v) => update("paymentMode", v)}>
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
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Odometer</span>
                </div>
                <FieldLabel required hint="km">Odometer Reading</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={form.odometer}
                  onChange={(e) => update("odometer", e.target.value)}
                  placeholder="0"
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Used to compute efficiency (km/L) against the previous refuel for this vehicle.
                </p>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Receipt</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-foreground/30 hover:bg-accent/30">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Click to upload receipt</span>
                  <span className="text-[11px] text-muted-foreground">PDF, JPG, PNG · up to 10 MB</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleReceipt} />
                </label>
                {form.receiptName && (
                  <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-[12px] text-foreground">{form.receiptName}</span>
                    </div>
                    <span className="tabular text-[11px] text-muted-foreground">{form.receiptSize}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Entry Summary</span>
                  <span className="text-[13px] tabular font-medium text-foreground">{formatINR(computedTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Vehicle" value={form.vehicle} />
                  <ReviewRow label="Driver" value={form.driver || "-"} />
                  <ReviewRow label="Fuel Type" value={form.fuelType} />
                  <ReviewRow label="Station" value={form.station} />
                  <ReviewRow label="Quantity" value={`${form.quantity} L`} mono />
                  <ReviewRow label="Unit Price" value={`₹${form.unitPrice}/L`} mono />
                  <ReviewRow label="Total Cost" value={formatINR(computedTotal)} mono />
                  <ReviewRow label="Odometer" value={`${form.odometer} km`} mono />
                  <ReviewRow label="Payment Mode" value={form.paymentMode} />
                  <ReviewRow label="Receipt" value={form.receiptName ? "Attached" : "None"} />
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-muted/40 p-4">
                <p className="text-[12px] text-muted-foreground">
                  On save, Rean will scan this entry against the vehicle's history and flag anomalies (overfills, mileage gaps, price outliers).
                </p>
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
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 3</div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
              {record ? "Save Changes" : "Log Entry"}
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
      <span className={"text-[13px] text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}
