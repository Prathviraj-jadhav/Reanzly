"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  AlertCircle,
  Wrench,
  MapPin,
  Calendar,
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
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TECHNICIANS,
  type FieldTask,
  type TaskType,
  type TaskPriority,
  FieldLabel,
  toInputDateTime,
} from "./_helpers";

interface AddTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (t: Partial<FieldTask>) => Promise<FieldTask | null>;
}

interface TaskForm {
  title: string;
  type: TaskType;
  customer: string;
  customerCode: string;
  technician: string;
  scheduledAt: string;
  priority: TaskPriority;
  location: string;
  vehicleRef: string;
  contactName: string;
  contactPhone: string;
  description: string;
}

const EMPTY_FORM: TaskForm = {
  title: "",
  type: "Repair",
  customer: "",
  customerCode: "",
  technician: TECHNICIANS[0],
  scheduledAt: "",
  priority: "Medium",
  location: "",
  vehicleRef: "",
  contactName: "",
  contactPhone: "",
  description: "",
};

export function AddTaskDrawer({ open, onClose, onAdd }: AddTaskDrawerProps) {
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const update = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Title is required");
  if (!form.customer.trim()) errors.push("Customer is required");
  if (!form.technician) errors.push("Technician is required");
  if (!form.scheduledAt) errors.push("Scheduled date/time is required");
  if (!form.location.trim()) errors.push("Location is required");
  if (!form.description.trim()) errors.push("Description is required");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (errors.length > 0) {
      toast("Cannot create task", { description: errors[0] });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<FieldTask> = {
        title: form.title.trim(),
        type: form.type,
        customer: form.customer.trim(),
        customerCode: form.customerCode.trim() || undefined,
        technician: form.technician,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        priority: form.priority,
        location: form.location.trim(),
        vehicleRef: form.vehicleRef.trim() || undefined,
        contactName: form.contactName.trim() || form.customer.trim(),
        contactPhone: form.contactPhone.trim() || "-",
        description: form.description.trim(),
        checklist: defaultChecklistForType(form.type),
      };
      const created = onAdd ? await onAdd(payload) : null;
      if (!created) return; // onAdd already surfaced the real error via toast
      toast.success(`Task ${created.taskId} created`, {
        description: `${form.type} · ${form.technician} · ${form.priority}`,
      });
      setForm(EMPTY_FORM);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Field Task</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Dispatch a technician for repair, inspection, survey, installation, or maintenance.
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

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Task type */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Task</span>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <FieldLabel required>Title</FieldLabel>
                  <Input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Roadside clutch repair - MH-12-AB-7890"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel required>Description</FieldLabel>
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the task scope, symptoms, or work to perform…"
                    className="min-h-[80px] rounded-[5px] text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Type</FieldLabel>
                    <Select value={form.type} onValueChange={(v) => update("type", v as TaskType)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Priority</FieldLabel>
                    <Select value={form.priority} onValueChange={(v) => update("priority", v as TaskPriority)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Location */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Customer & Location</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Customer name</FieldLabel>
                  <Input
                    value={form.customer}
                    onChange={(e) => update("customer", e.target.value)}
                    placeholder="e.g. Maruti Roadways"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Customer code</FieldLabel>
                  <Input
                    value={form.customerCode}
                    onChange={(e) => update("customerCode", e.target.value)}
                    placeholder="CR-0142"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Location</FieldLabel>
                  <Input
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="e.g. NH48, near Manor, Palghar, Maharashtra"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Vehicle ref</FieldLabel>
                  <Input
                    value={form.vehicleRef}
                    onChange={(e) => update("vehicleRef", e.target.value)}
                    placeholder="MH-12-AB-7890"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Contact name</FieldLabel>
                  <Input
                    value={form.contactName}
                    onChange={(e) => update("contactName", e.target.value)}
                    placeholder="Rohit Sawant"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Contact phone</FieldLabel>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => update("contactPhone", e.target.value)}
                    placeholder="+91-98220-33445"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
              </div>
            </div>

            {/* Assignment & Schedule */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Assignment & Schedule</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Technician</FieldLabel>
                  <Select value={form.technician} onValueChange={(v) => update("technician", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                      {TECHNICIANS.map((tech) => (
                        <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Scheduled at</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt ? toInputDateTime(form.scheduledAt) : ""}
                    onChange={(e) => update("scheduledAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
              </div>
            </div>
          </div>
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
          <Btn variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Task"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Default checklist seeded from the task type - keeps the worksheet tab populated. */
function defaultChecklistForType(type: TaskType) {
  const map: Record<TaskType, string[]> = {
    Repair: ["Arrive at vehicle location", "Diagnose fault", "Source parts", "Perform repair", "Test repair", "Handover to driver"],
    Inspection: ["Verify documents", "Brake system check", "Tyre audit", "Lights + electrical", "Suspension check", "Compile inspection report"],
    Survey: ["Photograph vehicle/facility", "Inspect condition", "Record measurements", "Compile survey report"],
    Installation: ["Mount hardware", "Wire connections", "Configure device", "Test functionality", "Handover + briefing"],
    Maintenance: ["Pre-service inspection", "Drain + replace fluids", "Replace filters", "Grease + lubricate", "Final test", "Handover"],
  };
  return map[type].map((label, i) => ({ id: `c-${i + 1}`, label, done: false }));
}
