"use client";
import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ListChecks,
  Plus,
  Trash2,
  Truck,
  Coins,
  Clock,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { VENDORS } from "@/lib/mock-data";
import {
  SERVICE_TYPES,
  VEHICLE_TYPES,
  TRIGGER_TYPES,
  EMPTY_PROGRAM_FORM,
  type ServiceProgramForm,
  type ServiceProgram,
  FieldLabel,
  formatINR,
} from "./_helpers";

interface AddServiceProgramDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided the drawer operates in edit mode for this program. */
  record?: ServiceProgram;
  /** Create callback - persists the new program to the parent list state. */
  onAdd?: (program: ServiceProgram) => void;
  /** Called when submitting in edit mode, with the real updated record. */
  onUpdate?: (id: string, updated: ServiceProgram) => void;
}

const STEPS = [
  { id: 1, label: "Program" },
  { id: 2, label: "Tasks & Vendor" },
  { id: 3, label: "Review" },
];

const INTERVAL_UNITS_BY_TRIGGER: Record<string, string[]> = {
  Time: ["days", "weeks", "months"],
  Distance: ["km"],
  Both: ["months", "km"],
};

function fromRecord(r: ServiceProgram): ServiceProgramForm {
  return {
    name: r.name,
    vehicleType: r.vehicleType,
    serviceType: r.serviceType,
    triggerType: r.triggerType,
    intervalValue: String(r.intervalValue),
    intervalUnit: r.intervalUnit,
    defaultVendor: r.defaultVendor,
    estDurationHours: String(r.estDurationHours),
    estCost: String(r.estCost),
    tasks: r.tasks.map((t) => t.text),
  };
}

