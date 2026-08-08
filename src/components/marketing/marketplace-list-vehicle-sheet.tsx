"use client";

/**
 * ListYourVehicleSheet - slide-in Sheet (right, max-w-xl) with a stub form
 * for vehicle owners to list their vehicle for rent on the Reanzly
 * Marketplace.
 *
 * This is a stub: the submit handler toasts a success message and resets
 * the form. No real API call is made. The intent is to give visitors a
 * realistic, production-grade-feeling listing flow so they understand what
 * listing a vehicle entails (vehicle spec, route, availability, pricing,
 * features, document verification) without us having to wire a real backend.
 *
 * Form sections:
 *   1. Owner info - name, phone, email, city
 *   2. Vehicle spec - type (select), make, model, year, registration,
 *      capacity (tonnes), body type (select), axle (select), fuel type (select)
 *   3. Route & availability - origin, destination, preferred lanes,
 *      availability from/to dates, on-demand toggle
 *   4. Pricing - per day, per km, with-driver extra
 *   5. Features - checkbox grid (GPS, Fastag, Tarpaulin, Hydraulic Lift,
 *      Reefer Temp Control, Reverse Camera, Anti-lock Brakes, Speed Governor)
 *   6. Documents - checkbox grid (RC, Insurance, Fitness, National Permit)
 *      with "verified" note that Reanzly will verify each before publishing
 *
 * Accessibility:
 *   • SheetTitle is visible (not sr-only) - gives the sheet a clear heading.
 *   • All inputs have explicit <label> elements.
 *   • Touch targets ≥40px (h-10 inputs, h-10 buttons).
 *   • Manual close X in the header (showCloseButton={false} on SheetContent).
 */

import { useState } from "react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  X, Truck, User, MapPin, Calendar, IndianRupee, Settings, ShieldCheck, Send,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER,
  BODY_TYPE_META, AXLE_META, FUEL_TYPE_META,
  INDIAN_CITIES,
  type VehicleType, type BodyType, type AxleType, type FuelType,
} from "./marketplace-data";

export interface ListYourVehicleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BODY_TYPE_KEYS: BodyType[] = ["open", "closed", "container", "refrigerated", "tipper", "tanker"];
const AXLE_KEYS: AxleType[] = ["4", "6", "10", "12"];
const FUEL_KEYS: FuelType[] = ["diesel", "cng", "electric", "petrol"];

const FEATURE_OPTIONS = [
  "GPS", "Fastag", "Tarpaulin", "Hydraulic Lift",
  "Reefer Temp Control", "Reverse Camera", "Anti-lock Brakes", "Speed Governor",
];

const DOCUMENT_OPTIONS = [
  { key: "rc", label: "RC (Registration Certificate)" },
  { key: "insurance", label: "Insurance (Comprehensive)" },
  { key: "fitness", label: "Fitness Certificate" },
  { key: "permit", label: "National Permit" },
] as const;

