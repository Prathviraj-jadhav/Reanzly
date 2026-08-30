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
  Bug,
  Camera,
  FileText,
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
import type { Issue, IssueSeverity, Vehicle, Driver, Inspection } from "@/lib/types";
import {
  ISSUE_SEVERITIES,
  ISSUE_SOURCES,
  EMPTY_ISSUE_FORM,
  type IssueForm,
  FieldLabel,
  toInputDate,
  formatDate,
} from "./_helpers";

interface AddIssueDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: Issue;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  inspections?: Inspection[];
  onAdd?: (issue: Issue) => Promise<boolean>;
  onUpdate?: (id: string, data: Partial<Issue>) => Promise<boolean>;
}

function recordToForm(record: Issue): IssueForm {
  return {
    ...EMPTY_ISSUE_FORM,
    title: record.title,
    description: record.description,
    severity: record.severity,
    vehicle: record.vehicle || "",
    reporter: record.reporter,
    assignee: record.assignee,
    source: record.source,
  };
}

function formToData(form: IssueForm): Partial<Issue> {
  return {
    title: form.title,
    description: form.description,
    severity: form.severity as IssueSeverity,
    vehicle: form.vehicle || undefined,
    assignee: form.assignee,
    source: form.source as Issue["source"],
    reporter: form.reporter,
  };
}

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Assignment" },
  { id: 3, label: "Review" },
];

export function AddIssueDrawer({ open, onClose, record, vehicles = [], drivers = [], inspections = [], onAdd, onUpdate }: AddIssueDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh each time.
  const [form, setForm] = useState<IssueForm>(() =>
    record ? recordToForm(record) : EMPTY_ISSUE_FORM,
  );
  const [submitting, setSubmitting] = useState(false);



  const update = <K extends keyof IssueForm>(k: K, v: IssueForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (step === 1) {
    if (!form.title.trim()) errors.push("Title is required");
    if (!form.description.trim()) errors.push("Description is required");
    if (!form.severity) errors.push("Severity is required");
  }
  if (step === 2) {
    if (!form.vehicle) errors.push("Vehicle is required");
    if (!form.assignee.trim()) errors.push("Assignee is required");
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

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      update("photoName", f.name);
      update("photoSize", `${(f.size / 1024 / 1024).toFixed(2)} MB`);
      toast.success("Photo attached", { description: f.name });
    }
  };

  const handleSubmit = async () => {
    const payload = formToData(form);
    setSubmitting(true);
    let ok = true;
    if (record && onUpdate) {
      ok = await onUpdate(record.id, payload);
      if (ok) {
        toast.success(`Issue ${record.issueId} updated`, {
          description: `${form.severity} · ${form.vehicle || "-"} · assigned to ${form.assignee}`,
        });
      }
    } else if (onAdd) {
      const newId = `RZ-ISS-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
      const newIssue: Issue = {
        id: `issue-${Date.now()}`,
        issueId: newId,
        title: payload.title ?? "",
        severity: payload.severity ?? "Medium",
        vehicle: payload.vehicle,
        reporter: payload.reporter ?? "Unknown",
        assignee: payload.assignee ?? "Unassigned",
        status: "Open",
        createdDate: new Date().toISOString(),
        source: payload.source ?? "Manual",
        description: payload.description ?? "",
      };
      ok = await onAdd(newIssue);
      if (ok) {
        toast.success(`Issue ${newId} raised`, {
          description: `${form.severity} · ${form.vehicle || "-"} · assigned to ${form.assignee}`,
        });
      }
    }
    setSubmitting(false);
    if (!ok) return; // onAdd/onUpdate already surfaced their own error toast
    setStep(1);
    setForm(EMPTY_ISSUE_FORM);
    onClose();
  };

  const linkedInspections = useMemo(
    () => (form.vehicle ? inspections.filter((i) => i.vehicle === form.vehicle) : []),
    [form.vehicle, inspections],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Issue" : "New Issue"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update issue details and assignment"
                : "3 steps · capture details · auto-route to assignee"}
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

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Issue Details</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <FieldLabel required>Title</FieldLabel>
                    <Input
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="e.g. Brake pad wear exceeding limit"
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Description</FieldLabel>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Describe what was observed, when, and any context…"
                      className="min-h-[80px] rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Severity</FieldLabel>
                      <Select value={form.severity} onValueChange={(v) => update("severity", v)}>
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_SEVERITIES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel required>Source</FieldLabel>
                      <Select value={form.source} onValueChange={(v) => update("source", v)}>
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Evidence Photo</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-foreground/30 hover:bg-accent/30">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Click to upload</span>
                  <span className="text-[11px] text-muted-foreground">JPG, PNG · up to 10 MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
                {form.photoName && (
                  <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-[12px] text-foreground">{form.photoName}</span>
                    </div>
                    <span className="tabular text-[11px] text-muted-foreground">{form.photoSize}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Assignment */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Linked Vehicle</span>
                </div>
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

                {linkedInspections.length > 0 && (
                  <div className="mt-3">
                    <FieldLabel hint="optional">Related Inspection</FieldLabel>
                    <Select
                      value={form.relatedInspection || "none"}
                      onValueChange={(v) => update("relatedInspection", v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select inspection" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not linked -</SelectItem>
                        {linkedInspections.map((i) => (
                          <SelectItem key={i.id} value={i.inspectionId}>
                            {i.inspectionId} · {i.type} · {formatDate(i.date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Assignment</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Reporter</FieldLabel>
                    <Input
                      value={form.reporter}
                      onChange={(e) => update("reporter", e.target.value)}
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Assignee</FieldLabel>
                    <Select value={form.assignee || "none"} onValueChange={(v) => update("assignee", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select assignee -</SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name} · {d.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel hint="optional">Due Date</FieldLabel>
                    <Input
                      type="date"
                      value={form.dueDate ? toInputDate(form.dueDate) : ""}
                      onChange={(e) => update("dueDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="h-8 rounded-[5px] text-[12px] tabular"
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
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Issue Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Title" value={form.title} />
                  <ReviewRow label="Severity" value={form.severity} />
                  <ReviewRow label="Source" value={form.source} />
                  <ReviewRow label="Vehicle" value={form.vehicle || "-"} />
                  <ReviewRow label="Reporter" value={form.reporter} />
                  <ReviewRow label="Assignee" value={form.assignee || "-"} />
                  <ReviewRow label="Due Date" value={form.dueDate ? formatDate(form.dueDate) : "-"} mono />
                  <ReviewRow label="Photo" value={form.photoName ? "Attached" : "None"} />
                </div>
                {form.description && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                    <p className="text-[13px] text-foreground leading-relaxed">{form.description}</p>
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
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 3</div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : record ? "Save Changes" : "Raise Issue"}
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
