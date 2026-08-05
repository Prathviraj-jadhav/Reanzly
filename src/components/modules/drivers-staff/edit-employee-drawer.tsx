"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
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
import type { Driver } from "@/lib/types";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_ROLES,
  DEPARTMENTS,
  CITIES,
} from "./_helpers";

/**
 * EditEmployeeDrawer - full-record editor for an existing Driver / Staff member.
 *
 * The 6-step wizard (`AddEmployeeDrawer`) is the only way to introduce a new
 * employee (it generates credentials, walks access permissions, etc.). For
 * edits, ops typically wants to tweak identity, role, status, license, and
 * contact - that's exactly what this drawer handles. Updates route through
 * the parent's `onUpdate` callback so the lifted in-session state stays in sync.
 */
interface EditEmployeeDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer pre-fills from this record. */
  driver?: Driver | null;
  /** Edit callback - receives the record id and a patch of changed fields. */
  onUpdate?: (id: string, data: Partial<Driver>) => void;
}

interface EditForm {
  name: string;
  email: string;
  contact: string;
  city: string;
  role: Driver["role"];
  department: string;
  status: Driver["status"];
  licenseNumber: string;
  licenseExpiry: string;
  assignedVehicle: string;
  rating: string;
  tripsCompleted: string;
  onTimeRate: string;
}

function fromDriver(d: Driver): EditForm {
  return {
    name: d.name,
    email: d.email,
    contact: d.contact,
    city: d.city,
    role: d.role,
    department: d.department,
    status: d.status,
    licenseNumber: d.licenseNumber,
    licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : "",
    assignedVehicle: d.assignedVehicle ?? "",
    rating: d.rating ? d.rating.toFixed(1) : "",
    tripsCompleted: String(d.tripsCompleted),
    onTimeRate: String(Math.round(d.onTimeRate * 100)),
  };
}

function toPatch(form: EditForm): Partial<Driver> {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    contact: form.contact.trim(),
    city: form.city.trim(),
    role: form.role,
    department: form.department,
    status: form.status,
    licenseNumber: form.licenseNumber.trim(),
    licenseExpiry: form.licenseExpiry
      ? new Date(form.licenseExpiry).toISOString()
      : new Date().toISOString(),
    assignedVehicle: form.assignedVehicle.trim() || undefined,
    rating: Number(form.rating) || 0,
    tripsCompleted: Number(form.tripsCompleted) || 0,
    onTimeRate: (Number(form.onTimeRate) || 0) / 100,
  };
}

export function EditEmployeeDrawer({ open, onClose, driver, onUpdate }: EditEmployeeDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    driver ? fromDriver(driver) : fromDriver(EMPTY_DRIVER),
  );

  // Pre-fill the form whenever the drawer opens (with a record) or the
  // underlying record changes. Legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    if (driver) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromDriver(driver));
    }
  }, [open, driver?.id, driver]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!driver) return;
    if (!form.name.trim()) {
      toast("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      toast("Email is required");
      return;
    }
    if (onUpdate) {
      onUpdate(driver.id, toPatch(form));
      toast.success("Employee updated", {
        description: `${form.name} · ${form.role}`,
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
              Edit {form.role === "Driver" ? "Driver" : "Employee"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {driver ? `${driver.name} · ${driver.email}` : "Update employee record"}
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
            {/* Identity */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Identity
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Full Name</Label>
                  <SavageInput
                    category="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <SavageInput
                    category="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <SavageInput
                    category="phone"
                    value={form.contact}
                    onChange={(e) => update("contact", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Select value={form.city} onValueChange={(v) => update("city", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned Vehicle</Label>
                  <SavageInput
                    category="city"
                    value={form.assignedVehicle}
                    onChange={(e) => update("assignedVehicle", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Role & Status */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Role &amp; Status
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => update("role", v as Driver["role"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => update("department", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v as Driver["status"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* License (drivers only) */}
            {form.role === "Driver" && (
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    License &amp; Compliance
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>License Number</Label>
                    <SavageInput
                      category="gst"
                      value={form.licenseNumber}
                      onChange={(e) => update("licenseNumber", e.target.value.toUpperCase())}
                      className="h-8 rounded-[5px] text-[13px] tabular font-mono"
                    />
                  </div>
                  <div>
                    <Label>License Expiry</Label>
                    <SavageInput
                      category="remarks"
                      type="date"
                      value={form.licenseExpiry}
                      onChange={(e) => update("licenseExpiry", e.target.value)}
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Performance summary */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Performance Summary
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Rating (0–5)</Label>
                  <SavageInput
                    category="amount"
                    inputMode="decimal"
                    value={form.rating}
                    onChange={(e) => update("rating", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>Trips Completed</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.tripsCompleted}
                    onChange={(e) => update("tripsCompleted", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <Label>On-Time Rate (%)</Label>
                  <SavageInput
                    category="amount"
                    inputMode="numeric"
                    value={form.onTimeRate}
                    onChange={(e) => update("onTimeRate", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
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

const EMPTY_DRIVER: Driver = {
  id: "",
  name: "",
  role: "Driver",
  department: "Operations",
  status: "Active",
  contact: "",
  licenseNumber: "",
  licenseExpiry: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  email: "",
  rating: 0,
  tripsCompleted: 0,
  onTimeRate: 0,
  city: "",
};
