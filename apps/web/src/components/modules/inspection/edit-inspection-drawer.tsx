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
import type { Inspection } from "@/lib/types";
import {
  INSPECTION_TYPES,
  INSPECTION_RESULTS,
} from "./_helpers";

/**
 * EditInspectionDrawer - focused editor for an existing Inspection record.
 * Hick's Law: 7 fields (type, vehicle, driver, inspector, date, result,
 * odometer).
 */
interface EditInspectionDrawerProps {
  open: boolean;
  onClose: () => void;
  inspection?: Inspection | null;
  onUpdate?: (id: string, data: Partial<Inspection>) => void;
}

interface EditForm {
  type: string;
  vehicle: string;
  driver: string;
  inspector: string;
  date: string;
  result: Inspection["result"];
  odometer: string;
}

function fromInspection(i: Inspection): EditForm {
  return {
    type: i.type,
    vehicle: i.vehicle,
    driver: i.driver ?? "",
    inspector: i.inspector,
    date: i.date.slice(0, 10),
    result: i.result,
    odometer: String(i.odometer),
  };
}

function toPatch(form: EditForm): Partial<Inspection> {
  return {
    type: form.type,
    vehicle: form.vehicle.trim(),
    driver: form.driver.trim() || undefined,
    inspector: form.inspector.trim(),
    date: new Date(form.date).toISOString(),
    result: form.result,
    odometer: Number(form.odometer) || 0,
  };
}

const EMPTY_INSPECTION: Inspection = {
  id: "",
  inspectionId: "",
  type: "Pre-Trip",
  vehicle: "",
  inspector: "",
  date: new Date().toISOString(),
  result: "Pass",
  odometer: 0,
  linkedIssues: 0,
};

export function EditInspectionDrawer({
  open,
  onClose,
  inspection,
  onUpdate,
}: EditInspectionDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    inspection ? fromInspection(inspection) : fromInspection(EMPTY_INSPECTION),
  );

  useEffect(() => {
    if (!open) return;
    if (inspection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromInspection(inspection));
    }
  }, [open, inspection?.id, inspection]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!inspection) return;
    if (!form.vehicle.trim()) {
      toast("Vehicle is required");
      return;
    }
    if (onUpdate) {
      onUpdate(inspection.id, toPatch(form));
      toast.success("Inspection updated", {
        description: `${inspection.inspectionId} · ${form.result}`,
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
              Edit Inspection
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {inspection ? `${inspection.inspectionId} · ${inspection.vehicle}` : "Update inspection"}
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
              <Label>Inspection Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Inspector</Label>
              <Input
                value={form.inspector}
                onChange={(e) => update("inspector", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
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
              <Label>Result</Label>
              <Select value={form.result} onValueChange={(v) => update("result", v as Inspection["result"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
