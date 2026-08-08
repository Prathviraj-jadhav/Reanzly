"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  X,
  Check,
  ChevronLeft,
  AlertCircle,
  ClipboardCheck,
  Truck,
  PackageCheck,
  Wrench,
  FileText,
  ClipboardList,
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
import { VEHICLES, DRIVERS, CUSTOMERS } from "@/lib/mock-data";
import {
  CHECK_TYPES,
  CHECK_RESULTS,
  INSPECTOR_OPTIONS,
  EMPTY_CHECK_FORM,
  toInputDate,
  FieldLabel,
  type CheckForm,
  type CheckType,
  type CheckResult,
  type QualityCheck,
} from "./_helpers";

interface AddCheckDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (check: QualityCheck) => void;
}

const TYPE_ICON: Record<CheckType, React.ComponentType<{ className?: string }>> = {
  Vehicle: Truck,
  "Goods Receipt": PackageCheck,
  Service: Wrench,
  Document: FileText,
  "Process Audit": ClipboardList,
};

const LOCATION_OPTIONS = [
  "Bhiwandi DC",
  "Taloja WH-2",
  "Hoskote Bay 4",
  "Pilerne Hub",
  "Workshop Floor 3",
  "Field",
];

export function AddCheckDrawer({ open, onClose, onAdd }: AddCheckDrawerProps) {
  const [form, setForm] = useState<CheckForm>(() => EMPTY_CHECK_FORM());
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof CheckForm>(k: K, v: CheckForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Build reference options based on type
  const referenceOptions = (() => {
    switch (form.type) {
      case "Vehicle":
      case "Goods Receipt":
      case "Service":
        return VEHICLES.map((v) => ({ id: v.id, label: `${v.licensePlate} · ${v.name}` }));
      case "Document":
        return DRIVERS.map((d) => ({ id: d.id, label: `${d.name} · ${d.role}` }));
      case "Process Audit":
        return CUSTOMERS.map((c) => ({ id: c.id, label: `${c.companyName} contract` }));
      default:
        return [];
    }
  })();

  // When type changes, clear reference
  const handleTypeChange = (t: CheckType) => {
    setForm((s) => ({ ...s, type: t, reference: "" }));
  };

  const errors: string[] = [];
  if (!form.reference) errors.push("Reference is required");
  if (!form.inspector.trim()) errors.push("Inspector is required");
  if (!form.date) errors.push("Check date is required");
  if (!form.location) errors.push("Location is required");

  const handleSubmit = async () => {
    if (errors.length > 0) {
      toastInfo("Cannot create check", errors[0]);
      return;
    }
    const refLabel = referenceOptions.find((r) => r.id === form.reference)?.label || form.reference;
    const referenceModule =
      form.type === "Document"
        ? "drivers-staff"
        : form.type === "Process Audit"
          ? "customers"
          : "vehicles";

    setSubmitting(true);
    const res = await fetch("/api/quality-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        reference: refLabel,
        referenceEntity: form.reference,
        referenceModule,
        inspector: form.inspector,
        date: form.date,
        location: form.location,
        notes: form.notes.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toastInfo("Could not create check", "Please try again");
      return;
    }
    const { check } = await res.json();
    onAdd?.(check);
    toastSuccess(`Check ${check.checkId} scheduled`, `${form.type} · ${refLabel} · ${form.inspector}`);
    setForm(EMPTY_CHECK_FORM());
    onClose();
  };

  const TypeIcon = TYPE_ICON[form.type] || ClipboardCheck;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Quality Check</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Schedule a {form.type.toLowerCase()} check · control points auto-load from template
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
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Check Setup</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Check Type</FieldLabel>
                  <Select value={form.type} onValueChange={(v) => handleTypeChange(v as CheckType)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECK_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel required hint={form.type.toLowerCase()}>{form.type} Reference</FieldLabel>
                  <Select value={form.reference || "none"} onValueChange={(v) => update("reference", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue placeholder={`Select ${form.type.toLowerCase()} reference`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                      <SelectItem value="none">- Select reference -</SelectItem>
                      {referenceOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel required>Inspector</FieldLabel>
                  <Select value={form.inspector} onValueChange={(v) => update("inspector", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTOR_OPTIONS.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <Input
                    type="date"
                    value={toInputDate(form.date)}
                    onChange={(e) => update("date", new Date(e.target.value).toISOString())}
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>

                <div>
                  <FieldLabel required hint="where">Location</FieldLabel>
                  <Select value={form.location} onValueChange={(v) => update("location", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel hint="expected">Expected Result</FieldLabel>
                  <Select value={form.expectedResult} onValueChange={(v) => update("expectedResult", v as CheckResult)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECK_RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
              </div>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Optional context - special instructions for the inspector…"
                className="min-h-[80px] rounded-[5px] text-[12px] bg-background"
              />
            </div>

            <div className="rounded-[6px] border border-border bg-muted/40 p-4">
              <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <ClipboardCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="text-foreground font-medium">Control points auto-load from the {form.type} template.</span> After scheduling, open the check to record measurements - findings and corrective actions generate automatically based on out-of-tolerance readings.
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
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={onClose}>
            Cancel
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            {form.location}
          </div>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule Check"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// re-exports for type narrowing in icon mapping above
