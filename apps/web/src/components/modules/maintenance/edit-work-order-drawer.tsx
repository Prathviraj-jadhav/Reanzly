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
import type { WorkOrder, Priority } from "@/lib/types";
import {
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  PRIORITIES,
} from "./_helpers";

/**
 * EditWorkOrderDrawer - focused editor for an existing Work Order.
 * Hick's Law: 8 fields (title, vehicle, type, priority, status, vendor,
 * technician, estimated cost).
 */
interface EditWorkOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  workOrder?: WorkOrder | null;
  onUpdate?: (id: string, data: Partial<WorkOrder>) => void;
}

interface EditForm {
  title: string;
  vehicle: string;
  type: WorkOrder["type"];
  priority: Priority;
  status: WorkOrder["status"];
  vendor: string;
  technician: string;
  estimatedCost: string;
}

function fromWO(w: WorkOrder): EditForm {
  return {
    title: w.title,
    vehicle: w.vehicle,
    type: w.type,
    priority: w.priority,
    status: w.status,
    vendor: w.vendor ?? "",
    technician: w.technician ?? "",
    estimatedCost: String(w.estimatedCost),
  };
}

function toPatch(form: EditForm): Partial<WorkOrder> {
  return {
    title: form.title.trim(),
    vehicle: form.vehicle.trim(),
    type: form.type,
    priority: form.priority,
    status: form.status,
    vendor: form.vendor.trim() || undefined,
    technician: form.technician.trim() || undefined,
    estimatedCost: Number(form.estimatedCost) || 0,
  };
}

const EMPTY_WO: WorkOrder = {
  id: "",
  workOrderId: "",
  title: "",
  vehicle: "",
  type: "Scheduled",
  priority: "Medium",
  status: "Open",
  createdDate: new Date().toISOString(),
  estimatedCost: 0,
};

export function EditWorkOrderDrawer({
  open,
  onClose,
  workOrder,
  onUpdate,
}: EditWorkOrderDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    workOrder ? fromWO(workOrder) : fromWO(EMPTY_WO),
  );

  useEffect(() => {
    if (!open) return;
    if (workOrder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromWO(workOrder));
    }
  }, [open, workOrder?.id, workOrder]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!workOrder) return;
    if (!form.title.trim()) {
      toast("Title is required");
      return;
    }
    if (onUpdate) {
      onUpdate(workOrder.id, toPatch(form));
      toast.success("Work order updated", {
        description: `${form.title} · ${form.vehicle}`,
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
              Edit Work Order
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {workOrder ? `${workOrder.workOrderId} · ${workOrder.title}` : "Update work order"}
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
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
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
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as WorkOrder["type"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v as Priority)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as WorkOrder["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input
                value={form.vendor}
                onChange={(e) => update("vendor", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Technician</Label>
              <Input
                value={form.technician}
                onChange={(e) => update("technician", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Estimated Cost (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.estimatedCost}
                onChange={(e) => update("estimatedCost", e.target.value)}
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
