"use client";

import { useState, useEffect, useMemo } from "react";
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
import type { Trip, Vehicle, Driver } from "@/lib/types";
import { TRIP_STATUSES, PAYMENT_STATUSES } from "./_helpers";

const EMPTY_TRIP: Trip = {
  id: "",
  tripId: "",
  lrNumber: "",
  consignor: "",
  consignee: "",
  origin: "",
  destination: "",
  vehicleId: "",
  vehicleName: "",
  driverId: "",
  driverName: "",
  status: "Planned",
  createdDate: new Date().toISOString(),
  expectedDelivery: new Date().toISOString(),
  freightAmount: 0,
  paymentStatus: "Unpaid",
  orderMode: "FTL",
  distanceKm: 0,
  customer: "",
};

/**
 * EditTripDrawer - lightweight summary-only editor for an existing Trip.
 *
 * The 5-step Job Order wizard (`JobOrderDrawer`) is the only way to capture
 * the full consignment lifecycle. For edits, ops typically wants to tweak
 * the operational status, freight, payment status, expected delivery, and
 * assignment - that's exactly what this drawer handles. Updates route
 * through the parent's `onUpdate` callback so the lifted in-session state
 * stays in sync.
 */
interface EditTripDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer pre-fills from this record. */
  trip?: Trip | null;
  /** Edit callback - receives the record id and a patch of changed fields. */
  onUpdate?: (id: string, data: Partial<Trip>) => void;
}

interface EditForm {
  status: Trip["status"];
  freightAmount: string;
  paymentStatus: Trip["paymentStatus"];
  expectedDelivery: string;
  driverId: string;
  vehicleId: string;
  eWayBill: string;
  distanceKm: string;
}

function fromTrip(t: Trip): EditForm {
  return {
    status: t.status,
    freightAmount: String(t.freightAmount),
    paymentStatus: t.paymentStatus,
    expectedDelivery: t.expectedDelivery ? t.expectedDelivery.slice(0, 10) : "",
    driverId: t.driverId,
    vehicleId: t.vehicleId,
    eWayBill: t.eWayBill ?? "",
    distanceKm: String(t.distanceKm),
  };
}

export function EditTripDrawer({ open, onClose, trip, onUpdate }: EditTripDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    trip ? fromTrip(trip) : fromTrip(EMPTY_TRIP),
  );

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
    ]).then(([veh, drv]) => {
      setVehicles(veh.vehicles ?? []);
      setDrivers(drv.drivers ?? []);
    });
  }, []);

  // Pre-fill the form whenever the drawer opens (with a record) or the
  // underlying record changes. Legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    if (trip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromTrip(trip));
    }
  }, [open, trip?.id, trip]);

  const driverOptions = useMemo(() => drivers, [drivers]);
  const vehicleOptions = useMemo(() => vehicles, [vehicles]);

  const toPatch = (form: EditForm): Partial<Trip> => {
    const driver = drivers.find((d) => d.id === form.driverId);
    const vehicle = vehicles.find((v) => v.id === form.vehicleId);
    return {
      status: form.status,
      freightAmount: Number(form.freightAmount) || 0,
      paymentStatus: form.paymentStatus,
      expectedDelivery: form.expectedDelivery
        ? new Date(form.expectedDelivery).toISOString()
        : new Date().toISOString(),
      driverId: form.driverId,
      driverName: driver?.name ?? "",
      vehicleId: form.vehicleId,
      vehicleName: vehicle?.name ?? "",
      eWayBill: form.eWayBill.trim() || undefined,
      distanceKm: Number(form.distanceKm) || 0,
    };
  };

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!trip) return;
    if (onUpdate) {
      onUpdate(trip.id, toPatch(form));
      toast.success("Trip updated", {
        description: `${trip.tripId} · ${form.status}`,
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
              Edit Trip
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {trip ? `${trip.tripId} · ${trip.lrNumber} · ${trip.origin} → ${trip.destination}` : "Update trip record"}
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
            {/* Status & Payment */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status &amp; Payment
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Trip Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v as Trip["status"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={form.paymentStatus} onValueChange={(v) => update("paymentStatus", v as Trip["paymentStatus"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Financials &amp; Route
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Freight Amount (₹)</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.freightAmount}
                    onChange={(e) => update("freightAmount", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>Distance (km)</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.distanceKm}
                    onChange={(e) => update("distanceKm", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <SavageInput
                    category="remarks"
                    type="date"
                    value={form.expectedDelivery}
                    onChange={(e) => update("expectedDelivery", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>eWay Bill Number</Label>
                  <SavageInput
                    category="gst"
                    value={form.eWayBill}
                    onChange={(e) => update("eWayBill", e.target.value.toUpperCase())}
                    className="h-8 rounded-[5px] text-[13px] tabular font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Assignment
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Driver</Label>
                  <Select value={form.driverId} onValueChange={(v) => update("driverId", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {driverOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} · {d.contact}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle</Label>
                  <Select value={form.vehicleId} onValueChange={(v) => update("vehicleId", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {vehicleOptions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} · {v.licensePlate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

