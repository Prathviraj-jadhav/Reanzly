"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bell,
  Truck,
  User,
  CalendarClock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { VEHICLES, DRIVERS } from "@/lib/mock-data";
import type { Reminder } from "@/lib/types";
import {
  REMINDER_TYPES,
  REMINDER_ENTITY_TYPES,
  DOCUMENT_TYPES,
  EMPTY_REMINDER_FORM,
  type ReminderForm,
  FieldLabel,
  toInputDate,
  formatDate,
} from "./_helpers";

interface AddReminderDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: Reminder;
  onAdd?: (reminder: Reminder) => void;
  onUpdate?: (id: string, data: Partial<Reminder>) => void;
}

function recordToForm(record: Reminder): ReminderForm {
  return {
    ...EMPTY_REMINDER_FORM,
    entityType: record.entityType,
    entity: record.entity,
    reminderType: record.type,
    name: record.name,
    dueDate: record.dueDate,
  };
}

function statusForDays(days: number): Reminder["status"] {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

function formToData(form: ReminderForm): Partial<Reminder> {
  const dueMs = new Date(form.dueDate).getTime();
  const daysRemaining = Math.round((dueMs - Date.now()) / 86400000);
  return {
    type: form.reminderType as Reminder["type"],
    entity: form.entity,
    entityType: form.entityType as Reminder["entityType"],
    name: form.name,
    dueDate: form.dueDate,
    daysRemaining,
    status: statusForDays(daysRemaining),
  };
}

const STEPS = [
  { id: 1, label: "Entity" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Review" },
];

export function AddReminderDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: AddReminderDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh each time.
  const [form, setForm] = useState<ReminderForm>(() =>
    record ? recordToForm(record) : EMPTY_REMINDER_FORM,
  );

  const update = <K extends keyof ReminderForm>(k: K, v: ReminderForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const entityOptions = useMemo(() => {
    return form.entityType === "Vehicle"
      ? VEHICLES.map((v) => ({ id: v.id, label: `${v.name} · ${v.licensePlate}` }))
      : DRIVERS.map((d) => ({ id: d.id, label: `${d.name} · ${d.role}` }));
  }, [form.entityType]);

  const errors: string[] = [];
  if (step === 1) {
    if (!form.entityType) errors.push("Entity type is required");
    if (!form.entity) errors.push("Entity is required");
    if (!form.reminderType) errors.push("Reminder type is required");
    if (!form.name.trim()) errors.push("Reminder name is required");
  }
  if (step === 2) {
    if (!form.dueDate) errors.push("Due date is required");
    if (!form.advanceNotice || Number(form.advanceNotice) < 0) errors.push("Advance notice must be 0 or more days");
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

  const handleSubmit = () => {
    const payload = formToData(form);
    if (record && onUpdate) {
      onUpdate(record.id, payload);
      toast.success("Reminder updated", {
        description: `${form.name} · ${form.entityType} · due ${formatDate(form.dueDate)}`,
      });
    } else if (onAdd) {
      const newReminder: Reminder = {
        id: `rem-${Date.now()}`,
        type: payload.type ?? "Renewal",
        entity: payload.entity ?? "",
        entityType: payload.entityType ?? "Vehicle",
        name: payload.name ?? "",
        dueDate: payload.dueDate ?? new Date().toISOString(),
        daysRemaining: payload.daysRemaining ?? 0,
        status: payload.status ?? "Upcoming",
      };
      onAdd(newReminder);
      toast.success("Reminder created", {
        description: `${form.name} · ${form.entityType} · due ${formatDate(form.dueDate)}`,
      });
    } else {
      toast.success("Reminder created", {
        description: `${form.name} · ${form.entityType} · due ${formatDate(form.dueDate)}`,
      });
    }
    setStep(1);
    setForm(EMPTY_REMINDER_FORM);
    onClose();
  };

  const handleEntityTypeChange = (t: string) => {
    setForm((s) => ({ ...s, entityType: t, entity: "" }));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Reminder" : "New Reminder"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update reminder details and schedule"
                : "3 steps · link to vehicle or driver · schedule + recipients"}
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
          {/* Step 1: Entity */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Entity</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Entity Type</FieldLabel>
                    <Select value={form.entityType} onValueChange={handleEntityTypeChange}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_ENTITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Entity</FieldLabel>
                    <Select value={form.entity || "none"} onValueChange={(v) => update("entity", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder={`Select ${form.entityType.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select -</SelectItem>
                        {entityOptions.map((e) => (
                          <SelectItem key={e.id} value={e.label}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Reminder Type</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Reminder Type</FieldLabel>
                    <Select value={form.reminderType} onValueChange={(v) => update("reminderType", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.reminderType === "Renewal" && (
                    <div>
                      <FieldLabel required>Document Type</FieldLabel>
                      <Select value={form.documentType} onValueChange={(v) => update("documentType", v)}>
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                          {DOCUMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <FieldLabel required>Reminder Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={form.reminderType === "Service" ? "e.g. Periodic service due" : "e.g. Insurance renewal"}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Due Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.dueDate)}
                      onChange={(e) => update("dueDate", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="days, optional">Recurrence Interval</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      value={form.intervalDays}
                      onChange={(e) => update("intervalDays", e.target.value)}
                      placeholder="e.g. 90"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel required hint="days">Advance Notice</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={form.advanceNotice}
                      onChange={(e) => update("advanceNotice", e.target.value)}
                      placeholder="7"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Recipients will be notified {form.advanceNotice || 0} days before the due date{form.intervalDays ? `, then every ${form.intervalDays} days` : ""}.
                </p>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notification Recipients</span>
                </div>
                <Textarea
                  value={form.notificationRecipients}
                  onChange={(e) => update("notificationRecipients", e.target.value)}
                  placeholder="Comma-separated roles or names - e.g. Fleet Manager, Operations Manager"
                  className="min-h-[60px] rounded-[5px] text-[13px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Reminder Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Entity Type" value={form.entityType} />
                  <ReviewRow label="Entity" value={form.entity || "-"} />
                  <ReviewRow label="Reminder Type" value={form.reminderType} />
                  {form.reminderType === "Renewal" && <ReviewRow label="Document Type" value={form.documentType} />}
                  <ReviewRow label="Name" value={form.name} />
                  <ReviewRow label="Due Date" value={formatDate(form.dueDate)} mono />
                  <ReviewRow label="Interval" value={form.intervalDays ? `${form.intervalDays} days` : "-"} mono />
                  <ReviewRow label="Advance Notice" value={`${form.advanceNotice} days`} mono />
                  <ReviewRow label="Recipients" value={form.notificationRecipients} />
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
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
              {record ? "Save Changes" : "Create Reminder"}
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
