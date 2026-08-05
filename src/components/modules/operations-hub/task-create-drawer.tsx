"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Btn } from "@/components/shared/btn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ASSIGNEES,
  DEPARTMENTS,
  EMPTY_TASK_FORM,
  LINKED_ENTITY_TYPES,
  PRIORITIES,
  SPRINTS,
  TASK_STATUSES,
  type TaskCreateForm,
} from "./_helpers";
import { TRIPS, VEHICLES, DRIVERS, CUSTOMERS, INVOICES } from "@/lib/mock-data";

interface CreateDrawerProps {
  open: boolean;
  onClose: () => void;
  initialStatus: Task["status"];
  onSave: (form: TaskCreateForm) => void;
}

import type { Task } from "@/lib/types";

function linkedEntityOptions(type: string): string[] {
  switch (type) {
    case "Trip":
      return TRIPS.slice(0, 12).map((t) => t.tripId);
    case "Vehicle":
      return VEHICLES.slice(0, 12).map((v) => v.licensePlate);
    case "Driver":
      return DRIVERS.filter((d) => d.role === "Driver").slice(0, 12).map((d) => d.name);
    case "Customer":
      return CUSTOMERS.slice(0, 12).map((c) => c.companyName);
    case "Invoice":
      return INVOICES.slice(0, 12).map((i) => i.invoiceNumber);
    default:
      return [];
  }
}

export function TaskCreateDrawer({ open, onClose, initialStatus, onSave }: CreateDrawerProps) {
  // Form initialises from `initialStatus` - the component is remounted via
  // a `key` prop by the parent when a new column triggers the drawer, so we
  // never need an effect to sync.
  const [form, setForm] = useState<TaskCreateForm>(() => ({
    ...EMPTY_TASK_FORM,
    status: initialStatus,
  }));
  const [newChecklistText, setNewChecklistText] = useState("");

  const update = <K extends keyof TaskCreateForm>(k: K, v: TaskCreateForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    update("checklist", [...form.checklist, { text, done: false }]);
    setNewChecklistText("");
  };

  const removeChecklistItem = (idx: number) => {
    update(
      "checklist",
      form.checklist.filter((_, i) => i !== idx),
    );
  };

  const toggleChecklistItem = (idx: number) => {
    update(
      "checklist",
      form.checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c)),
    );
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.assignee) {
      toast.error("Assignee is required");
      return;
    }
    onSave({
      ...form,
      title: form.title.trim(),
      linkedEntityName:
        form.linkedEntityType === "None" ? "" : form.linkedEntityName,
    });
    setForm(EMPTY_TASK_FORM);
    setNewChecklistText("");
    onClose();
  };

  const linkedNameOptions = linkedEntityOptions(form.linkedEntityType);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="text-[16px] font-medium tracking-tight">
            Create task
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            Adds a new task to the <span className="font-medium text-foreground">{form.status}</span> column.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          {/* Title */}
          <Field label="Title" required>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="What needs to be done?"
              className="h-9 w-full rounded-[5px] border border-border bg-card px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Add context, links, acceptance criteria…"
              rows={3}
              className="w-full resize-none rounded-[5px] border border-border bg-card px-2.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
            />
          </Field>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee" required>
              <Select value={form.assignee} onValueChange={(v) => update("assignee", v)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Due date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
                className="h-9 w-full rounded-[5px] border border-border bg-card px-2.5 text-[13px] text-foreground focus:border-foreground/40 focus:outline-none"
              />
            </Field>
          </div>

          {/* Priority + Department */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => update("priority", v as TaskCreateForm["priority"])}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Department">
              <Select value={form.department} onValueChange={(v) => update("department", v)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Sprint + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sprint">
              <Select value={form.sprint} onValueChange={(v) => update("sprint", v)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPRINTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status / column">
              <Select value={form.status} onValueChange={(v) => update("status", v as Task["status"])}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Linked entity */}
          <Field label="Linked entity">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={form.linkedEntityType}
                onValueChange={(v) => {
                  update("linkedEntityType", v);
                  update("linkedEntityName", "");
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINKED_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.linkedEntityType !== "None" ? (
                <Select
                  value={form.linkedEntityName}
                  onValueChange={(v) => update("linkedEntityName", v)}
                >
                  <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-card text-[13px]">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedNameOptions.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 items-center rounded-[5px] border border-dashed border-border bg-muted/30 px-2.5 text-[12px] text-muted-foreground/70">
                  No link
                </div>
              )}
            </div>
          </Field>

          {/* Checklist */}
          <Field label="Checklist">
            <div className="rounded-[5px] border border-border bg-card">
              {form.checklist.length > 0 ? (
                <div className="divide-y divide-border">
                  {form.checklist.map((c, i) => (
                    <div key={i} className="group flex items-center gap-2 px-2 py-1.5">
                      <button
                        onClick={() => toggleChecklistItem(i)}
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                          c.done
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-transparent hover:border-foreground/60",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-[12px]",
                          c.done ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {c.text}
                      </span>
                      <button
                        onClick={() => removeChecklistItem(i)}
                        className="text-muted-foreground/40 opacity-0 hover:text-foreground group-hover:opacity-100"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-3 text-[11px] text-muted-foreground/60">
                  No checklist items yet.
                </div>
              )}
              <div className="flex items-center gap-1.5 border-t border-border px-2 py-1.5">
                <input
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                  placeholder="Add a checklist item…"
                  className="h-7 flex-1 rounded-[4px] border border-border bg-background px-2 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
                />
                <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={addChecklistItem}>
                  Add
                </Btn>
              </div>
            </div>
          </Field>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-background px-4 py-3">
          <Btn icon={<X className="h-3.5 w-3.5" />} onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
            Create task
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {required && <span className="text-[11px] text-foreground">*</span>}
      </div>
      {children}
    </div>
  );
}
