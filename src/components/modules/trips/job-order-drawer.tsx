"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { Autocomplete, type AutocompleteOption } from "@/components/shared/autocomplete";
import { VEHICLES, DRIVERS, CUSTOMERS, VENDORS } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Package,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Building2,
  Banknote,
  FileText,
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
  JOB_ORDER_NEW_STEPS,
  EMPTY_JOB_ORDER,
  ORDER_MODES_FULL,
  ORDER_TYPES,
  SERVICE_MODES,
  LOAD_TYPES,
  RATE_CALC_TYPES,
  formatINR,
  isValidGstin,
  type JobOrderForm,
} from "./_helpers";
import type { Trip } from "@/lib/types";

interface JobOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Create callback - persists the new trip to the parent list state. */
  onAdd?: (trip: Trip) => void;
}

const BRANCHES = ["Mumbai HQ", "Pune Branch", "Delhi NCR", "Bengaluru Hub", "Chennai Coastal", "Kolkata East"];
const MARKETING_PEOPLE = [
  "Vikram Deshmukh",
  "Priya Menon",
  "Aman Khanna",
  "Rohit Sharma",
  "Sneha Iyer",
  "Karthik Subramaniam",
  "Divya Reddy",
];

export function JobOrderDrawer({ open, onClose, onAdd }: JobOrderDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobOrderForm>(EMPTY_JOB_ORDER);
  const [freightOverride, setFreightOverride] = useState<string>("");

  const update = <K extends keyof JobOrderForm>(k: K, v: JobOrderForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Customer autocomplete options =====
  const customerOptions: AutocompleteOption[] = useMemo(
    () => CUSTOMERS.map((c) => ({ value: c.companyName, label: c.companyName, hint: c.city })),
    [],
  );

  const partyOptions: AutocompleteOption[] = useMemo(() => {
    const set: AutocompleteOption[] = [];
    const seen = new Set<string>();
    const push = (label: string, hint: string, kind: string) => {
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      set.push({ value: label, label, hint: `${hint} · ${kind}` });
    };
    CUSTOMERS.forEach((c) => push(c.companyName, c.city, "Customer"));
    VENDORS.forEach((v) => push(v.companyName, v.city, "Vendor"));
    return set;
  }, []);

  // ===== Per-step validation =====
  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    // Step 1 - Customer & Dates
    const s1: string[] = [];
    if (!form.customer.trim()) s1.push("Customer is required");
    if (!form.date) s1.push("Date is required");
    if (!form.expectedDate) s1.push("Expected date is required");
    if (!form.orderDate) s1.push("Order date is required");
    if (!form.orderNumber.trim()) s1.push("Order number is required");
    if (!form.assignedBranch) s1.push("Assigned branch is required");
    if (s1.length) errors[1] = s1;
    // Step 2 - Locations
    const s2: string[] = [];
    if (!form.source.trim()) s2.push("Source is required");
    if (!form.destination.trim()) s2.push("Destination is required");
    if (!form.gstin.trim()) s2.push("GSTIN is required");
    else if (!isValidGstin(form.gstin)) s2.push("GSTIN must be 15 chars and valid format");
    if (!form.orderMode) s2.push("Order mode is required");
    if (!form.orderType) s2.push("Order type is required");
    if (!form.serviceMode) s2.push("Service mode is required");
    if (!form.loadType) s2.push("Load type is required");
    if (s2.length) errors[2] = s2;
    // Step 3 - Parties
    const s3: string[] = [];
    if (!form.consignor.trim()) s3.push("Consignor is required");
    if (!form.consignee.trim()) s3.push("Consignee is required");
    if (s3.length) errors[3] = s3;
    // Step 4 - Cargo & Rate
    const s4: string[] = [];
    if (!form.grossWeight.trim() || Number(form.grossWeight) <= 0) s4.push("Gross weight must be greater than 0");
    if (!form.numberOfVehicles.trim() || Number(form.numberOfVehicles) < 1) s4.push("Number of vehicles must be at least 1");
    if (!form.rate.trim() || Number(form.rate) <= 0) s4.push("Rate must be greater than 0");
    if (s4.length) errors[4] = s4;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === JOB_ORDER_NEW_STEPS.length;
  const canAdvance = currentErrors.length === 0;

  // ===== Auto freight = rate × qty (per calc type) =====
  const computedFreight = useMemo(() => {
    const rate = Number(form.rate) || 0;
    const nVeh = Number(form.numberOfVehicles) || 1;
    const pkgs = Number(form.packages) || 0;
    const gross = Number(form.grossWeight) || 0;
    const tonnes = gross / 1000;
    if (form.rateCalcType === "Per Km") return rate * 480 * nVeh;
    if (form.rateCalcType === "Per Trip") return rate * nVeh;
    if (form.rateCalcType === "Per Tonne") return rate * tonnes * nVeh;
    if (form.rateCalcType === "Per Package") return rate * pkgs * nVeh;
    return rate;
  }, [form.rate, form.numberOfVehicles, form.packages, form.grossWeight, form.rateCalcType]);

  const freight = freightOverride !== "" ? Number(freightOverride) || 0 : computedFreight;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: currentErrors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < JOB_ORDER_NEW_STEPS.length) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const goTo = (s: number) => {
    if (s < step) {
      setStep(s);
      return;
    }
    for (let i = step; i < s; i++) {
      if (stepErrors[i]?.length) {
        toast("Complete step " + i + " first", { description: stepErrors[i][0] });
        setStep(i);
        return;
      }
    }
    setStep(s);
  };

  // ===== Submit =====
  const handleSubmit = () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    if (onAdd) {
      const now = new Date().toISOString();
      const vehicle = VEHICLES.find((v) => v.name === form.vehicle) ?? VEHICLES[0];
      const driver = DRIVERS.find((d) => d.name === form.driver) ?? DRIVERS[0];
      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        tripId: form.orderNumber || `TRIP-${Date.now()}`,
        lrNumber: form.consignmentNumber || `LR-${Date.now()}`,
        consignor: form.consignor || form.customer,
        consignee: form.consignee || form.customer,
        origin: form.source,
        destination: form.destination,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        driverId: driver.id,
        driverName: driver.name,
        status: "Planned",
        createdDate: now,
        expectedDelivery: form.expectedDate || now,
        freightAmount: freight,
        paymentStatus: "Unpaid",
        orderMode: form.orderModeLegacy,
        eWayBill: form.triggerEwayBill ? "PENDING" : undefined,
        distanceKm: 480,
        customer: form.customer,
      };
      onAdd(newTrip);
      toast.success("Job Order created", {
        description: `${form.orderNumber} · ${form.customer} · Freight ${formatINR(freight)}`,
      });
      setStep(1);
      setForm({ ...EMPTY_JOB_ORDER, orderNumber: `JO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}` });
      setFreightOverride("");
      onClose();
      return;
    }
    toast.success("Job Order created", {
      description: `${form.orderNumber} · ${form.customer} · Freight ${formatINR(freight)}`,
    });
    setStep(1);
    setForm({ ...EMPTY_JOB_ORDER, orderNumber: `JO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}` });
    setFreightOverride("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Create Job Order
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Five steps · auto-saved as draft · {form.orderNumber || "-"}
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
            {JOB_ORDER_NEW_STEPS.map((s, i) => {
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
                        (active || done) && "border-foreground bg-foreground text-background",
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
                    {errored && <AlertCircle className="h-3 w-3 text-foreground" />}
                  </button>
                  {i < JOB_ORDER_NEW_STEPS.length - 1 && (
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
          {step === 1 && <Step1Customer form={form} update={update} customerOptions={customerOptions} />}
          {step === 2 && <Step2Locations form={form} update={update} />}
          {step === 3 && <Step3Parties form={form} update={update} partyOptions={partyOptions} />}
          {step === 4 && (
            <Step4Cargo
              form={form}
              update={update}
              computedFreight={computedFreight}
              freightOverride={freightOverride}
              setFreightOverride={setFreightOverride}
              freight={freight}
            />
          )}
          {step === 5 && (
            <Step5Review
              form={form}
              freight={freight}
              stepErrors={stepErrors}
            />
          )}
        </div>

        {/* Validation strip */}
        {currentErrors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{currentErrors[0]}</span>
              {currentErrors.length > 1 && (
                <span className="text-muted-foreground">· {currentErrors.length - 1} more</span>
              )}
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
            Step {step} of {JOB_ORDER_NEW_STEPS.length}
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
            >
              Create Job Order
            </Btn>
          ) : (
            <Btn
              variant="primary"
              onClick={goNext}
              disabled={!canAdvance}
              iconRight={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Continue
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Shared field components =====
function FieldGroup({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </Label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function PillChoice<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: readonly T[];
  value: string;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-[5px] border border-border p-0.5",
        columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4",
      )}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
            value === o ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ===== Step 1: Customer & Dates =====
function Step1Customer({
  form,
  update,
  customerOptions,
}: {
  form: JobOrderForm;
  update: <K extends keyof JobOrderForm>(k: K, v: JobOrderForm[K]) => void;
  customerOptions: AutocompleteOption[];
}) {
  return (
    <StepShell
      icon={<Calendar className="h-4 w-4" />}
      title="Customer & Dates"
      subtitle="Pick the customer, lock the dates, and assign a branch."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Customer Name" required>
          <Autocomplete
            value={form.customer}
            onChange={(v) => update("customer", v)}
            options={customerOptions}
            placeholder="Search customer…"
            emptyText="No customer found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Date" required>
          <SavageInput
            category="amount"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Expected Date" required>
          <SavageInput
            category="amount"
            type="date"
            value={form.expectedDate}
            onChange={(e) => update("expectedDate", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Order Date" required>
          <SavageInput
            category="amount"
            type="date"
            value={form.orderDate}
            onChange={(e) => update("orderDate", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Order Number" required hint="Auto-generated · editable">
          <SavageInput
            category="consignmentNumber"
            value={form.orderNumber}
            onChange={(e) => update("orderNumber", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Assigned Branch" required>
          <Select value={form.assignedBranch} onValueChange={(v) => update("assignedBranch", v)}>
            <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b} className="text-[13px]">{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup label="Marketing Person">
          <Select value={form.marketingPerson} onValueChange={(v) => update("marketingPerson", v)}>
            <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
              <SelectValue placeholder="Assign account manager" />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_PEOPLE.map((p) => (
                <SelectItem key={p} value={p} className="text-[13px]">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>
    </StepShell>
  );
}

// ===== Step 2: Locations =====
function Step2Locations({
  form,
  update,
}: {
  form: JobOrderForm;
  update: <K extends keyof JobOrderForm>(k: K, v: JobOrderForm[K]) => void;
}) {
  const gstinValid = form.gstin.trim() === "" || isValidGstin(form.gstin);
  return (
    <StepShell
      icon={<MapPin className="h-4 w-4" />}
      title="Locations"
      subtitle="Source, route, destination, GSTIN and order classification."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Source" required>
          <SavageInput
            category="city"
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px]"
          />
        </FieldGroup>
        <FieldGroup label="Destination" required>
          <SavageInput
            category="city"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px]"
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="Via Points" hint="Comma-separated intermediate cities">
            <SavageInput
              category="remarks"
              value={form.viaPoints}
              onChange={(e) => update("viaPoints", e.target.value)}
              className="h-8 rounded-[5px] border-border bg-background text-[13px]"
            />
          </FieldGroup>
        </div>
        <FieldGroup label="Port / Border">
          <SavageInput
            category="city"
            value={form.port}
            onChange={(e) => update("port", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px]"
          />
        </FieldGroup>
        <FieldGroup label="GSTIN" required hint={gstinValid ? "15-character GSTIN" : "Invalid GSTIN format"}>
          <SavageInput
            category="gst"
            value={form.gstin}
            onChange={(e) => update("gstin", e.target.value.toUpperCase())}
            className={cn(
              "h-8 rounded-[5px] border-border bg-background text-[13px] tabular",
              !gstinValid && "border-foreground",
            )}
            maxLength={15}
          />
        </FieldGroup>
        <FieldGroup label="Order Mode" required>
          <PillChoice options={ORDER_MODES_FULL} value={form.orderMode} onChange={(v) => update("orderMode", v)} columns={4} />
        </FieldGroup>
        <FieldGroup label="Order Type" required>
          <PillChoice options={ORDER_TYPES} value={form.orderType} onChange={(v) => update("orderType", v)} columns={3} />
        </FieldGroup>
        <FieldGroup label="Service Mode" required>
          <PillChoice options={SERVICE_MODES} value={form.serviceMode} onChange={(v) => update("serviceMode", v)} columns={4} />
        </FieldGroup>
        <FieldGroup label="Load Type" required>
          <PillChoice options={LOAD_TYPES} value={form.loadType} onChange={(v) => update("loadType", v)} columns={3} />
        </FieldGroup>
      </div>
    </StepShell>
  );
}

// ===== Step 3: Parties =====
function Step3Parties({
  form,
  update,
  partyOptions,
}: {
  form: JobOrderForm;
  update: <K extends keyof JobOrderForm>(k: K, v: JobOrderForm[K]) => void;
  partyOptions: AutocompleteOption[];
}) {
  return (
    <StepShell
      icon={<Users className="h-4 w-4" />}
      title="Parties"
      subtitle="Consignor, consignee and forwarder - autocomplete from customers + vendors."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Consignor" required>
          <Autocomplete
            value={form.consignor}
            onChange={(v) => update("consignor", v)}
            options={partyOptions}
            placeholder="Search party…"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Consignee" required>
          <Autocomplete
            value={form.consignee}
            onChange={(v) => update("consignee", v)}
            options={partyOptions}
            placeholder="Search party…"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Forwarder">
          <Autocomplete
            value={form.forwarder}
            onChange={(v) => update("forwarder", v)}
            options={partyOptions}
            placeholder="Search party…"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Billing Party">
          <Autocomplete
            value={form.billingParty}
            onChange={(v) => update("billingParty", v)}
            options={partyOptions}
            placeholder="Defaults to customer"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/20 px-3 py-2">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          Autocomplete pulls from <span className="font-medium text-foreground">{CUSTOMERS.length} customers</span> and{" "}
          <span className="font-medium text-foreground">{VENDORS.length} vendors</span> in your master.
        </span>
      </div>
    </StepShell>
  );
}

// ===== Step 4: Cargo & Rate =====
function Step4Cargo({
  form,
  update,
  computedFreight,
  freightOverride,
  setFreightOverride,
  freight,
}: {
  form: JobOrderForm;
  update: <K extends keyof JobOrderForm>(k: K, v: JobOrderForm[K]) => void;
  computedFreight: number;
  freightOverride: string;
  setFreightOverride: (v: string) => void;
  freight: number;
}) {
  const overrideActive = freightOverride !== "";
  return (
    <StepShell
      icon={<Package className="h-4 w-4" />}
      title="Cargo & Rate"
      subtitle="Weights, packages, rate type and freight (auto = rate × qty, editable)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Packages / Units">
          <SavageInput
            category="amount"
            type="number"
            value={form.packages}
            onChange={(e) => update("packages", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Net Weight (kg)">
          <SavageInput
            category="amount"
            type="number"
            value={form.netWeight}
            onChange={(e) => update("netWeight", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Tare Weight (kg)">
          <SavageInput
            category="amount"
            type="number"
            value={form.tareWeight}
            onChange={(e) => update("tareWeight", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Container Weight (kg)">
          <SavageInput
            category="amount"
            type="number"
            value={form.containerWeight}
            onChange={(e) => update("containerWeight", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Gross Weight (kg)" required>
          <SavageInput
            category="amount"
            type="number"
            value={form.grossWeight}
            onChange={(e) => update("grossWeight", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Number of Vehicles">
          <SavageInput
            category="amount"
            type="number"
            value={form.numberOfVehicles}
            onChange={(e) => update("numberOfVehicles", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Rate Calculation Type" required>
          <PillChoice options={RATE_CALC_TYPES} value={form.rateCalcType} onChange={(v) => update("rateCalcType", v)} columns={4} />
        </FieldGroup>
        <FieldGroup label={`Rate (₹) ${form.rateCalcType === "Per Km" ? "· per km" : form.rateCalcType === "Per Tonne" ? "· per tonne" : form.rateCalcType === "Per Package" ? "· per package" : "· per trip"}`} required>
          <SavageInput
            category="amount"
            type="number"
            value={form.rate}
            onChange={(e) => update("rate", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="Freight (₹)" hint={overrideActive ? "Manual override active" : "Auto = rate × qty"}>
            <SavageInput
              category="amount"
              type="number"
              value={overrideActive ? freightOverride : String(computedFreight)}
              onChange={(e) => setFreightOverride(e.target.value)}
              className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
              placeholder=""
            />
          </FieldGroup>
          {overrideActive && (
            <button
              onClick={() => setFreightOverride("")}
              className="mt-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Reset to auto ({formatINR(computedFreight)})
            </button>
          )}
        </div>
        <div className="sm:col-span-2">
          <FieldGroup label="Remarks">
            <SavageTextarea
              category="remarks"
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              className="min-h-[70px] rounded-[5px] border-border bg-background text-[13px]"
            />
          </FieldGroup>
        </div>
      </div>

      {/* Auto-calc summary */}
      <div className="mt-5 rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Auto-computed freight
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Calc type</span>
            <span className="font-medium">{form.rateCalcType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicles</span>
            <span className="tabular font-medium">{form.numberOfVehicles || "1"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="tabular font-medium">{formatINR(Number(form.rate) || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Computed</span>
            <span className="tabular font-medium">{formatINR(computedFreight)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-medium">Final freight</span>
            <span className="tabular font-medium">{formatINR(freight)}</span>
          </div>
        </div>
      </div>
    </StepShell>
  );
}

// ===== Step 5: Review =====
function Step5Review({
  form,
  freight,
  stepErrors,
}: {
  form: JobOrderForm;
  freight: number;
  stepErrors: Record<number, string[]>;
}) {
  const totalErrors = Object.values(stepErrors).flat().length;
  const passed = totalErrors === 0;

  const sections = [
    {
      title: "Customer & Dates",
      icon: <Calendar className="h-3.5 w-3.5" />,
      rows: [
        ["Customer", form.customer || "-"],
        ["Order Number", form.orderNumber || "-"],
        ["Date", form.date || "-"],
        ["Expected", form.expectedDate || "-"],
        ["Order Date", form.orderDate || "-"],
        ["Branch", form.assignedBranch || "-"],
        ["Marketing", form.marketingPerson || "-"],
      ],
    },
    {
      title: "Locations",
      icon: <MapPin className="h-3.5 w-3.5" />,
      rows: [
        ["Source", form.source || "-"],
        ["Destination", form.destination || "-"],
        ["Via", form.viaPoints || "-"],
        ["Port", form.port || "-"],
        ["GSTIN", form.gstin || "-"],
        ["Order Mode", form.orderMode],
        ["Order Type", form.orderType],
        ["Service Mode", form.serviceMode],
        ["Load Type", form.loadType],
      ],
    },
    {
      title: "Parties",
      icon: <Users className="h-3.5 w-3.5" />,
      rows: [
        ["Consignor", form.consignor || "-"],
        ["Consignee", form.consignee || "-"],
        ["Forwarder", form.forwarder || "-"],
        ["Billing Party", form.billingParty || form.customer || "-"],
      ],
    },
    {
      title: "Cargo & Rate",
      icon: <Banknote className="h-3.5 w-3.5" />,
      rows: [
        ["Packages", form.packages || "-"],
        ["Net Weight", form.netWeight ? `${form.netWeight} kg` : "-"],
        ["Gross Weight", form.grossWeight ? `${form.grossWeight} kg` : "-"],
        ["Vehicles", form.numberOfVehicles || "1"],
        ["Rate Type", form.rateCalcType],
        ["Rate", form.rate ? formatINR(Number(form.rate)) : "-"],
        ["Freight", formatINR(freight)],
      ],
    },
  ];

  return (
    <StepShell
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Review & Create"
      subtitle="Verify all details, run compliance, and create the job order."
    >
      {/* Compliance strip */}
      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-[6px] border p-4",
          passed ? "border-border bg-card" : "border-foreground bg-accent/40",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border",
            passed ? "border-border" : "border-foreground",
          )}
        >
          {passed ? (
            <Check className="h-4 w-4 text-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium">
              {passed ? "Compliance passed" : `${totalErrors} compliance issue${totalErrors === 1 ? "" : "s"}`}
            </span>
            <StatusBadge variant={passed ? "outline" : "solid"} pulse={!passed}>
              {passed ? "Ready" : "Blocked"}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {passed
              ? "All required fields validated · GSTIN format ok · Freight computed."
              : "Resolve the outstanding issues on prior steps before creating this job order."}
          </p>
        </div>
      </div>

      {/* Summary sections */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title} className="rounded-[6px] border border-border bg-card px-4 py-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {sec.icon}
              {sec.title}
            </h4>
            <div className="space-y-1">
              {sec.rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="truncate text-right text-foreground tabular">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/20 px-3 py-2">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          Creating this job order will trigger eWay Bill generation via the NIC portal and open the Trip Planning flow.
        </span>
      </div>
    </StepShell>
  );
}

// ===== Step Shell =====
function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-medium tracking-tight">{title}</h2>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// Unused exports kept for backwards-compat with callers that may import them
export { VEHICLES, DRIVERS };