export function AddServiceProgramDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: AddServiceProgramDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ServiceProgramForm>(EMPTY_PROGRAM_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from record when entering edit mode.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && record) {
      setForm(fromRecord(record));
      setStep(1);
    } else if (open && !record) {
      setForm(EMPTY_PROGRAM_FORM);
      setStep(1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, record?.id]);

  const update = <K extends keyof ServiceProgramForm>(k: K, v: ServiceProgramForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleTriggerChange = (trigger: string) => {
    const units = INTERVAL_UNITS_BY_TRIGGER[trigger];
    const newUnit = units.includes(form.intervalUnit) ? form.intervalUnit : units[0];
    setForm((s) => ({ ...s, triggerType: trigger, intervalUnit: newUnit }));
  };

  const errors: string[] = [];
  if (step === 1) {
    if (!form.name.trim()) errors.push("Program name is required");
    if (!form.intervalValue || Number(form.intervalValue) <= 0) errors.push("Interval value must be greater than zero");
  }
  if (step === 2) {
    const validTasks = form.tasks.filter((t) => t.trim());
    if (validTasks.length === 0) errors.push("At least one task is required");
  }

  const isLastStep = step === 3;
  const canAdvance = errors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", { description: errors[0] });
      return;
    }
    if (step < 3) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const addTask = () => update("tasks", [...form.tasks, ""]);
  const removeTask = (idx: number) => update("tasks", form.tasks.filter((_, i) => i !== idx));
  const updateTask = (idx: number, value: string) =>
    update("tasks", form.tasks.map((t, i) => (i === idx ? value : t)));

  const handleSubmit = async () => {
    const validTasks = form.tasks.filter((t) => t.trim());
    setSubmitting(true);
    const payload = {
      name: form.name,
      vehicleType: form.vehicleType,
      serviceType: form.serviceType,
      triggerType: form.triggerType,
      intervalValue: Number(form.intervalValue) || 0,
      intervalUnit: form.intervalUnit,
      defaultVendor: form.defaultVendor,
      estDurationHours: Number(form.estDurationHours) || 0,
      estCost: Number(form.estCost) || 0,
      tasks: validTasks,
    };

    if (record && onUpdate) {
      const res = await fetch(`/api/service-templates/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (!res.ok) {
        toast.error("Could not update service program");
        return;
      }
      const { template } = await res.json();
      onUpdate(record.id, template);
      toast.success(`Service program updated`, {
        description: `${form.name} · ${form.vehicleType} · every ${form.intervalValue} ${form.intervalUnit}`,
      });
      setStep(1);
      setForm(EMPTY_PROGRAM_FORM);
      onClose();
      return;
    }

    const res = await fetch("/api/service-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Could not create service program");
      return;
    }
    const { template } = await res.json();
    onAdd?.(template);
    toast.success(`Service program created`, {
      description: `${form.name} · ${form.vehicleType} · every ${form.intervalValue} ${form.intervalUnit}`,
    });
    setStep(1);
    setForm(EMPTY_PROGRAM_FORM);
    onClose();
  };

  const validTasks = form.tasks.filter((t) => t.trim());

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit Service Program" : "New Service Program"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? `Editing ${record.name}`
                : "3 steps · define trigger · build task checklist · pick vendor"}
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

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors " +
                        (active || done
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={
                        "hidden text-[12px] font-medium md:inline " +
                        (active ? "text-foreground" : "text-muted-foreground")
                      }
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={"h-px w-6 " + (step > s.id ? "bg-foreground" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Program */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Program Setup</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Program Name</FieldLabel>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="e.g. Heavy Truck - Periodic Service A"
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Vehicle Type</FieldLabel>
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
                    <FieldLabel required>Service Type</FieldLabel>
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
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Trigger & Interval</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="col-span-2 sm:col-span-1">
                    <FieldLabel required>Trigger Type</FieldLabel>
                    <Select value={form.triggerType} onValueChange={handleTriggerChange}>
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
                    <FieldLabel required hint="number">Interval Value</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      value={form.intervalValue}
                      onChange={(e) => update("intervalValue", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Unit</FieldLabel>
                    <Select value={form.intervalUnit} onValueChange={(v) => update("intervalUnit", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_UNITS_BY_TRIGGER[form.triggerType].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {form.triggerType === "Time" && `Triggers every ${form.intervalValue || "0"} ${form.intervalUnit} from last service date`}
                  {form.triggerType === "Distance" && `Triggers every ${form.intervalValue || "0"} ${form.intervalUnit} from last service odometer`}
                  {form.triggerType === "Both" && `Triggers whichever comes first - ${form.intervalValue || "0"} ${form.intervalUnit}`}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Tasks & Vendor */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Tasks Checklist</span>
                  </div>
                  <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={addTask}>Add Task</Btn>
                </div>
                <div className="flex flex-col gap-2">
                  {form.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <Input
                        value={task}
                        onChange={(e) => updateTask(idx, e.target.value)}
                        placeholder={`Task ${idx + 1} description…`}
                        className="h-8 flex-1 rounded-[5px] text-[13px]"
                      />
                      <button
                        onClick={() => removeTask(idx)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Remove task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {form.tasks.length === 0 && (
                    <p className="text-[12px] text-muted-foreground text-center py-4">No tasks yet - click "Add Task" to begin.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vendor & Estimates</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel hint="optional">Default Vendor</FieldLabel>
                    <Select value={form.defaultVendor || "none"} onValueChange={(v) => update("defaultVendor", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not assigned -</SelectItem>
                        {VENDORS.filter((v) => v.type === "Maintenance Workshop").map((v) => (
                          <SelectItem key={v.id} value={v.companyName}>{v.companyName} · {v.city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel hint="hours">Est. Duration</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.estDurationHours}
                      onChange={(e) => update("estDurationHours", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="₹">Est. Cost</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={form.estCost}
                      onChange={(e) => update("estCost", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Program Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Name" value={form.name} />
                  <ReviewRow label="Vehicle Type" value={form.vehicleType} />
                  <ReviewRow label="Service Type" value={form.serviceType} />
                  <ReviewRow label="Trigger" value={form.triggerType} />
                  <ReviewRow label="Interval" value={`${form.intervalValue} ${form.intervalUnit}`} mono />
                  <ReviewRow label="Default Vendor" value={form.defaultVendor || "-"} />
                  <ReviewRow label="Est. Duration" value={`${form.estDurationHours || 0} h`} mono />
                  <ReviewRow label="Est. Cost" value={form.estCost ? formatINR(Number(form.estCost)) : "-"} mono />
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Tasks</span>
                  <span className="text-[11px] text-muted-foreground tabular">{validTasks.length} task{validTasks.length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {validTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px] text-foreground">
                      <span className="tabular text-[11px] text-muted-foreground w-6">{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goBack} disabled={step === 1}>
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 3</div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : record ? "Save Changes" : "Create Program"}
            </Btn>
          ) : (
            <Btn variant="primary" onClick={goNext} disabled={!canAdvance}>
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={"text-[13px] text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}
