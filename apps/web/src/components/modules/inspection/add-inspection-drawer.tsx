"use client";
import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Truck,
  User,
  Gauge,
  ClipboardCheck,
  Camera,
  CheckCircle2,
  XCircle,
  CircleSlash,
  Plus,
  Trash2,
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
import type { Inspection, Vehicle, Driver } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  INSPECTION_TYPES,
  EMPTY_INSPECTION_FORM,
  type InspectionForm,
  type ChecklistItemResult,
  type ChecklistItemDef,
  FieldLabel,
  getChecklistTemplate,
  computeResult,
  formatNumber,
  formatDate,
} from "./_helpers";

interface AddInspectionDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: Inspection;
  onAdd?: (inspection: Inspection) => Promise<boolean>;
  onUpdate?: (id: string, data: Partial<Inspection>) => Promise<boolean>;
}

function checklistForResult(
  type: string,
  result: "Pass" | "Fail" | "Conditional",
): ChecklistItemDef[] {
  const items = getChecklistTemplate(type);
  if (result === "Pass") {
    return items.map((i) => ({ ...i, result: "Pass" as ChecklistItemResult }));
  }
  if (result === "Fail") {
    return items.map((i, idx) => ({
      ...i,
      result: (idx === 0 ? "Fail" : "Pass") as ChecklistItemResult,
      notes: idx === 0 ? "Flagged from prior inspection" : undefined,
    }));
  }
  return items.map((i, idx) => ({
    ...i,
    result: (idx === 0 ? "N/A" : "Pass") as ChecklistItemResult,
  }));
}

function recordToForm(record: Inspection): InspectionForm {
  return {
    vehicle: record.vehicle,
    driver: record.driver || "",
    inspector: record.inspector,
    type: record.type,
    date: record.date,
    odometer: String(record.odometer),
    checklist: checklistForResult(record.type, record.result),
  };
}

function formToData(form: InspectionForm): Partial<Inspection> {
  return {
    type: form.type,
    vehicle: form.vehicle,
    driver: form.driver || undefined,
    inspector: form.inspector,
    date: form.date,
    odometer: Number(form.odometer) || 0,
    result: computeResult(form.checklist),
  };
}

const STEPS = [
  { id: 1, label: "Vehicle & Type" },
  { id: 2, label: "Checklist" },
  { id: 3, label: "Review" },
];