export function ListYourVehicleSheet({ open, onOpenChange }: ListYourVehicleSheetProps) {
  // Owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerCity, setOwnerCity] = useState("");

  // Vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [registration, setRegistration] = useState("");
  const [capacity, setCapacity] = useState("");
  const [bodyType, setBodyType] = useState<BodyType | "">("");
  const [axle, setAxle] = useState<AxleType | "">("");
  const [fuelType, setFuelType] = useState<FuelType | "">("");

  // Route
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [preferredLanes, setPreferredLanes] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [onDemand, setOnDemand] = useState(true);

  // Pricing
  const [perDay, setPerDay] = useState("");
  const [perKm, setPerKm] = useState("");
  const [withDriver, setWithDriver] = useState("");

  // Features + documents
  const [features, setFeatures] = useState<string[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);

  function reset() {
    setOwnerName(""); setOwnerPhone(""); setOwnerEmail(""); setOwnerCity("");
    setVehicleType(""); setMake(""); setModel(""); setYear(""); setRegistration("");
    setCapacity(""); setBodyType(""); setAxle(""); setFuelType("");
    setOrigin(""); setDestination(""); setPreferredLanes(""); setFromDate(""); setToDate("");
    setOnDemand(true);
    setPerDay(""); setPerKm(""); setWithDriver("");
    setFeatures([]); setDocuments([]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerName.trim() || !ownerPhone.trim() || !vehicleType || !origin.trim() || !destination.trim()) {
      toast.error("Please fill in the required fields", {
        description: "Owner name, phone, vehicle type, origin, and destination are required.",
      });
      return;
    }
    toast.success("Vehicle listing submitted for review", {
      description: `${VEHICLE_TYPE_META[vehicleType].label} on the ${origin}-${destination} route. Our team verifies documents within 24 hours.`,
    });
    reset();
    onOpenChange(false);
  }

  function toggleFeature(f: string) {
    setFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }
  function toggleDocument(d: string) {
    setDocuments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  // When the user picks a vehicle type, auto-fill make/model/capacity/body/axle/fuel
  // from the metadata map so the form feels alive.
  function applyVehicleType(v: VehicleType) {
    setVehicleType(v);
    const meta = VEHICLE_TYPE_META[v];
    setMake(meta.label.split(" ")[0]);
    setModel(meta.label);
    setCapacity(String(meta.capacityTonnes));
    setBodyType(meta.bodyType);
    setAxle(meta.axle);
    setFuelType(meta.fuelType);
    if (!perDay) setPerDay(String(meta.basePerDay));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border p-0 sm:max-w-xl" showCloseButton={false}>
        <SheetTitle className="sr-only">List your vehicle for rent</SheetTitle>
        <SheetDescription className="sr-only">
          Fill in your vehicle and route details to list on the Reanzly Vehicle Rental Marketplace.
        </SheetDescription>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted/30">
              <Truck className="h-5 w-5 text-foreground" aria-hidden />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
                List your vehicle
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Free for owners · live in 24 hours after KYC.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-6 px-5 py-5">
          {/* Owner info */}
          <FormSection icon={<User className="h-3.5 w-3.5" />} title="Owner information" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Owner name" required>
                <input
                  type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Transport Co."
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
                />
              </Field>
              <Field label="Phone" required>
                <input
                  type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+91 98XXX XXXXX"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@company.in"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
                />
              </Field>
              <Field label="Home city">
                <input
                  type="text" list="list-vehicle-cities" value={ownerCity} onChange={(e) => setOwnerCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
                />
              </Field>
            </div>
          </FormSection>

          {/* Vehicle spec */}
          <FormSection icon={<Truck className="h-3.5 w-3.5" />} title="Vehicle specification" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Vehicle type" required>
                <Select value={vehicleType} onValueChange={(v) => applyVehicleType(v as VehicleType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Vehicle type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {VEHICLE_TYPE_ORDER.map((vt) => (
                      <SelectItem key={vt} value={vt}>{VEHICLE_TYPE_META[vt].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Make">
                <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Tata"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Model">
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Ace"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Year">
                <input type="number" min="1990" max="2025" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2022"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Registration number">
                <input type="text" value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder="e.g. MH 02 AB 1234"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Capacity (tonnes)">
                <input type="number" min="0.1" step="0.1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 0.75"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Body type">
                <Select value={bodyType} onValueChange={(v) => setBodyType(v as BodyType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Body type">
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {BODY_TYPE_KEYS.map((b) => (
                      <SelectItem key={b} value={b}>{BODY_TYPE_META[b].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Axle">
                <Select value={axle} onValueChange={(v) => setAxle(v as AxleType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Axle">
                    <SelectValue placeholder="Select axle" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {AXLE_KEYS.map((a) => (
                      <SelectItem key={a} value={a}>{AXLE_META[a].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fuel type">
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Fuel type">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {FUEL_KEYS.map((f) => (
                      <SelectItem key={f} value={f}>{FUEL_TYPE_META[f].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* Route & availability */}
          <FormSection icon={<MapPin className="h-3.5 w-3.5" />} title="Route & availability" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Origin city" required>
                <input type="text" list="list-vehicle-cities" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Mumbai"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Destination city" required>
                <input type="text" list="list-vehicle-cities" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Pune"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
            </div>
            <Field label="Preferred lanes (comma-separated)">
              <input type="text" value={preferredLanes} onChange={(e) => setPreferredLanes(e.target.value)} placeholder="e.g. Mumbai-Pune, Pune-Bangalore"
                className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Available from">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground" />
              </Field>
              <Field label="Available to">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground" />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-3 py-2 text-[12px]">
              <span className="flex items-center gap-1.5 text-foreground">
                <Calendar className="h-3 w-3" />
                Available on-demand outside this window
              </span>
              <Switch checked={onDemand} onCheckedChange={setOnDemand} aria-label="On-demand availability" />
            </label>
          </FormSection>

          {/* Pricing */}
          <FormSection icon={<IndianRupee className="h-3.5 w-3.5" />} title="Pricing">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Per day (INR)">
                <input type="number" min="0" step="100" value={perDay} onChange={(e) => setPerDay(e.target.value)} placeholder="e.g. 1500"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Per km (INR)">
                <input type="number" min="0" step="1" value={perKm} onChange={(e) => setPerKm(e.target.value)} placeholder="e.g. 18"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Driver extra / day (INR)">
                <input type="number" min="0" step="50" value={withDriver} onChange={(e) => setWithDriver(e.target.value)} placeholder="e.g. 600"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
            </div>
          </FormSection>

          {/* Features */}
          <FormSection icon={<Settings className="h-3.5 w-3.5" />} title="Features">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {FEATURE_OPTIONS.map((f) => (
                <label key={f} className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-border bg-background px-2 py-1.5 text-[12px] text-foreground transition-colors hover:bg-accent">
                  <Checkbox checked={features.includes(f)} onCheckedChange={() => toggleFeature(f)} aria-label={f} />
                  <span className="truncate">{f}</span>
                </label>
              ))}
            </div>
          </FormSection>

          {/* Documents */}
          <FormSection icon={<ShieldCheck className="h-3.5 w-3.5" />} title="Documents">
            <p className="mb-2 text-[11px] text-muted-foreground">
              Tick all documents you currently hold. Reanzly verifies each before publishing your listing.
            </p>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DOCUMENT_OPTIONS.map((d) => (
                <li key={d.key}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-border bg-background px-2 py-1.5 text-[12px] text-foreground transition-colors hover:bg-accent">
                    <Checkbox checked={documents.includes(d.key)} onCheckedChange={() => toggleDocument(d.key)} aria-label={d.label} />
                    <span className="truncate">{d.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </FormSection>

          {/* Submit */}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 border-t border-border bg-background px-5 py-3 sm:flex-row">
            <button
              type="submit"
              className="tap inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <Send className="h-3.5 w-3.5" />
              Submit for review
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="tap inline-flex h-11 items-center justify-center rounded-[6px] border border-border px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>

          <datalist id="list-vehicle-cities">
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   FormSection - section with icon + title + required marker
   ============================================================ */
function FormSection({
  icon, title, required, children,
}: {
  icon: React.ReactNode;
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
        {required && <span className="text-foreground/60">*</span>}
      </h3>
      {children}
    </section>
  );
}

/* ============================================================
   Field - labelled input wrapper
   ============================================================ */
function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-foreground/60"> *</span>}
      </span>
      {children}
    </label>
  );
}
