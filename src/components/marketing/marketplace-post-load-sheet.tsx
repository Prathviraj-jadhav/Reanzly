"use client";

/**
 * PostLoadSheet - slide-in Sheet (right, max-w-xl) with a stub form for
 * shippers to post a load that needs carrying.
 *
 * This is a stub: the submit handler toasts a success message and resets
 * the form. No real API call is made.
 *
 * Form sections:
 *   1. Shipper info - name, phone, email
 *   2. Load origin & destination - origin city, destination city, distance
 *      (auto-suggested based on common lanes), pickup date, delivery date
 *   3. Cargo details - weight (tonnes), vehicle type required (select),
 *      body type required (select), description (textarea)
 *   4. Budget - INR (with hint that owners can bid above/below)
 *
 * Accessibility:
 *   • SheetTitle is visible (not sr-only).
 *   • All inputs have explicit <label> elements.
 *   • Touch targets ≥40px.
 *   • Manual close X in the header (showCloseButton={false} on SheetContent).
 */

import { useState } from "react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  X, Package, User, MapPin, Calendar, Weight, IndianRupee, Send, FileText,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER,
  BODY_TYPE_META,
  INDIAN_CITIES,
  type VehicleType, type BodyType,
} from "./marketplace-data";

export interface PostLoadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BODY_TYPE_KEYS: BodyType[] = ["open", "closed", "container", "refrigerated", "tipper", "tanker"];

// Common lane distances for auto-suggest (kept terse - the user can override).
const LANE_DISTANCES: Record<string, number> = {
  "Mumbai-Pune": 148, "Pune-Mumbai": 148,
  "Mumbai-Ahmedabad": 525, "Ahmedabad-Mumbai": 525,
  "Mumbai-Surat": 285, "Surat-Mumbai": 285,
  "Mumbai-Nagpur": 820, "Nagpur-Mumbai": 820,
  "Delhi-Jaipur": 281, "Jaipur-Delhi": 281,
  "Delhi-Chandigarh": 244, "Chandigarh-Delhi": 244,
  "Delhi-Lucknow": 555, "Lucknow-Delhi": 555,
  "Bangalore-Chennai": 346, "Chennai-Bangalore": 346,
  "Bangalore-Hyderabad": 575, "Hyderabad-Bangalore": 575,
  "Chennai-Hyderabad": 624, "Hyderabad-Chennai": 624,
  "Kolkata-Patna": 583, "Patna-Kolkata": 583,
  "Ahmedabad-Indore": 388, "Indore-Ahmedabad": 388,
  "Indore-Bhopal": 193, "Bhopal-Indore": 193,
};

