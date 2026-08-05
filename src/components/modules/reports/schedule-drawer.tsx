"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { X, Check, CalendarClock, Users, FileOutput, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  REPORT_TYPES, SCHEDULE_FREQUENCIES, SCHEDULE_FORMATS, EMPTY_SCHEDULE_FORM,
  FieldLabel, type ScheduleForm, type ReportType,
} from "./_helpers";

interface ScheduleDrawerProps {
  open: boolean;
  report: ReportType | null;
  onClose: () => void;
  onSchedule: (form: ScheduleForm) => void;
}

export function ScheduleDrawer({ open, report, onClose, onSchedule }: ScheduleDrawerProps) {
  const [form, setForm] = useState<ScheduleForm>(EMPTY_SCHEDULE_FORM);

  // Sync form when report changes
  if (open && report && form.reportId !== report.id) {
    setForm({ ...EMPTY_SCHEDULE_FORM, reportId: report.id, format: report.formats[0] });
  }
  if (!open && form.reportId) {
    setTimeout(() => setForm(EMPTY_SCHEDULE_FORM), 0);
  }

  const update = <K extends keyof ScheduleForm>(k: K, v: ScheduleForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (!report) errors.push("No report selected");
  if (!form.deliveryTime) errors.push("Delivery time is required");
  if (!form.recipients.trim()) errors.push("At least one recipient is required");

  const handleSchedule = () => {
    if (errors.length > 0) {
      toast("Cannot schedule", { description: errors[0] });
      return;
    }
    onSchedule(form);
    onClose();
  };

  if (!report) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0"  showCloseButton={false}/>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Schedule · {report.name}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Configure automatic delivery of this report on a recurring schedule.
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

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">
          {/* Frequency */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Frequency</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SCHEDULE_FREQUENCIES.map((f) => (
                <button
                  key={f}
                  onClick={() => update("frequency", f)}
                  className={
                    "flex items-center justify-center rounded-[5px] border px-3 py-2 text-[13px] font-medium transition-colors " +
                    (form.frequency === f
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:bg-accent")
                  }
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <FieldLabel required>Delivery Time</FieldLabel>
              <Input
                type="time"
                value={form.deliveryTime}
                onChange={(e) => update("deliveryTime", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Reports are generated and delivered at this time in your local timezone (Asia/Kolkata).
              </p>
            </div>
          </div>

          {/* Recipients */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Recipients</span>
            </div>
            <Textarea
              value={form.recipients}
              onChange={(e) => update("recipients", e.target.value)}
              placeholder="Comma-separated roles or emails - e.g. Finance Manager, owner@reanzly.in"
              className="min-h-[60px] rounded-[5px] text-[13px]"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Roles are resolved to active users; emails are sent directly.
            </p>
          </div>

          {/* Format */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileOutput className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Output Format</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SCHEDULE_FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => update("format", f)}
                  className={
                    "flex items-center justify-center rounded-[5px] border px-3 py-2 text-[13px] font-medium transition-colors " +
                    (form.format === f
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:bg-accent")
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Next run preview */}
          <div className="rounded-[6px] border border-border bg-accent/30 p-4 flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-foreground">Next scheduled run</p>
              <p className="text-[12px] text-muted-foreground">
                {form.frequency === "Daily" && "Tomorrow at " + form.deliveryTime}
                {form.frequency === "Weekly" && "Next Monday at " + form.deliveryTime}
                {form.frequency === "Monthly" && "1st of next month at " + form.deliveryTime}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSchedule}>
            Schedule Report
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
