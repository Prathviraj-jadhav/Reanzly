"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput } from "@/components/shared/savage-input";
import { Autocomplete, type AutocompleteOption } from "@/components/shared/autocomplete";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Truck,
  User,
  Banknote,
  ShieldCheck,
  AlertCircle,
  Snowflake,
  Thermometer,
  CreditCard,
  Plus,
  Trash2,
  Gauge,
  Route as RouteIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TRIP_PLAN_STEPS,
  EMPTY_TRIP_PLAN,
  TRIP_TYPES,
  EXPENSE_TYPES,
  PAYMENT_MODES,
  formatINR,
  type TripPlanForm,
  type RouteSegment,
  type ExpenseRow,
  type FuelRow,
} from "./_helpers";

interface TripPlanningDrawerProps {
  open: boolean;
  onClose: () => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TripPlanningDrawer({ open, onClose }: TripPlanningDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TripPlanForm>(EMPTY_TRIP_PLAN);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
      fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
    ]).then(([veh, drv, trp]) => {
      setVehicles(veh.vehicles ?? []);
      setDrivers(drv.drivers ?? []);
      setTrips(trp.trips ?? []);
    });
  }, []);

  const update = <K extends keyof TripPlanForm>(k: K, v: TripPlanForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Vehicle autocomplete options =====
  const vehicleOptions: AutocompleteOption[] = useMemo(
    () => vehicles.map((v) => ({ value: v.licensePlate, label: v.licensePlate, hint: `${v.make} ${v.model} · ${v.type}` })),
    [vehicles],
  );

  const driverOptions: AutocompleteOption[] = useMemo(
    () => drivers.filter((d) => d.role === "Driver" || d.role === "driver").map((d) => ({ value: d.name, label: d.name, hint: `${d.city || ''} · ★ ${(d.rating || 0).toFixed(1)}` })),
    [drivers],
  );

  const tripOptions: AutocompleteOption[] = useMemo(
    () => trips.filter((t) => t.status === "Active" || t.status === "In Transit" || t.status === "Planned").map((t) => ({ value: t.tripId, label: t.tripId, hint: `${t.origin} → ${t.destination}` })),
    [trips],
  );

  // ===== Validation per step =====
  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    // Step 1 - Vehicle & Route
    const s1: string[] = [];
    if (!form.vehicle.trim()) s1.push("Vehicle is required");
    if (!form.source.trim()) s1.push("Source is required");
    if (!form.destination.trim()) s1.push("Destination is required");
    if (!form.currentOdo.trim() || Number(form.currentOdo) <= 0) s1.push("Current odometer must be greater than 0");
    if (s1.length) errors[1] = s1;
    // Step 2 - Drivers & Cards
    const s2: string[] = [];
    if (!form.firstDriver.trim()) s2.push("First driver is required");
    if (s2.length) errors[2] = s2;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === TRIP_PLAN_STEPS.length;
  const canAdvance = currentErrors.length === 0;

  // ===== Costing totals =====
  const movementTotal = useMemo(
    () => form.movements.reduce((s, m) => s + (Number(m.hire) || 0), 0),
    [form.movements],
  );
  const expenseTotal = useMemo(
    () => form.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [form.expenses],
  );
  const tollTotal = useMemo(
    () => form.tolls.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [form.tolls],
  );
  const fuelTotal = useMemo(
    () => form.fuel.reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [form.fuel],
  );
  const totalKm = useMemo(
    () => form.movements.reduce((s, m) => s + (Number(m.km) || 0), 0),
    [form.movements],
  );
  const totalCost = movementTotal + expenseTotal + tollTotal + fuelTotal + (Number(form.driverAdvance) || 0);

  // ===== Row mutators =====
  const updateMovement = (id: string, k: keyof RouteSegment, v: string) =>
    setForm((s) => ({ ...s, movements: s.movements.map((m) => (m.id === id ? { ...m, [k]: v } : m)) }));
  const addMovement = () =>
    setForm((s) => ({ ...s, movements: [...s.movements, { id: uid("m"), from: "", to: "", km: "", hire: "" }] }));
  const removeMovement = (id: string) =>
    setForm((s) => ({ ...s, movements: s.movements.filter((m) => m.id !== id) }));

  const addExpense = (kind: "expenses" | "tolls") =>
    setForm((s) => ({ ...s, [kind]: [...s[kind], { id: uid("e"), type: "", amount: "", note: "" }] }));
  const updateExpense = (kind: "expenses" | "tolls", id: string, k: keyof ExpenseRow, v: string) =>
    setForm((s) => ({ ...s, [kind]: s[kind].map((e) => (e.id === id ? { ...e, [k]: v } : e)) }));
  const removeExpense = (kind: "expenses" | "tolls", id: string) =>
    setForm((s) => ({ ...s, [kind]: s[kind].filter((e) => e.id !== id) }));

  const addFuel = () =>
    setForm((s) => ({ ...s, fuel: [...s.fuel, { id: uid("f"), liters: "", rate: "", amount: "" }] }));
  const updateFuel = (id: string, k: "liters" | "rate" | "amount", v: string) => {
    setForm((s) => ({
      ...s,
      fuel: s.fuel.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, [k]: v };
        // Auto-calc amount = liters × rate when both present
        const lit = Number(next.liters) || 0;
        const rate = Number(next.rate) || 0;
        next.amount = lit && rate ? String(Math.round(lit * rate)) : next.amount;
        return next;
      }),
    }));
  };
  const removeFuel = (id: string) =>
    setForm((s) => ({ ...s, fuel: s.fuel.filter((f) => f.id !== id) }));

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", { description: currentErrors[0] || "Resolve errors on this step" });
      return;
    }
    if (step < TRIP_PLAN_STEPS.length) setStep(step + 1);
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

  const handleSubmit = () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    toast.success("Trip planned & assigned", {
      description: `${form.vehicle} · ${form.firstDriver} · ${form.source} → ${form.destination} · ${formatINR(totalCost)}`,
    });
    setStep(1);
    setForm(EMPTY_TRIP_PLAN);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Plan Trip
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Four steps · vehicle, drivers, costing and review
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
            {TRIP_PLAN_STEPS.map((s, i) => {
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
                  {i < TRIP_PLAN_STEPS.length - 1 && (
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
          {step === 1 && (
            <Step1Vehicle form={form} update={update} vehicleOptions={vehicleOptions} tripOptions={tripOptions} />
          )}
          {step === 2 && (
            <Step2Drivers form={form} update={update} driverOptions={driverOptions} />
          )}
          {step === 3 && (
            <Step3Costing
              form={form}
              updateMovement={updateMovement}
              addMovement={addMovement}
              removeMovement={removeMovement}
              addExpense={addExpense}
              updateExpense={updateExpense}
              removeExpense={removeExpense}
              addFuel={addFuel}
              updateFuel={updateFuel}
              removeFuel={removeFuel}
              update={update}
              movementTotal={movementTotal}
              expenseTotal={expenseTotal}
              tollTotal={tollTotal}
              fuelTotal={fuelTotal}
              totalKm={totalKm}
            />
          )}
          {step === 4 && (
            <Step4Review
              form={form}
              stepErrors={stepErrors}
              movementTotal={movementTotal}
              expenseTotal={expenseTotal}
              tollTotal={tollTotal}
              fuelTotal={fuelTotal}
              totalKm={totalKm}
              totalCost={totalCost}
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
            Step {step} of {TRIP_PLAN_STEPS.length}
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
            >
              Create & Assign
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
}: {
  options: readonly T[];
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-[5px] border border-border p-0.5">
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

// ===== Step 1: Vehicle & Route =====
function Step1Vehicle({
  form,
  update,
  vehicleOptions,
  tripOptions,
}: {
  form: TripPlanForm;
  update: <K extends keyof TripPlanForm>(k: K, v: TripPlanForm[K]) => void;
  vehicleOptions: AutocompleteOption[];
  tripOptions: AutocompleteOption[];
}) {
  const selectedVeh = VEHICLES.find((v) => v.licensePlate === form.vehicle);
  return (
    <StepShell
      icon={<Truck className="h-4 w-4" />}
      title="Vehicle & Route"
      subtitle="Pick the vehicle, route type and connected trip."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldGroup label="Vehicle Name" required hint={selectedVeh ? `${selectedVeh.make} ${selectedVeh.model} · ${selectedVeh.type}` : "Search by license plate"}>
            <Autocomplete
              value={form.vehicle}
              onChange={(v) => update("vehicle", v)}
              options={vehicleOptions}
              placeholder="Search vehicle…"
              emptyText="No vehicle found"
              className="h-8"
              restrictToList
            />
          </FieldGroup>
        </div>

        {/* Refrigeration status */}
        <FieldGroup label="Refrigeration Status">
          <div className="grid grid-cols-2 gap-1 rounded-[5px] border border-border p-0.5">
            <button
              type="button"
              onClick={() => update("reefer", true)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
                form.reefer ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Snowflake className="h-3.5 w-3.5" />
              Reefer
            </button>
            <button
              type="button"
              onClick={() => update("reefer", false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
                !form.reefer ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Thermometer className="h-3.5 w-3.5" />
              Non-Reefer
            </button>
          </div>
        </FieldGroup>
        <FieldGroup label="Current Odometer (km)" required>
          <SavageInput
            category="amount"
            type="number"
            value={form.currentOdo}
            onChange={(e) => update("currentOdo", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Previous Odometer (km)" hint="Auto from last trip · editable">
          <SavageInput
            category="amount"
            type="number"
            value={form.previousOdo}
            onChange={(e) => update("previousOdo", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Previous Balance (₹)" hint="Auto from ledger · editable">
          <SavageInput
            category="amount"
            type="number"
            value={form.previousBalance}
            onChange={(e) => update("previousBalance", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>

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
        <FieldGroup label="Trip Type">
          <PillChoice options={TRIP_TYPES} value={form.tripType} onChange={(v) => update("tripType", v)} />
        </FieldGroup>
        <FieldGroup label="Connected Trip" hint="Optional link to a chain">
          <Autocomplete
            value={form.connectedTrip}
            onChange={(v) => update("connectedTrip", v)}
            options={tripOptions}
            placeholder="None"
            emptyText="No active trip found"
            className="h-8"
            restrictToList
          />
        </FieldGroup>
      </div>

      {selectedVeh && (
        <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/20 px-3 py-2">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">
            Selected vehicle: <span className="font-medium text-foreground">{selectedVeh.name}</span> ·{" "}
            current meter <span className="tabular font-medium text-foreground">{selectedVeh.currentMeter.toLocaleString("en-IN")}</span> km ·{" "}
            status <span className="font-medium text-foreground">{selectedVeh.status}</span>
          </span>
        </div>
      )}
    </StepShell>
  );
}

// ===== Step 2: Drivers & Cards =====
function Step2Drivers({
  form,
  update,
  driverOptions,
}: {
  form: TripPlanForm;
  update: <K extends keyof TripPlanForm>(k: K, v: TripPlanForm[K]) => void;
  driverOptions: AutocompleteOption[];
}) {
  return (
    <StepShell
      icon={<User className="h-4 w-4" />}
      title="Drivers & Cards"
      subtitle="Primary + secondary driver, fuel & toll cards with balances."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="First Driver" required>
          <Autocomplete
            value={form.firstDriver}
            onChange={(v) => update("firstDriver", v)}
            options={driverOptions}
            placeholder="Search driver…"
            emptyText="No driver found"
            className="h-8"
            restrictToList
          />
        </FieldGroup>
        <FieldGroup label="Second Driver" hint="Optional · for long-haul">
          <Autocomplete
            value={form.secondDriver}
            onChange={(v) => update("secondDriver", v)}
            options={driverOptions}
            placeholder="Search driver…"
            emptyText="No driver found"
            className="h-8"
            restrictToList
          />
        </FieldGroup>
        <FieldGroup label="Prepaid Card" hint="Card number / ID">
          <SavageInput
            category="consignmentNumber"
            value={form.prepaidCard}
            onChange={(e) => update("prepaidCard", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
          />
        </FieldGroup>
        <FieldGroup label="Petrol Card" hint="Card number / ID">
          <SavageInput
            category="consignmentNumber"
            value={form.petrolCard}
            onChange={(e) => update("petrolCard", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
          />
        </FieldGroup>
        <FieldGroup label="FASTag" hint="Tag ID">
          <SavageInput
            category="vehicleNumber"
            value={form.fastag}
            onChange={(e) => update("fastag", e.target.value.toUpperCase())}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
          />
        </FieldGroup>
        <FieldGroup label="Balance Amount (₹)" hint="Available across cards">
          <SavageInput
            category="amount"
            type="number"
            value={form.balanceAmount}
            onChange={(e) => update("balanceAmount", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/20 px-3 py-2">
        <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          Card balances are pulled from the driver&apos;s active wallet. Verify before dispatch.
        </span>
      </div>
    </StepShell>
  );
}

// ===== Step 3: Costing Breakdown =====
function Step3Costing({
  form,
  updateMovement,
  addMovement,
  removeMovement,
  addExpense,
  updateExpense,
  removeExpense,
  addFuel,
  updateFuel,
  removeFuel,
  update,
  movementTotal,
  expenseTotal,
  tollTotal,
  fuelTotal,
  totalKm,
}: {
  form: TripPlanForm;
  updateMovement: (id: string, k: keyof RouteSegment, v: string) => void;
  addMovement: () => void;
  removeMovement: (id: string) => void;
  addExpense: (kind: "expenses" | "tolls") => void;
  updateExpense: (kind: "expenses" | "tolls", id: string, k: keyof ExpenseRow, v: string) => void;
  removeExpense: (kind: "expenses" | "tolls", id: string) => void;
  addFuel: () => void;
  updateFuel: (id: string, k: "liters" | "rate" | "amount", v: string) => void;
  removeFuel: (id: string) => void;
  update: <K extends keyof TripPlanForm>(k: K, v: TripPlanForm[K]) => void;
  movementTotal: number;
  expenseTotal: number;
  tollTotal: number;
  fuelTotal: number;
  totalKm: number;
}) {
  return (
    <StepShell
      icon={<Banknote className="h-4 w-4" />}
      title="Costing Breakdown"
      subtitle="Movements, additional expenses, tolls, fuel and driver recovery."
    >
      <Tabs defaultValue="movement">
        <TabsList className="h-8 rounded-[5px] bg-muted p-0.5">
          <TabsTrigger value="movement" className="h-7 rounded-[4px] text-[12px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">Movement</TabsTrigger>
          <TabsTrigger value="expense" className="h-7 rounded-[4px] text-[12px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">Expenses</TabsTrigger>
          <TabsTrigger value="toll" className="h-7 rounded-[4px] text-[12px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">Tolls</TabsTrigger>
          <TabsTrigger value="fuel" className="h-7 rounded-[4px] text-[12px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">Fuel</TabsTrigger>
          <TabsTrigger value="recovery" className="h-7 rounded-[4px] text-[12px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">Driver Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="movement" className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Movement Details</h4>
            <Btn size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={addMovement}>Add Segment</Btn>
          </div>
          <div className="mt-3 space-y-2">
            {form.movements.map((m) => (
              <div key={m.id} className="grid grid-cols-1 gap-2 rounded-[5px] border border-border bg-background p-2 sm:grid-cols-[1fr_1fr_80px_120px_28px]">
                <input
                  value={m.from}
                  onChange={(e) => updateMovement(m.id, "from", e.target.value)}
                  placeholder="From"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <input
                  value={m.to}
                  onChange={(e) => updateMovement(m.id, "to", e.target.value)}
                  placeholder="To"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <input
                  value={m.km}
                  onChange={(e) => updateMovement(m.id, "km", e.target.value)}
                  type="number"
                  placeholder="km"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <input
                  value={m.hire}
                  onChange={(e) => updateMovement(m.id, "hire", e.target.value)}
                  type="number"
                  placeholder="Hire ₹"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <button
                  onClick={() => removeMovement(m.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Remove segment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {form.movements.length === 0 && (
              <p className="text-[12px] text-muted-foreground py-3">No movement segments. Add one to start.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Total km · Hire</span>
            <span className="tabular font-medium">{totalKm.toLocaleString("en-IN")} km · {formatINR(movementTotal)}</span>
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Additional Expenses</h4>
            <Btn size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={() => addExpense("expenses")}>Add Expense</Btn>
          </div>
          <div className="mt-3 space-y-2">
            {form.expenses.map((e) => (
              <ExpenseRowEditor key={e.id} row={e} onChange={(k, v) => updateExpense("expenses", e.id, k, v)} onRemove={() => removeExpense("expenses", e.id)} />
            ))}
            {form.expenses.length === 0 && (
              <p className="text-[12px] text-muted-foreground py-3">No expenses logged.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="tabular font-medium">{formatINR(expenseTotal)}</span>
          </div>
        </TabsContent>

        <TabsContent value="toll" className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Toll Charges</h4>
            <Btn size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={() => addExpense("tolls")}>Add Toll</Btn>
          </div>
          <div className="mt-3 space-y-2">
            {form.tolls.map((e) => (
              <ExpenseRowEditor key={e.id} row={e} onChange={(k, v) => updateExpense("tolls", e.id, k, v)} onRemove={() => removeExpense("tolls", e.id)} />
            ))}
            {form.tolls.length === 0 && (
              <p className="text-[12px] text-muted-foreground py-3">No tolls logged.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Total Tolls</span>
            <span className="tabular font-medium">{formatINR(tollTotal)}</span>
          </div>
        </TabsContent>

        <TabsContent value="fuel" className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Fuel Entries</h4>
            <Btn size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={addFuel}>Add Fuel</Btn>
          </div>
          <div className="mt-3 space-y-2">
            {form.fuel.map((f) => (
              <div key={f.id} className="grid grid-cols-1 gap-2 rounded-[5px] border border-border bg-background p-2 sm:grid-cols-[100px_100px_120px_28px]">
                <input
                  value={f.liters}
                  onChange={(e) => updateFuel(f.id, "liters", e.target.value)}
                  type="number"
                  placeholder="Liters"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <input
                  value={f.rate}
                  onChange={(e) => updateFuel(f.id, "rate", e.target.value)}
                  type="number"
                  placeholder="Rate ₹/L"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <input
                  value={f.amount}
                  onChange={(e) => updateFuel(f.id, "amount", e.target.value)}
                  type="number"
                  placeholder="Amount ₹"
                  className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
                />
                <button
                  onClick={() => removeFuel(f.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Remove fuel entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {form.fuel.length === 0 && (
              <p className="text-[12px] text-muted-foreground py-3">No fuel entries. Amount auto-calculates from liters × rate.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Total Fuel</span>
            <span className="tabular font-medium">{formatINR(fuelTotal)}</span>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="mt-4">
          <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Driver Recovery</h4>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Advance Given (₹)">
              <SavageInput
                category="amount"
                type="number"
                value={form.driverAdvance}
                onChange={(e) => update("driverAdvance", e.target.value)}
                className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
                placeholder=""
              />
            </FieldGroup>
            <FieldGroup label="Advance Mode">
              <Select value={form.driverAdvanceMode} onValueChange={(v) => update("driverAdvanceMode", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-[13px]">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
        </TabsContent>
      </Tabs>
    </StepShell>
  );
}

function ExpenseRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: ExpenseRow;
  onChange: (k: keyof ExpenseRow, v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-[5px] border border-border bg-background p-2 sm:grid-cols-[160px_120px_1fr_28px]">
      <Select value={row.type} onValueChange={(v) => onChange("type", v)}>
        <SelectTrigger className="h-7 w-full rounded-[4px] border-border bg-background text-[12px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {EXPENSE_TYPES.map((t) => (
            <SelectItem key={t} value={t} className="text-[12px]">{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        value={row.amount}
        onChange={(e) => onChange("amount", e.target.value)}
        type="number"
        placeholder="Amount ₹"
        className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
      />
      <input
        value={row.note}
        onChange={(e) => onChange("note", e.target.value)}
        placeholder="Note"
        className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px]"
      />
      <button
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Remove expense"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ===== Step 4: Review =====
function Step4Review({
  form,
  stepErrors,
  movementTotal,
  expenseTotal,
  tollTotal,
  fuelTotal,
  totalKm,
  totalCost,
}: {
  form: TripPlanForm;
  stepErrors: Record<number, string[]>;
  movementTotal: number;
  expenseTotal: number;
  tollTotal: number;
  fuelTotal: number;
  totalKm: number;
  totalCost: number;
}) {
  const totalErrors = Object.values(stepErrors).flat().length;
  const passed = totalErrors === 0;

  const sections = [
    {
      title: "Vehicle & Route",
      icon: <Truck className="h-3.5 w-3.5" />,
      rows: [
        ["Vehicle", form.vehicle || "-"],
        ["Refrigeration", form.reefer ? "Reefer" : "Non-Reefer"],
        ["Current Odo", form.currentOdo ? `${Number(form.currentOdo).toLocaleString("en-IN")} km` : "-"],
        ["Previous Odo", form.previousOdo ? `${Number(form.previousOdo).toLocaleString("en-IN")} km` : "-"],
        ["Previous Balance", form.previousBalance ? formatINR(Number(form.previousBalance)) : "-"],
        ["Source", form.source || "-"],
        ["Destination", form.destination || "-"],
        ["Via", form.viaPoints || "-"],
        ["Trip Type", form.tripType],
        ["Connected Trip", form.connectedTrip || "-"],
      ],
    },
    {
      title: "Drivers & Cards",
      icon: <User className="h-3.5 w-3.5" />,
      rows: [
        ["First Driver", form.firstDriver || "-"],
        ["Second Driver", form.secondDriver || "-"],
        ["Prepaid Card", form.prepaidCard || "-"],
        ["Petrol Card", form.petrolCard || "-"],
        ["FASTag", form.fastag || "-"],
        ["Balance", form.balanceAmount ? formatINR(Number(form.balanceAmount)) : "-"],
      ],
    },
    {
      title: "Costing",
      icon: <Banknote className="h-3.5 w-3.5" />,
      rows: [
        ["Total km", `${totalKm.toLocaleString("en-IN")} km`],
        ["Movement Hire", formatINR(movementTotal)],
        ["Additional Expenses", formatINR(expenseTotal)],
        ["Tolls", formatINR(tollTotal)],
        ["Fuel", formatINR(fuelTotal)],
        ["Driver Advance", formatINR(Number(form.driverAdvance) || 0)],
        ["Total Cost", formatINR(totalCost)],
      ],
    },
  ];

  return (
    <StepShell
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Review & Assign"
      subtitle="Verify all details and assign the trip."
    >
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
              {passed ? "Ready to assign" : `${totalErrors} compliance issue${totalErrors === 1 ? "" : "s"}`}
            </span>
            <StatusBadge variant={passed ? "outline" : "solid"} pulse={!passed}>
              {passed ? "Ready" : "Blocked"}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {passed
              ? `Total cost ${formatINR(totalCost)} across ${totalKm.toLocaleString("en-IN")} km. Click Create & Assign to dispatch.`
              : "Resolve the outstanding issues on prior steps before assigning this trip."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

export { RouteIcon };
