"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { Check, X } from "lucide-react";
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
import { RESOURCE_TYPES, RESOURCE_STATUSES, type ResourceType, type ResourceStatus } from "./_helpers";

interface AddResourceDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => Promise<unknown>;
}

const EMPTY = {
  name: "",
  code: "",
  type: "Driver" as ResourceType,
  designation: "",
  homeBase: "",
  status: "Available" as ResourceStatus,
  shiftStart: "06:00",
  shiftEnd: "18:00",
  skills: "",
};

export function AddResourceDrawer({ open, onClose, onCreate }: AddResourceDrawerProps) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.homeBase.trim()) return;
    setSubmitting(true);
    const created = await onCreate({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      type: form.type,
      designation: form.designation.trim() || undefined,
      homeBase: form.homeBase.trim(),
      status: form.status,
      shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSubmitting(false);
    if (created) {
      setForm(EMPTY);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Add Resource</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Onboard a driver, vehicle, or workshop bay onto the rota.
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
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. Rajesh Sharma / MH 12 JK 4521" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as ResourceType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => update("code", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" placeholder="auto-generated if blank" />
            </div>
            <div>
              <Label>Home Base</Label>
              <Input value={form.homeBase} onChange={(e) => update("homeBase", e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. Bhiwandi Hub" />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => update("designation", e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. HMV, Heavy" />
            </div>
            <div>
              <Label>Shift Start</Label>
              <Input type="time" value={form.shiftStart} onChange={(e) => update("shiftStart", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <Label>Shift End</Label>
              <Input type="time" value={form.shiftEnd} onChange={(e) => update("shiftEnd", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as ResourceStatus)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Skills (comma-separated)</Label>
              <Input value={form.skills} onChange={(e) => update("skills", e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. HMV, Hazmat" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting || !form.name.trim() || !form.homeBase.trim()}>
            {submitting ? "Adding…" : "Add Resource"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
