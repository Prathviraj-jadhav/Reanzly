"use client";
import { useState, useMemo, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { useAppStore } from "@/lib/store/app-store";
import { VEHICLES, DRIVERS, VENDORS } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  X,
} from "lucide-react";
import {
  SECTIONS,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  OWNERSHIP_TYPES,
  FUEL_TYPES,
  BODY_TYPES,
  TRANSMISSION_TYPES,
  LOAN_LEASE_TYPES,
  MEASUREMENT_UNITS,
  EMPTY_VEHICLE_FORM,
  type VehicleOnboardingForm,
  type SectionId,
} from "./_helpers";
import type { Vehicle } from "@/lib/types";

interface VehicleOnboardingProps {
  onClose: () => void;
  /** Create callback - persists the new vehicle via the real API. Resolves
   * false (not a throw) on failure, since the caller already surfaces its
   * own error toast - this just tells the form whether to close. */
  onAdd?: (vehicle: Vehicle) => Promise<boolean>;
}

export function VehicleOnboarding({ onClose, onAdd }: VehicleOnboardingProps) {
  const { navigateDetail } = useAppStore();
  const [form, setForm] = useState<VehicleOnboardingForm>(EMPTY_VEHICLE_FORM);
  const [activeSection, setActiveSection] = useState<SectionId>("details");
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    details: null, maintenance: null, lifecycle: null,
    financial: null, specifications: null, settings: null,
  });

  const update = <K extends keyof VehicleOnboardingForm>(k: K, v: VehicleOnboardingForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Validation - basic required-field check on Details
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vehicle name is required";
    if (!form.vin.trim()) e.vin = "VIN is required";
    if (!form.licensePlate.trim()) e.licensePlate = "License plate is required";
    return e;
  }, [form]);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      toast("Cannot save vehicle", {
        description: errors[Object.keys(errors)[0]],
      });
      scrollToSection("details");
      return;
    }
    const nameParts = form.name.trim().split(/\s+/);
    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      name: form.name,
      year: new Date().getFullYear(),
      make: nameParts[0] || "Unknown",
      model: nameParts.slice(1).join(" ") || "Standard",
      vin: form.vin,
      status: (form.status as Vehicle["status"]) || "Active",
      type: form.type,
      group: "Line Haul",
      currentMeter: Number(form.inServiceOdometer) || 0,
      licensePlate: form.licensePlate,
      watchers: [],
      operator: form.defaultTechnician || "",
      fuelType: "Diesel",
      ownership: (form.ownership as Vehicle["ownership"]) || "Owned",
      distanceThisPeriod: 0,
    };
    if (onAdd) {
      setSaving(true);
      const ok = await onAdd(newVehicle);
      setSaving(false);
      if (!ok) return; // onAdd already surfaced its own error toast
      toast.success("Vehicle onboarded", {
        description: `${form.name} added to fleet registry`,
      });
      setForm(EMPTY_VEHICLE_FORM);
      onClose();
      return;
    }
    toast.success("Vehicle onboarded", {
      description: `${form.name} added to fleet registry`,
    });
    // Navigate to a real existing vehicle detail as a stand-in for the newly created one
    const existing = VEHICLES[0];
    navigateDetail("vehicles", existing.id);
  };

  const technicians = DRIVERS.filter((d) => d.role === "Driver").slice(0, 8);
  const maintenanceVendors = VENDORS.filter((v) =>
    ["Maintenance Workshop", "Spare Parts Supplier", "Tyre Supplier"].includes(v.type),
  );
  const purchaseVendors = VENDORS;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Onboard Vehicle"
        description="Add a vehicle to the fleet registry - fill in details across six sections."
        actions={
          <>
            <Btn icon={<X className="h-3.5 w-3.5" />} onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Vehicle"}
            </Btn>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Horizontal section stepper */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3">
          {SECTIONS.map((s, i) => {
            const isActive = activeSection === s.id;
            const currentIndex = SECTIONS.findIndex((x) => x.id === activeSection);
            const isComplete = i < currentIndex;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-[5px] px-3 py-2 text-[13px] transition-colors tap",
                  isActive
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium tabular",
                    isActive
                      ? "bg-background text-foreground"
                      : isComplete
                        ? "bg-foreground text-background"
                        : "border border-border",
                  )}
                >
                  {isComplete ? "✓" : i + 1}
                </span>
                {s.label}
                {s.id === "details" && Object.keys(errors).length > 0 && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isActive ? "bg-background" : "bg-foreground",
                    )}
                  />
                )}
              </button>
            );
          })}
          {/* Completion indicator */}
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${completionPct(form)}%` }}
              />
            </div>
            <span className="text-[11px] tabular text-muted-foreground">{completionPct(form)}%</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-6">
          {/* Details */}
          <FormSection
            id="details"
            title="Details"
            description="Core identification - what this vehicle is."
            refCb={(el) => { sectionRefs.current.details = el; }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Vehicle Name"
                required
                value={form.name}
                onChange={(v) => update("name", v)}
                placeholder="e.g. Tata LPT 1613 - MH 12 JK 4521"
                error={errors.name}
              />
              <FormField
                label="VIN / Serial Number"
                required
                value={form.vin}
                onChange={(v) => update("vin", v)}
                placeholder="17-character VIN"
                mono
                error={errors.vin}
              />
              <FormField
                label="License Plate"
                required
                value={form.licensePlate}
                onChange={(v) => update("licensePlate", v)}
                placeholder="e.g. MH 12 JK 4521"
                mono
                error={errors.licensePlate}
              />
              <FormSelect
                label="Vehicle Type"
                value={form.type}
                onChange={(v) => update("type", v)}
                options={VEHICLE_TYPES}
              />
              <FormSelect
                label="Status"
                value={form.status}
                onChange={(v) => update("status", v)}
                options={[...VEHICLE_STATUSES]}
              />
              <FormSelect
                label="Ownership"
                value={form.ownership}
                onChange={(v) => update("ownership", v)}
                options={[...OWNERSHIP_TYPES]}
              />
              <FormField
                label="Labels / Tags"
                value={form.labels}
                onChange={(v) => update("labels", v)}
                placeholder="Comma-separated, e.g. High-priority, North-zone"
              />
            </div>
          </FormSection>

          {/* Maintenance */}
          <FormSection
            id="maintenance"
            title="Maintenance"
            description="How this vehicle gets serviced."
            refCb={(el) => { sectionRefs.current.maintenance = el; }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Service Program"
                value={form.serviceProgram}
                onChange={(v) => update("serviceProgram", v)}
                placeholder="e.g. Standard 20k km program"
              />
              <FormSelect
                label="Preferred Vendor"
                value={form.preferredVendor}
                onChange={(v) => update("preferredVendor", v)}
                options={maintenanceVendors.map((v) => v.companyName)}
                placeholder="Select vendor"
              />
              <FormSelect
                label="Default Technician"
                value={form.defaultTechnician}
                onChange={(v) => update("defaultTechnician", v)}
                options={technicians.map((t) => t.name)}
                placeholder="Select technician"
              />
            </div>
          </FormSection>

          {/* Lifecycle */}
          <FormSection
            id="lifecycle"
            title="Lifecycle"
            description="When the vehicle entered and will exit service."
            refCb={(el) => { sectionRefs.current.lifecycle = el; }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="In-Service Date"
                type="date"
                value={form.inServiceDate}
                onChange={(v) => update("inServiceDate", v)}
                mono
              />
              <FormField
                label="In-Service Odometer (km)"
                value={form.inServiceOdometer}
                onChange={(v) => update("inServiceOdometer", v)}
                mono
              />
              <FormField
                label="Life Estimate (months)"
                value={form.lifeEstimateMonths}
                onChange={(v) => update("lifeEstimateMonths", v)}
                mono
              />
              <FormField
                label="Life Estimate (distance, km)"
                value={form.lifeEstimateDistance}
                onChange={(v) => update("lifeEstimateDistance", v)}
                mono
              />
              <FormField
                label="Estimated Resale Value (₹)"
                value={form.estimatedResale}
                onChange={(v) => update("estimatedResale", v)}
                placeholder="e.g. 8,50,000"
                mono
              />
              <FormField
                label="Out-of-Service Date"
                type="date"
                value={form.outOfServiceDate}
                onChange={(v) => update("outOfServiceDate", v)}
                mono
              />
            </div>
          </FormSection>

          {/* Financial */}
          <FormSection
            id="financial"
            title="Financial"
            description="Purchase and financing details."
            refCb={(el) => { sectionRefs.current.financial = el; }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect
                label="Purchase Vendor"
                value={form.purchaseVendor}
                onChange={(v) => update("purchaseVendor", v)}
                options={purchaseVendors.map((v) => v.companyName)}
                placeholder="Select vendor"
              />
              <FormField
                label="Purchase Date"
                type="date"
                value={form.purchaseDate}
                onChange={(v) => update("purchaseDate", v)}
                mono
              />
              <FormField
                label="Purchase Price (₹)"
                value={form.purchasePrice}
                onChange={(v) => update("purchasePrice", v)}
                placeholder="e.g. 22,50,000"
                mono
              />
              <FormField
                label="Purchase Odometer (km)"
                value={form.purchaseOdometer}
                onChange={(v) => update("purchaseOdometer", v)}
                mono
              />
              <FormSelect
                label="Loan / Lease Type"
                value={form.loanLeaseType}
                onChange={(v) => update("loanLeaseType", v)}
                options={[...LOAN_LEASE_TYPES]}
              />
              <div className="sm:col-span-2">
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Purchase Notes</Label>
                <Textarea
                  value={form.purchaseNotes}
                  onChange={(e) => update("purchaseNotes", e.target.value)}
                  placeholder="Any additional context about the purchase, financing terms, or vendor relationship…"
                  className="min-h-[60px] rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
            </div>
          </FormSection>

          {/* Specifications */}
          <FormSection
            id="specifications"
            title="Specifications"
            description="Technical attributes across dimensions, powertrain, and running gear."
            refCb={(el) => { sectionRefs.current.specifications = el; }}
          >
            <div className="flex flex-col gap-6">
              {/* Dimensions */}
              <SubSection title="Dimensions">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <FormField label="Width (mm)" value={form.specWidth} onChange={(v) => update("specWidth", v)} mono />
                  <FormField label="Height (mm)" value={form.specHeight} onChange={(v) => update("specHeight", v)} mono />
                  <FormField label="Length (mm)" value={form.specLength} onChange={(v) => update("specLength", v)} mono />
                  <FormField label="Volume (m³)" value={form.specVolume} onChange={(v) => update("specVolume", v)} mono />
                </div>
              </SubSection>

              {/* Weight */}
              <SubSection title="Weight">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <FormField label="Weight (kg)" value={form.specWeight} onChange={(v) => update("specWeight", v)} mono />
                  <FormField label="Curb Weight (kg)" value={form.specCurbWeight} onChange={(v) => update("specCurbWeight", v)} mono />
                  <FormField label="GVWR (kg)" value={form.specGvwr} onChange={(v) => update("specGvwr", v)} mono />
                </div>
              </SubSection>

              {/* Performance */}
              <SubSection title="Performance">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                  <FormField label="Towing Capacity (kg)" value={form.specTowing} onChange={(v) => update("specTowing", v)} mono />
                  <FormField label="Payload (kg)" value={form.specPayload} onChange={(v) => update("specPayload", v)} mono />
                </div>
              </SubSection>

              {/* Fuel Economy */}
              <SubSection title="Fuel Economy (km/L)">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <FormField label="City" value={form.specCity} onChange={(v) => update("specCity", v)} mono />
                  <FormField label="Highway" value={form.specHighway} onChange={(v) => update("specHighway", v)} mono />
                  <FormField label="Combined" value={form.specCombined} onChange={(v) => update("specCombined", v)} mono />
                </div>
              </SubSection>

              {/* Engine */}
              <SubSection title="Engine">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <FormField label="Engine Summary" value={form.engineSummary} onChange={(v) => update("engineSummary", v)} placeholder="e.g. 5.9L turbo-diesel I6" />
                  </div>
                  <FormField label="Brand" value={form.engineBrand} onChange={(v) => update("engineBrand", v)} />
                  <FormField label="Aspiration" value={form.engineAspiration} onChange={(v) => update("engineAspiration", v)} />
                  <FormField label="Block" value={form.engineBlock} onChange={(v) => update("engineBlock", v)} />
                  <FormField label="Bore (mm)" value={form.engineBore} onChange={(v) => update("engineBore", v)} mono />
                  <FormField label="Cam" value={form.engineCam} onChange={(v) => update("engineCam", v)} />
                  <FormField label="Compression" value={form.engineCompression} onChange={(v) => update("engineCompression", v)} mono />
                  <FormField label="Cylinders" value={form.engineCylinders} onChange={(v) => update("engineCylinders", v)} mono />
                  <FormField label="Displacement (cc)" value={form.engineDisplacement} onChange={(v) => update("engineDisplacement", v)} mono />
                  <FormField label="Induction" value={form.engineInduction} onChange={(v) => update("engineInduction", v)} />
                  <FormField label="Horsepower (HP)" value={form.engineHp} onChange={(v) => update("engineHp", v)} mono />
                  <FormField label="Torque (Nm)" value={form.engineTorque} onChange={(v) => update("engineTorque", v)} mono />
                  <FormField label="Redline (rpm)" value={form.engineRedline} onChange={(v) => update("engineRedline", v)} mono />
                  <FormField label="Stroke (mm)" value={form.engineStroke} onChange={(v) => update("engineStroke", v)} mono />
                  <FormField label="Valves" value={form.engineValves} onChange={(v) => update("engineValves", v)} mono />
                </div>
              </SubSection>

              {/* Transmission */}
              <SubSection title="Transmission">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <FormField label="Summary" value={form.transSummary} onChange={(v) => update("transSummary", v)} placeholder="e.g. Eaton 9-speed manual" />
                  </div>
                  <FormField label="Brand" value={form.transBrand} onChange={(v) => update("transBrand", v)} />
                  <FormSelect label="Type" value={form.transType} onChange={(v) => update("transType", v)} options={TRANSMISSION_TYPES} />
                  <FormField label="Gears" value={form.transGears} onChange={(v) => update("transGears", v)} mono />
                </div>
              </SubSection>

              {/* Wheels / Tyres */}
              <SubSection title="Wheels & Tyres">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <FormField label="Brake Type" value={form.wheelBrake} onChange={(v) => update("wheelBrake", v)} />
                  <FormField label="Front Track (mm)" value={form.wheelFrontTrack} onChange={(v) => update("wheelFrontTrack", v)} mono />
                  <FormField label="Rear Track (mm)" value={form.wheelRearTrack} onChange={(v) => update("wheelRearTrack", v)} mono />
                  <FormField label="Wheelbase (mm)" value={form.wheelbase} onChange={(v) => update("wheelbase", v)} mono />
                  <FormField label="Front Diameter (mm)" value={form.wheelDiameterFront} onChange={(v) => update("wheelDiameterFront", v)} mono />
                  <FormField label="Rear Diameter (mm)" value={form.wheelDiameterRear} onChange={(v) => update("wheelDiameterRear", v)} mono />
                  <FormField label="Axle Configuration" value={form.axleConfig} onChange={(v) => update("axleConfig", v)} mono />
                  <FormField label="Tyre Type" value={form.tyreType} onChange={(v) => update("tyreType", v)} />
                  <FormField label="Tyre Pressure (PSI)" value={form.tyrePsi} onChange={(v) => update("tyrePsi", v)} mono />
                </div>
              </SubSection>

              {/* Fuel / Oil */}
              <SubSection title="Fuel & Oil">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <FormSelect label="Fuel Quality" value={form.fuelQuality} onChange={(v) => update("fuelQuality", v)} options={FUEL_TYPES} />
                  <FormField label="Tank Capacity (L)" value={form.fuelTankCapacity} onChange={(v) => update("fuelTankCapacity", v)} mono />
                  <FormField label="Oil Specification" value={form.oilSpec} onChange={(v) => update("oilSpec", v)} />
                </div>
              </SubSection>
            </div>
          </FormSection>

          {/* Settings */}
          <FormSection
            id="settings"
            title="Settings"
            description="Integrations and measurement preferences."
            refCb={(el) => { sectionRefs.current.settings = el; }}
          >
            <div className="flex flex-col gap-4">
              <FormSelect
                label="Measurement Units"
                value={form.measurementUnit}
                onChange={(v) => update("measurementUnit", v)}
                options={MEASUREMENT_UNITS}
              />
              <SwitchRow
                label="GPS Integration"
                description="Enable GPS telematics - location pings, ignition, speed, odometer sync."
                checked={form.gpsIntegration}
                onChange={(v) => update("gpsIntegration", v)}
              />
              <SwitchRow
                label="Fuel Card Integration"
                description="Link a fuel card to auto-import fuel transactions and reconcile against odometer."
                checked={form.fuelCardIntegration}
                onChange={(v) => update("fuelCardIntegration", v)}
              />
            </div>
          </FormSection>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Btn icon={<X className="h-3.5 w-3.5" />} onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Vehicle"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Form primitives =====
function FormSection({
  id,
  title,
  description,
  children,
  refCb,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  refCb: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={refCb}
      className="scroll-mt-4 rounded-[6px] border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span id={`section-${id}`} className="text-[14px] font-medium text-foreground">{title}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
        {label}{required && <span className="text-foreground">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 rounded-[5px] border-border bg-background text-[13px]",
          mono && "tabular",
          error && "border-foreground",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-foreground">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[12px] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 rounded-[5px] border-border bg-background text-[13px]">
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-[13px]">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[12px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// Completion percentage - count non-empty string fields
function completionPct(form: VehicleOnboardingForm): number {
  const keys = Object.keys(form) as (keyof VehicleOnboardingForm)[];
  const strKeys = keys.filter((k) => typeof form[k] === "string");
  const filled = strKeys.filter((k) => (form[k] as string).trim().length > 0).length;
  return Math.round((filled / strKeys.length) * 100);
}
