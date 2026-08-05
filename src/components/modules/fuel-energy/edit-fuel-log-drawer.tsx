"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FuelEntry } from "@/lib/types";
import { FUEL_TYPES, STATIONS } from "./_helpers";

/**
 * EditFuelLogDrawer - focused editor for an existing Fuel Log entry.
 * Hick's Law: 8 fields (date, vehicle, driver, station, fuel type, qty,
 * unit price, odometer). The patch re-derives totalCost so it stays in sync.
 */
interface EditFuelLogDrawerProps {
  open: boolean;
  onClose: () => void;
  entry?: FuelEntry | null;
  onUpdate?: (id: string, data: Partial<FuelEntry>) => void;
}

interface EditForm {
  date: string;
  vehicle: string;
  driver: string;
  station: string;
  fuelType: string;
  quantity: string;
  unitPrice: string;
  odometer: string;
}

function fromEntry(e: FuelEntry): EditForm {
  return {
    date: e.date.slice(0, 10),
    vehicle: e.vehicle,
    driver: e.driver ?? "",
    station: e.station,
    fuelType: e.fuelType,
    quantity: String(e.quantity),
    unitPrice: String(e.unitPrice),
    odometer: String(e.odometer),
  };
}

function toPatch(form: EditForm): Partial<FuelEntry> {
  const qty = Number(form.quantity) || 0;
  const price = Number(form.unitPrice) || 0;
  const odo = Number(form.odometer) || 0;
  return {
    date: new Date(form.date).toISOString(),
    vehicle: form.vehicle.trim(),
    driver: form.driver.trim() || undefined,
    station: form.station,
    fuelType: form.fuelType,
    quantity: qty,
    unitPrice: price,
    totalCost: Math.round(qty * price),
    odometer: odo,
  };
}

const EMPTY_ENTRY: FuelEntry = {
  id: "",
  date: new Date().toISOString(),
  vehicle: "",
  station: "HP Pump",
  fuelType: "Diesel",
  quantity: 0,
  unitPrice: 0,
  totalCost: 0,
  odometer: 0,
  efficiency: 0,
  anomaly: false,
};

export function EditFuelLogDrawer({
  open,
  onClose,
  entry,
  onUpdate,
}: EditFuelLogDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    entry ? fromEntry(entry) : fromEntry(EMPTY_ENTRY),
  );

  useEffect(() => {
    if (!open) return;
    if (entry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromEntry(entry));
    }
  }, [open, entry?.id, entry]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!entry) return;
    if (!form.vehicle.trim()) {
      toast("Vehicle is required");
      return;
    }
    if (onUpdate) {
      onUpdate(entry.id, toPatch(form));
      toast.success("Fuel log updated", {
        description: `${form.vehicle} · ${form.quantity} L`,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit Fuel Log
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {entry ? `${entry.vehicle} · ${entry.date.slice(0, 10)}` : "Update fuel entry"}
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

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Input
                value={form.vehicle}
                onChange={(e) => update("vehicle", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Driver</Label>
              <Input
                value={form.driver}
                onChange={(e) => update("driver", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Station</Label>
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
            <div>
              <Label>Fuel Type</Label>
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
              <Label>Quantity (L)</Label>
              <Input
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Unit Price (₹/L)</Label>
              <Input
                inputMode="decimal"
                value={form.unitPrice}
                onChange={(e) => update("unitPrice", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input
                inputMode="numeric"
                value={form.odometer}
                onChange={(e) => update("odometer", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
          </div>
        </div>

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
