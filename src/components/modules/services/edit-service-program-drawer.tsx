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
  SERVICE_TYPES,
  TRIGGER_TYPES,
  VEHICLE_TYPES,
  type ServiceProgram,
} from "./_helpers";

/**
 * EditServiceProgramDrawer - focused editor for an existing Service Program.
 * Hick's Law: 8 fields (name, vehicle/service type, trigger interval,
 * duration, cost, vendor, status).
 */
interface EditServiceProgramDrawerProps {
  open: boolean;
  onClose: () => void;
  program?: ServiceProgram | null;
  onUpdate?: (id: string, updated: ServiceProgram) => void;
}

interface EditForm {
  name: string;
  vehicleType: string;
  serviceType: string;
  triggerType: string;
  intervalValue: string;
  intervalUnit: string;
  defaultVendor: string;
  estCost: string;
  status: ServiceProgram["status"];
}

function fromProgram(p: ServiceProgram): EditForm {
  return {
    name: p.name,
    vehicleType: p.vehicleType,
    serviceType: p.serviceType,
    triggerType: p.triggerType,
    intervalValue: String(p.intervalValue),
    intervalUnit: p.intervalUnit,
    defaultVendor: p.defaultVendor,
    estCost: String(p.estCost),
    status: p.status,
  };
}

function toPatch(form: EditForm) {
  return {
    name: form.name.trim(),
    vehicleType: form.vehicleType,
    serviceType: form.serviceType,
    triggerType: form.triggerType,
    intervalValue: Number(form.intervalValue) || 0,
    intervalUnit: form.intervalUnit,
    defaultVendor: form.defaultVendor.trim(),
    estCost: Number(form.estCost) || 0,
    status: form.status,
  };
}

const EMPTY_PROGRAM: ServiceProgram = {
  id: "",
  name: "",
  vehicleType: "Truck",
  serviceType: "Periodic Maintenance",
  triggerType: "Distance",
  intervalValue: 0,
  intervalUnit: "km",
  linkedVehicles: 0,
  tasks: [],
  defaultVendor: "",
  estDurationHours: 0,
  estCost: 0,
  lastUpdated: new Date().toISOString(),
  status: "Draft",
};

const INTERVAL_UNITS = ["km", "days", "months", "hours"];

export function EditServiceProgramDrawer({
  open,
  onClose,
  program,
  onUpdate,
}: EditServiceProgramDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    program ? fromProgram(program) : fromProgram(EMPTY_PROGRAM),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (program) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromProgram(program));
    }
  }, [open, program?.id, program]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!program) return;
    if (!form.name.trim()) {
      toast("Program name is required");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/service-templates/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPatch(form)),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Could not update service program");
      return;
    }
    const { template } = await res.json();
    onUpdate?.(program.id, template);
    toast.success("Service program updated", {
      description: `${form.name} · ${form.serviceType}`,
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
              Edit Service Program
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {program ? program.name : "Update service program"}
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
              <Label>Program Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={form.vehicleType} onValueChange={(v) => update("vehicleType", v)}>
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
              <Label>Service Type</Label>
              <Select value={form.serviceType} onValueChange={(v) => update("serviceType", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={form.triggerType} onValueChange={(v) => update("triggerType", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interval Value</Label>
              <Input
                inputMode="numeric"
                value={form.intervalValue}
                onChange={(e) => update("intervalValue", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Interval Unit</Label>
              <Select value={form.intervalUnit} onValueChange={(v) => update("intervalUnit", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Vendor</Label>
              <Input
                value={form.defaultVendor}
                onChange={(e) => update("defaultVendor", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Estimated Cost (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.estCost}
                onChange={(e) => update("estCost", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as ServiceProgram["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
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
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
