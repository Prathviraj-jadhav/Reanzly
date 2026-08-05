"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput } from "@/components/shared/savage-input";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
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
import type { Vehicle } from "@/lib/types";
import {
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  VEHICLE_GROUPS,
  OWNERSHIP_TYPES,
  FUEL_TYPES,
} from "./_helpers";

/**
 * EditVehicleDrawer - full-record editor for an existing Vehicle.
 *
 * The 6-section onboarding (`VehicleOnboarding`) is the only way to introduce
 * a brand-new vehicle. For edits, ops typically wants to tweak the
 * identification, status, operator, and meter - that's exactly what this
 * drawer handles. Updates route through the parent's `onUpdate` callback so
 * the lifted in-session state stays in sync.
 */
interface EditVehicleDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer pre-fills from this record. */
  vehicle?: Vehicle | null;
  /** Edit callback - receives the record id and a patch of changed fields. */
  onUpdate?: (id: string, data: Partial<Vehicle>) => void;
}

interface EditForm {
  name: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  licensePlate: string;
  status: Vehicle["status"];
  type: string;
  group: string;
  fuelType: string;
  ownership: Vehicle["ownership"];
  operator: string;
  currentMeter: string;
  location: string;
}

function fromVehicle(v: Vehicle): EditForm {
  return {
    name: v.name,
    make: v.make,
    model: v.model,
    year: String(v.year),
    vin: v.vin,
    licensePlate: v.licensePlate,
    status: v.status,
    type: v.type,
    group: v.group,
    fuelType: v.fuelType,
    ownership: v.ownership,
    operator: v.operator ?? "",
    currentMeter: String(v.currentMeter),
    location: v.location ?? "",
  };
}

function toPatch(form: EditForm): Partial<Vehicle> {
  return {
    name: form.name.trim(),
    make: form.make.trim(),
    model: form.model.trim(),
    year: Number(form.year) || new Date().getFullYear(),
    vin: form.vin.trim(),
    licensePlate: form.licensePlate.trim(),
    status: form.status,
    type: form.type,
    group: form.group,
    fuelType: form.fuelType,
    ownership: form.ownership,
    operator: form.operator.trim() || "-",
    currentMeter: Number(form.currentMeter) || 0,
    location: form.location.trim() || undefined,
  };
}

export function EditVehicleDrawer({ open, onClose, vehicle, onUpdate }: EditVehicleDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    vehicle ? fromVehicle(vehicle) : fromVehicle(EMPTY_VEHICLE),
  );

  // Pre-fill the form whenever the drawer opens (with a record) or the
  // underlying record changes. Legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromVehicle(vehicle));
    }
  }, [open, vehicle?.id, vehicle]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!vehicle) return;
    if (!form.name.trim()) {
      toast("Vehicle name is required");
      return;
    }
    if (!form.vin.trim()) {
      toast("VIN is required");
      return;
    }
    if (onUpdate) {
      onUpdate(vehicle.id, toPatch(form));
      toast.success("Vehicle updated", {
        description: `${form.name} · ${form.licensePlate}`,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit Vehicle
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {vehicle ? `${vehicle.name} · ${vehicle.licensePlate}` : "Update vehicle record"}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Identification */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Identification
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Name</Label>
                  <SavageInput
                    category="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Make</Label>
                  <SavageInput
                    category="name"
                    value={form.make}
                    onChange={(e) => update("make", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <SavageInput
                    category="name"
                    value={form.model}
                    onChange={(e) => update("model", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>VIN</Label>
                  <SavageInput
                    category="gst"
                    value={form.vin}
                    onChange={(e) => update("vin", e.target.value.toUpperCase())}
                    className="h-8 rounded-[5px] text-[13px] tabular font-mono"
                  />
                </div>
                <div>
                  <Label>License Plate</Label>
                  <SavageInput
                    category="gst"
                    value={form.licensePlate}
                    onChange={(e) => update("licensePlate", e.target.value.toUpperCase())}
                    className="h-8 rounded-[5px] text-[13px] tabular font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Status & classification */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status &amp; Classification
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v as Vehicle["status"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => update("type", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Group</Label>
                  <Select value={form.group} onValueChange={(v) => update("group", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ownership</Label>
                  <Select value={form.ownership} onValueChange={(v) => update("ownership", v as Vehicle["ownership"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNERSHIP_TYPES.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuelType} onValueChange={(v) => update("fuelType", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Operations
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Operator</Label>
                  <SavageInput
                    category="driverName"
                    value={form.operator}
                    onChange={(e) => update("operator", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Current Meter (km)</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.currentMeter}
                    onChange={(e) => update("currentMeter", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>Current Location</Label>
                  <SavageInput
                    category="city"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
          >
            Save Changes
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-foreground">
      {children}
    </label>
  );
}

// Stand-in empty vehicle used only to seed the form when no record is provided
// (the drawer is always rendered with a record, but this satisfies the type).
const EMPTY_VEHICLE: Vehicle = {
  id: "",
  name: "",
  year: new Date().getFullYear(),
  make: "",
  model: "",
  vin: "",
  status: "Idle",
  type: "Tractor",
  group: "Line Haul",
  currentMeter: 0,
  licensePlate: "",
  watchers: [],
  operator: "",
  fuelType: "Diesel",
  ownership: "Owned",
  distanceThisPeriod: 0,
};