export function AddInspectionDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: AddInspectionDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh, re-running this.
  const [form, setForm] = useState<InspectionForm>(() =>
    record
      ? recordToForm(record)
      : EMPTY_INSPECTION_FORM(),
  );
  const [submitting, setSubmitting] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
    ]).then(([v, d]) => {
      setVehicles(v.vehicles ?? []);
      setDrivers(d.drivers ?? []);
    }).catch(() => toast.error("Couldn't load fleet/roster data"));
  }, []);

  const update = <K extends keyof InspectionForm>(k: K, v: InspectionForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // When inspection type changes, replace checklist
  const handleTypeChange = (type: string) => {
    setForm((s) => ({ ...s, type, checklist: getChecklistTemplate(type) }));
  };

  const updateChecklistItem = (id: string, result: ChecklistItemResult) =>
    setForm((s) => ({
      ...s,
      checklist: s.checklist.map((c) => (c.id === id ? { ...c, result } : c)),
    }));

  const updateChecklistNotes = (id: string, notes: string) =>
    setForm((s) => ({
      ...s,
      checklist: s.checklist.map((c) => (c.id === id ? { ...c, notes } : c)),
    }));

  const handlePhoto = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setForm((s) => ({
        ...s,
        checklist: s.checklist.map((c) =>
          c.id === id
            ? { ...c, photoName: f.name, photoSize: `${(f.size / 1024 / 1024).toFixed(2)} MB` }
            : c,
        ),
      }));
      toast.success("Photo attached", { description: f.name });
    }
  };

  const errors: string[] = [];
  if (step === 1) {
    if (!form.vehicle) errors.push("Vehicle is required");
    if (!form.inspector.trim()) errors.push("Inspector is required");
    if (!form.odometer || Number(form.odometer) < 0) errors.push("Odometer reading is required");
  }
  if (step === 2) {
    const pending = form.checklist.filter((c) => c.result === "Pending").length;
    if (pending > 0) errors.push(`${pending} checklist item${pending === 1 ? "" : "s"} still pending review`);
    const failNoNotes = form.checklist.filter((c) => c.result === "Fail" && !c.notes?.trim()).length;
    if (failNoNotes > 0) errors.push(`${failNoNotes} failed item${failNoNotes === 1 ? "" : "s"} missing failure notes`);
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

  const handleSubmit = async () => {
    const result = computeResult(form.checklist);
    const payload = formToData(form);
    setSubmitting(true);
    let ok = true;
    if (record && onUpdate) {
      ok = await onUpdate(record.id, payload);
      if (ok) {
        toast.success(`Inspection ${record.inspectionId} updated`, {
          description: `Result: ${result} · ${form.checklist.length} items · ${form.vehicle}`,
        });
      }
    } else if (onAdd) {
      const newId = `RZ-INS-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
      const newInspection: Inspection = {
        id: `insp-${Date.now()}`,
        inspectionId: newId,
        type: payload.type ?? "Pre-Trip",
        vehicle: payload.vehicle ?? "",
        driver: payload.driver,
        inspector: payload.inspector ?? "Unknown",
        date: payload.date ?? new Date().toISOString(),
        result: payload.result ?? "Pass",
        odometer: payload.odometer ?? 0,
        linkedIssues: 0,
      };
      ok = await onAdd(newInspection);
      if (ok) {
        toast.success(`Inspection ${newId} created`, {
          description: `Result: ${result} · ${form.checklist.length} items · ${form.vehicle}`,
        });
      }
    }
    setSubmitting(false);
    if (!ok) return; // onAdd/onUpdate already surfaced their own error toast
    setStep(1);
    setForm(EMPTY_INSPECTION_FORM());
    onClose();
  };

  const toInputDate = (iso: string) => iso.slice(0, 10);
  const previewResult = computeResult(form.checklist);
  const passCount = form.checklist.filter((c) => c.result === "Pass").length;
  const failCount = form.checklist.filter((c) => c.result === "Fail").length;
  const naCount = form.checklist.filter((c) => c.result === "N/A").length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Inspection" : "New Inspection"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update inspection details and checklist"
                : "3 steps · run checklist · auto-create issues on failure"}
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
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors",
                        active || done ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span className={cn("hidden text-[12px] font-medium md:inline", active ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn("h-px w-6", step > s.id ? "bg-foreground" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Vehicle & Type */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vehicle & Type</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Vehicle</FieldLabel>
                    <Select value={form.vehicle || "none"} onValueChange={(v) => update("vehicle", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select vehicle -</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.name}>
                            {v.name} · {v.licensePlate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Inspection Type</FieldLabel>
                    <Select value={form.type} onValueChange={handleTypeChange}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSPECTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
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

                  <div className="sm:col-span-2">
                    <FieldLabel hint="optional">Driver</FieldLabel>
                    <Select value={form.driver || "none"} onValueChange={(v) => update("driver", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not assigned -</SelectItem>
                        {drivers.filter((d) => d.role === "Driver").map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name} · {d.licenseNumber || "-"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Inspector</FieldLabel>
                    <Input
                      value={form.inspector}
                      onChange={(e) => update("inspector", e.target.value)}
                      placeholder="e.g. Inspector Iyer"
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>

                  <div>
                    <FieldLabel required hint="km">Odometer</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={form.odometer}
                      onChange={(e) => update("odometer", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Checklist Preview</span>
                </div>
                <p className="mt-1.5 text-[13px] text-foreground">
                  {form.checklist.length} items across {Array.from(new Set(form.checklist.map((c) => c.section))).length} sections will be loaded for {form.type} inspection.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Checklist */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{form.type} Checklist</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular">
                    <span>{passCount} pass</span>
                    <span>{failCount} fail</span>
                    <span>{naCount} n/a</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {Object.entries(
                    form.checklist.reduce<Record<string, typeof form.checklist>>((acc, c) => {
                      (acc[c.section] = acc[c.section] || []).push(c);
                      return acc;
                    }, {}),
                  ).map(([section, items]) => (
                    <div key={section}>
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{section}</div>
                      <div className="flex flex-col gap-2">
                        {items.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "rounded-[5px] border px-3 py-2.5",
                              c.result === "Fail" ? "border-foreground bg-foreground/[0.03]" : "border-border bg-background",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[13px] text-foreground">{c.label}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <ChecklistBtn
                                  active={c.result === "Pass"}
                                  variant="pass"
                                  onClick={() => updateChecklistItem(c.id, c.result === "Pass" ? "Pending" : "Pass")}
                                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                  label="Pass"
                                />
                                <ChecklistBtn
                                  active={c.result === "Fail"}
                                  variant="fail"
                                  onClick={() => updateChecklistItem(c.id, c.result === "Fail" ? "Pending" : "Fail")}
                                  icon={<XCircle className="h-3.5 w-3.5" />}
                                  label="Fail"
                                />
                                <ChecklistBtn
                                  active={c.result === "N/A"}
                                  variant="na"
                                  onClick={() => updateChecklistItem(c.id, c.result === "N/A" ? "Pending" : "N/A")}
                                  icon={<CircleSlash className="h-3.5 w-3.5" />}
                                  label="N/A"
                                />
                              </div>
                            </div>
                            {c.result === "Fail" && (
                              <div className="mt-2.5 flex flex-col gap-2">
                                <Textarea
                                  value={c.notes || ""}
                                  onChange={(e) => updateChecklistNotes(c.id, e.target.value)}
                                  placeholder="Describe the failure - required for issue auto-creation…"
                                  className="min-h-[60px] rounded-[5px] text-[12px] bg-background"
                                />
                                <label className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-dashed border-border px-3 py-2 hover:border-foreground/30 hover:bg-accent/30 transition-colors">
                                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-[12px] text-foreground">
                                    {c.photoName ? c.photoName : "Attach evidence photo"}
                                  </span>
                                  {c.photoName && c.photoSize && (
                                    <span className="text-[11px] text-muted-foreground tabular ml-auto">{c.photoSize}</span>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhoto(c.id, e)}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Inspection Summary</span>
                  <span className="text-[11px] text-muted-foreground tabular">{formatDate(form.date)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Vehicle" value={form.vehicle || "-"} />
                  <ReviewRow label="Driver" value={form.driver || "-"} />
                  <ReviewRow label="Inspector" value={form.inspector} />
                  <ReviewRow label="Type" value={form.type} />
                  <ReviewRow label="Odometer" value={`${formatNumber(Number(form.odometer) || 0)} km`} mono />
                  <ReviewRow label="Date" value={formatDate(form.date)} mono />
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Checklist Result</span>
                  <span
                    className={cn(
                      "rounded-[3px] border px-2 py-0.5 text-[11px] font-medium",
                      previewResult === "Pass" && "border-border text-foreground",
                      previewResult === "Fail" && "border-foreground bg-foreground text-background",
                      previewResult === "Conditional" && "border-transparent bg-muted text-muted-foreground",
                    )}
                  >
                    {previewResult}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ReviewStat label="Passed" value={`${passCount}/${form.checklist.length}`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                  <ReviewStat label="Failed" value={`${failCount}/${form.checklist.length}`} icon={<XCircle className="h-3.5 w-3.5" />} />
                  <ReviewStat label="N/A" value={`${naCount}/${form.checklist.length}`} icon={<CircleSlash className="h-3.5 w-3.5" />} />
                </div>
                {failCount > 0 && (
                  <div className="mt-3 rounded-[5px] border border-foreground/30 bg-foreground/[0.04] px-3 py-2.5 text-[12px] text-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{failCount} failed item{failCount === 1 ? "" : "s"} will be auto-escalated</p>
                        <p className="text-muted-foreground mt-0.5">Issues will be created and linked back to this inspection.</p>
                      </div>
                    </div>
                  </div>
                )}
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
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of 3
          </div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
              {record ? "Save Changes" : "Create Inspection"}
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

function ChecklistBtn({
  active,
  variant,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  variant: "pass" | "fail" | "na";
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium transition-colors",
        !active && "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        active && variant === "pass" && "border-border bg-muted text-foreground",
        active && variant === "fail" && "border-foreground bg-foreground text-background",
        active && variant === "na" && "border-border bg-background text-muted-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function ReviewStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <span className="text-[16px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}
