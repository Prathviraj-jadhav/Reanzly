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
import {
  useRateCardsStore,
  type RateCard,
  type RateCardStatus,
  type VehicleType,
  type LoadType,
  type RateCalculationType,
  VEHICLE_TYPES,
  LOAD_TYPES,
  RATE_CALC_TYPES,
  RATE_CARD_STATUSES,
} from "@/lib/store/rate-cards-store";

/**
 * EditRateCardDrawer - focused editor for an existing Rate Card.
 *
 * Updates route through the persisted rate-cards-store so the change
 * survives reload and is reflected everywhere the rate card is referenced
 * (trip planning, route cost planner, etc.).
 *
 * Hick's Law: 8 fields - name, lane, vehicle/load type, rate, GST, validity.
 */
interface EditRateCardDrawerProps {
  open: boolean;
  onClose: () => void;
  rateCard?: RateCard | null;
  onUpdate?: (id: string, data: Partial<RateCard>) => void;
}

interface EditForm {
  name: string;
  source: string;
  destination: string;
  vehicleType: VehicleType;
  loadType: LoadType;
  rateType: RateCalculationType;
  baseRate: string;
  status: RateCardStatus;
}

function fromRateCard(r: RateCard): EditForm {
  return {
    name: r.name,
    source: r.source,
    destination: r.destination,
    vehicleType: r.vehicleType,
    loadType: r.loadType,
    rateType: r.rateType,
    baseRate: String(r.baseRate),
    status: r.status,
  };
}

function toPatch(form: EditForm): Partial<RateCard> {
  return {
    name: form.name.trim(),
    source: form.source.trim(),
    destination: form.destination.trim(),
    vehicleType: form.vehicleType,
    loadType: form.loadType,
    rateType: form.rateType,
    baseRate: Number(form.baseRate) || 0,
    status: form.status,
  };
}

const EMPTY_RATECARD: RateCard = {
  id: "",
  name: "",
  source: "",
  destination: "",
  vehicleType: "Container 32ft",
  loadType: "FTL",
  rateType: "Per Trip",
  baseRate: 0,
  surcharges: [],
  detentionPerDay: 0,
  effectiveFrom: new Date().toISOString(),
  status: "Draft",
  gstApplicable: false,
  gstRate: 0,
  createdBy: "-",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function EditRateCardDrawer({
  open,
  onClose,
  rateCard,
  onUpdate,
}: EditRateCardDrawerProps) {
  const updateRateCard = useRateCardsStore((s) => s.updateRateCard);
  const [form, setForm] = useState<EditForm>(() =>
    rateCard ? fromRateCard(rateCard) : fromRateCard(EMPTY_RATECARD),
  );

  useEffect(() => {
    if (!open) return;
    if (rateCard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromRateCard(rateCard));
    }
  }, [open, rateCard?.id, rateCard]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!rateCard) return;
    if (!form.name.trim()) {
      toast("Rate card name is required");
      return;
    }
    const patch = toPatch(form);
    if (onUpdate) {
      onUpdate(rateCard.id, patch);
    } else {
      updateRateCard(rateCard.id, patch);
    }
    toast.success("Rate card updated", {
      description: `${form.name} · ${form.source} → ${form.destination}`,
    });
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
              Edit Rate Card
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {rateCard ? `${rateCard.name}` : "Update rate card"}
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
            <div className="sm:col-span-2">
              <Label>Rate Card Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={form.vehicleType} onValueChange={(v) => update("vehicleType", v as VehicleType)}>
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
              <Label>Load Type</Label>
              <Select value={form.loadType} onValueChange={(v) => update("loadType", v as LoadType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate Type</Label>
              <Select value={form.rateType} onValueChange={(v) => update("rateType", v as RateCalculationType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_CALC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Rate (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.baseRate}
                onChange={(e) => update("baseRate", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as RateCardStatus)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_CARD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
