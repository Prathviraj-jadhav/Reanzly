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
import type { Reminder } from "@/lib/types";
import {
  REMINDER_TYPES,
  REMINDER_ENTITY_TYPES,
} from "./_helpers";

/**
 * EditReminderDrawer - focused editor for an existing Reminder.
 * Hick's Law: 7 fields (type, entity type, entity, name, due date, days
 * remaining, status).
 */
interface EditReminderDrawerProps {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
  onUpdate?: (id: string, data: Partial<Reminder>) => void;
}

interface EditForm {
  type: Reminder["type"];
  entityType: Reminder["entityType"];
  entity: string;
  name: string;
  dueDate: string;
  daysRemaining: string;
  status: Reminder["status"];
}

function fromReminder(r: Reminder): EditForm {
  return {
    type: r.type,
    entityType: r.entityType,
    entity: r.entity,
    name: r.name,
    dueDate: r.dueDate.slice(0, 10),
    daysRemaining: String(r.daysRemaining),
    status: r.status,
  };
}

function toPatch(form: EditForm): Partial<Reminder> {
  return {
    type: form.type,
    entityType: form.entityType,
    entity: form.entity.trim(),
    name: form.name.trim(),
    dueDate: new Date(form.dueDate).toISOString(),
    daysRemaining: Number(form.daysRemaining) || 0,
    status: form.status,
  };
}

const EMPTY_REMINDER: Reminder = {
  id: "",
  type: "Service",
  entity: "",
  entityType: "Vehicle",
  name: "",
  dueDate: new Date().toISOString(),
  daysRemaining: 0,
  status: "Upcoming",
};

export function EditReminderDrawer({
  open,
  onClose,
  reminder,
  onUpdate,
}: EditReminderDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    reminder ? fromReminder(reminder) : fromReminder(EMPTY_REMINDER),
  );

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromReminder(reminder));
    }
  }, [open, reminder?.id, reminder]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!reminder) return;
    if (!form.name.trim()) {
      toast("Reminder name is required");
      return;
    }
    if (onUpdate) {
      onUpdate(reminder.id, toPatch(form));
      toast.success("Reminder updated", {
        description: `${form.name} · due ${form.dueDate}`,
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
              Edit Reminder
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {reminder ? reminder.name : "Update reminder"}
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
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Reminder Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as Reminder["type"])}>
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
            <div>
              <Label>Entity Type</Label>
              <Select value={form.entityType} onValueChange={(v) => update("entityType", v as Reminder["entityType"])}>
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
              <Label>Entity</Label>
              <Input
                value={form.entity}
                onChange={(e) => update("entity", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Days Remaining</Label>
              <Input
                inputMode="numeric"
                value={form.daysRemaining}
                onChange={(e) => update("daysRemaining", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as Reminder["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Due Soon">Due Soon</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
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