export function PostLoadSheet({ open, onOpenChange }: PostLoadSheetProps) {
  // Shipper
  const [shipperName, setShipperName] = useState("");
  const [shipperPhone, setShipperPhone] = useState("");
  const [shipperEmail, setShipperEmail] = useState("");

  // Route
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  // Cargo
  const [weight, setWeight] = useState("");
  const [vehicleTypeRequired, setVehicleTypeRequired] = useState<VehicleType | "">("");
  const [bodyTypeRequired, setBodyTypeRequired] = useState<BodyType | "">("");
  const [description, setDescription] = useState("");

  // Budget
  const [budget, setBudget] = useState("");

  function reset() {
    setShipperName(""); setShipperPhone(""); setShipperEmail("");
    setOrigin(""); setDestination(""); setDistance("");
    setPickupDate(""); setDeliveryDate("");
    setWeight(""); setVehicleTypeRequired(""); setBodyTypeRequired(""); setDescription("");
    setBudget("");
  }

  // Auto-suggest distance when origin + destination change
  function autoDistance(o: string, d: string) {
    const key = `${o.trim()}-${d.trim()}`;
    if (LANE_DISTANCES[key]) setDistance(String(LANE_DISTANCES[key]));
  }
  function onOriginChange(v: string) {
    setOrigin(v);
    if (destination) autoDistance(v, destination);
  }
  function onDestinationChange(v: string) {
    setDestination(v);
    if (origin) autoDistance(origin, v);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shipperName.trim() || !shipperPhone.trim() || !origin.trim() || !destination.trim() || !weight.trim()) {
      toast.error("Please fill in the required fields", {
        description: "Shipper name, phone, origin, destination, and weight are required.",
      });
      return;
    }
    toast.success("Load posted", {
      description: `${origin} → ${destination} · ${weight}T${budget ? ` · budget ₹${Number(budget).toLocaleString("en-IN")}` : ""}. Vehicle owners will reach out shortly.`,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border p-0 sm:max-w-xl" showCloseButton={false}>
        <SheetTitle className="sr-only">Post a load for carriers</SheetTitle>
        <SheetDescription className="sr-only">
          Post your load details so vehicle owners across India can apply to carry it.
        </SheetDescription>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted/30">
              <Package className="h-5 w-5 text-foreground" aria-hidden />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
                Post a load
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Receive bids from verified vehicle owners in hours.
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
          {/* Shipper info */}
          <FormSection icon={<User className="h-3.5 w-3.5" />} title="Shipper information" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Shipper name" required>
                <input type="text" value={shipperName} onChange={(e) => setShipperName(e.target.value)} placeholder="e.g. Tata Steel BSL"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Phone" required>
                <input type="tel" value={shipperPhone} onChange={(e) => setShipperPhone(e.target.value)} placeholder="+91 98XXX XXXXX"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Email">
                <input type="email" value={shipperEmail} onChange={(e) => setShipperEmail(e.target.value)} placeholder="logistics@company.in"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
            </div>
          </FormSection>

          {/* Route */}
          <FormSection icon={<MapPin className="h-3.5 w-3.5" />} title="Origin & destination" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Origin city" required>
                <input type="text" list="post-load-cities" value={origin} onChange={(e) => onOriginChange(e.target.value)} placeholder="e.g. Mumbai"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Destination city" required>
                <input type="text" list="post-load-cities" value={destination} onChange={(e) => onDestinationChange(e.target.value)} placeholder="e.g. Pune"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Distance (km)">
                <input type="number" min="1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="auto-filled for common lanes"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Pickup date">
                <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground" />
              </Field>
              <Field label="Delivery date">
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground" />
              </Field>
            </div>
          </FormSection>

          {/* Cargo */}
          <FormSection icon={<Weight className="h-3.5 w-3.5" />} title="Cargo details" required>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Weight (tonnes)" required>
                <input type="number" min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 18"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
              </Field>
              <Field label="Vehicle type required">
                <Select value={vehicleTypeRequired} onValueChange={(v) => setVehicleTypeRequired(v as VehicleType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Vehicle type required">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {VEHICLE_TYPE_ORDER.map((vt) => (
                      <SelectItem key={vt} value={vt}>{VEHICLE_TYPE_META[vt].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Body type required">
                <Select value={bodyTypeRequired} onValueChange={(v) => setBodyTypeRequired(v as BodyType)}>
                  <SelectTrigger className="h-10 w-full rounded-[5px] border-border bg-background text-[13px] text-foreground" aria-label="Body type required">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[5px] border-border">
                    {BODY_TYPE_KEYS.map((b) => (
                      <SelectItem key={b} value={b}>{BODY_TYPE_META[b].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Cargo type, special handling, loading dock availability, hazmat notes…"
                className="focus-ring w-full rounded-[5px] border border-border bg-background p-2 text-[13px] text-foreground placeholder:text-muted-foreground" />
            </Field>
          </FormSection>

          {/* Budget */}
          <FormSection icon={<IndianRupee className="h-3.5 w-3.5" />} title="Budget">
            <Field label="Budget (INR)">
              <input type="number" min="0" step="500" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 18000"
                className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground" />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              Owners may bid above or below your budget. The lowest verified bid wins.
            </p>
          </FormSection>

          {/* Trust note */}
          <section className="flex items-start gap-2 rounded-[5px] border border-border bg-muted/20 px-3 py-2.5 text-[12px] text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              All loads are visible only to KYC-verified vehicle owners on Reanzly.
              Payments are escrow-held until delivery confirmation.
            </p>
          </section>

          {/* Submit */}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 border-t border-border bg-background px-5 py-3 sm:flex-row">
            <button
              type="submit"
              className="tap inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <Send className="h-3.5 w-3.5" />
              Post load
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="tap inline-flex h-11 items-center justify-center rounded-[6px] border border-border px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>

          <datalist id="post-load-cities">
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
