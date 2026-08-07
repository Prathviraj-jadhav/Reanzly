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
  Package,
  User,
  Wrench,
  Plus,
  Trash2,
  Coins,
  Clock,
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
import type { WorkOrder, Priority, Vehicle, Vendor, Driver } from "@/lib/types";
import {
  WORK_ORDER_TYPES,
  PRIORITIES,
  EMPTY_WO_FORM,
  EMPTY_PART_ROW,
  type WorkOrderForm,
  type PartRow,
  FieldLabel,
  toInputDate,
  formatINR,
  formatDate,
  computePartsTotal,
} from "./_helpers";

interface AddWorkOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: WorkOrder;
  onAdd?: (workOrder: WorkOrder) => Promise<boolean>;
  onUpdate?: (id: string, data: Partial<WorkOrder>) => Promise<boolean>;
}

function recordToForm(record: WorkOrder): WorkOrderForm {
  return {
    ...EMPTY_WO_FORM(),
    title: record.title,
    vehicle: record.vehicle,
    workType: record.type,
    priority: record.priority,
    vendor: record.vendor || "",
    technician: record.technician || "",
    createdDate: record.createdDate,
    estimatedCompletion: record.estimatedCompletion || "",
    parts: [{ ...EMPTY_PART_ROW }],
  };
}

function formToData(form: WorkOrderForm, existing?: WorkOrder): Partial<WorkOrder> {
  const partsTotal = computePartsTotal(form.parts);
  const laborHours = Number(form.laborHours) || 0;
  const laborCost = laborHours * 350;
  const computed = partsTotal + laborCost;
  return {
    title: form.title,
    vehicle: form.vehicle,
    type: form.workType as WorkOrder["type"],
    priority: form.priority as Priority,
    vendor: form.vendor || undefined,
    technician: form.technician || undefined,
    createdDate: form.createdDate,
    estimatedCompletion: form.estimatedCompletion || undefined,
    estimatedCost: computed > 0 ? computed : existing?.estimatedCost || 0,
  };
}

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Parts & Labor" },
  { id: 3, label: "Review" },
];

export function AddWorkOrderDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: AddWorkOrderDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh each time.
  const [form, setForm] = useState<WorkOrderForm>(() =>
    record ? recordToForm(record) : EMPTY_WO_FORM(),
  );
  const [submitting, setSubmitting] = useState(false);

  // Real vehicles/vendors/drivers (src/app/api/*) - this drawer's pickers
  // previously pulled from src/lib/mock-data.ts, disconnected from any
  // real fleet/roster data.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : { vendors: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
    ]).then(([v, ven, drv]) => {
      setVehicles(v.vehicles ?? []);
      setVendors(ven.vendors ?? []);
      setDrivers(drv.drivers ?? []);
    }).catch(() => toast.error("Couldn't load fleet/vendor/roster data"));
  }, []);

  const update = <K extends keyof WorkOrderForm>(k: K, v: WorkOrderForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (step === 1) {
    if (!form.title.trim()) errors.push("Title is required");
    if (!form.vehicle) errors.push("Vehicle is required");
    if (!form.workType) errors.push("Work type is required");
  }
  if (step === 2) {
    const invalidParts = form.parts.filter((p) => p.part && (!p.qty || Number(p.qty) <= 0));
    if (invalidParts.length > 0) errors.push(`${invalidParts.length} part row${invalidParts.length === 1 ? "" : "s"} missing valid quantity`);
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

  const addPartRow = () =>
    setForm((s) => ({ ...s, parts: [...s.parts, { ...EMPTY_PART_ROW }] }));

  const removePartRow = (idx: number) =>
    setForm((s) => ({ ...s, parts: s.parts.filter((_, i) => i !== idx) }));

  const updatePartRow = (idx: number, field: keyof PartRow, value: string) =>
    setForm((s) => ({
      ...s,
      parts: s.parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));

  const handleSubmit = async () => {
    const payload = formToData(form, record);
    setSubmitting(true);
    let ok = true;
    if (record && onUpdate) {
      ok = await onUpdate(record.id, payload);
      if (ok) {
        toast.success(`Work order ${record.workOrderId} updated`, {
          description: `${form.workType} · ${form.priority} · ${form.vehicle}`,
        });
      }
    } else if (onAdd) {
      const newId = `RZ-WO-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
      const newWorkOrder: WorkOrder = {
        id: `wo-${Date.now()}`,
        workOrderId: newId,
        title: payload.title ?? "",
        vehicle: payload.vehicle ?? "",
        type: payload.type ?? "Unscheduled",
        priority: payload.priority ?? "Medium",
        vendor: payload.vendor,
        technician: payload.technician,
        status: "Open",
        createdDate: payload.createdDate ?? new Date().toISOString(),
        estimatedCompletion: payload.estimatedCompletion,
        estimatedCost: payload.estimatedCost ?? 0,
      };
      ok = await onAdd(newWorkOrder);
      if (ok) {
        toast.success(`Work order ${newId} created`, {
          description: `${form.workType} · ${form.priority} · ${form.vehicle}`,
        });
      }
    }
    setSubmitting(false);
    if (!ok) return; // onAdd/onUpdate already surfaced their own error toast
    setStep(1);
    setForm(EMPTY_WO_FORM());
    onClose();
  };

  const partsTotal = computePartsTotal(form.parts);
  const laborHours = Number(form.laborHours) || 0;
  const laborCost = laborHours * 350;
  const totalCost = partsTotal + laborCost;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Work Order" : "New Work Order"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update work order details and cost estimate"
                : "3 steps · add parts rows · auto-compute cost estimate"}
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
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Work Order Details</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Title</FieldLabel>
                    <Input
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="e.g. Brake overhaul"
                      className="h-8 rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel hint="optional">Description</FieldLabel>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Describe the work scope, symptoms, and required outcome…"
                      className="min-h-[70px] rounded-[5px] text-[13px]"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Vehicle</FieldLabel>
                    <Select value={form.vehicle || "none"} onValueChange={(v) => update("vehicle", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select vehicle -</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.name}>{v.name} · {v.licensePlate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Work Type</FieldLabel>
                    <Select value={form.workType} onValueChange={(v) => update("workType", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_ORDER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Priority</FieldLabel>
                    <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel hint="optional">Vendor</FieldLabel>
                    <Select value={form.vendor || "none"} onValueChange={(v) => update("vendor", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not assigned -</SelectItem>
                        {vendors.filter((v) => v.type === "Maintenance Workshop" || v.type === "Spare Parts Supplier").map((v) => (
                          <SelectItem key={v.id} value={v.companyName}>{v.companyName} · {v.city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel hint="optional">Technician</FieldLabel>
                    <Select value={form.technician || "none"} onValueChange={(v) => update("technician", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Not assigned -</SelectItem>
                        {drivers.filter((d) => d.department === "Maintenance" || d.role === "Staff").slice(0, 12).map((d) => (
                          <SelectItem key={d.id} value={d.name}>{d.name} · {d.department}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Created Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.createdDate)}
                      onChange={(e) => update("createdDate", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="optional">Est. Completion</FieldLabel>
                    <Input
                      type="date"
                      value={form.estimatedCompletion ? toInputDate(form.estimatedCompletion) : ""}
                      onChange={(e) => update("estimatedCompletion", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Parts & Labor */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Parts Required</span>
                  </div>
                  <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={addPartRow}>Add Row</Btn>
                </div>

                <div className="flex flex-col gap-2">
                  {form.parts.map((part, idx) => (
                    <div key={idx} className="rounded-[5px] border border-border bg-background p-2.5">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 sm:col-span-4">
                          <Input
                            value={part.part}
                            onChange={(e) => updatePartRow(idx, "part", e.target.value)}
                            placeholder="Part name"
                            className="h-7 rounded-[4px] text-[12px]"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <Input
                            value={part.number}
                            onChange={(e) => updatePartRow(idx, "number", e.target.value)}
                            placeholder="Part #"
                            className="h-7 rounded-[4px] text-[12px] tabular"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <Input
                            type="number"
                            min="1"
                            value={part.qty}
                            onChange={(e) => updatePartRow(idx, "qty", e.target.value)}
                            placeholder="Qty"
                            className="h-7 rounded-[4px] text-[12px] tabular"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            value={part.cost}
                            onChange={(e) => updatePartRow(idx, "cost", e.target.value)}
                            placeholder="Unit cost ₹"
                            className="h-7 rounded-[4px] text-[12px] tabular"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input
                            value={part.supplier}
                            onChange={(e) => updatePartRow(idx, "supplier", e.target.value)}
                            placeholder="Supplier"
                            className="h-7 rounded-[4px] text-[12px]"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                          <button
                            onClick={() => removePartRow(idx)}
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {part.part && part.qty && part.cost && (
                        <div className="mt-2 text-right text-[11px] text-muted-foreground tabular">
                          Line total: <span className="text-foreground font-medium">{formatINR(Number(part.qty) * Number(part.cost))}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex justify-end">
                  <div className="text-[12px] text-muted-foreground tabular">
                    Parts total: <span className="text-foreground font-medium">{formatINR(partsTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Labor</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel hint="hours">Labor Hours</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.laborHours}
                      onChange={(e) => update("laborHours", e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="auto">Labor Cost</FieldLabel>
                    <div className="flex h-8 items-center rounded-[5px] border border-border bg-muted/40 px-3 text-[13px] tabular text-muted-foreground">
                      {formatINR(laborCost)} <span className="text-[11px] ml-1">@ ₹350/h</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
                </div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Internal notes for technicians, supervisors…"
                  className="min-h-[60px] rounded-[5px] text-[13px]"
                />
              </div>

              <div className="rounded-[6px] border border-foreground/30 bg-foreground/[0.03] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Estimated Total</span>
                </div>
                <span className="text-[20px] tabular font-medium text-foreground">{formatINR(totalCost)}</span>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Work Order Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Title" value={form.title} />
                  <ReviewRow label="Work Type" value={form.workType} />
                  <ReviewRow label="Priority" value={form.priority} />
                  <ReviewRow label="Vehicle" value={form.vehicle} />
                  <ReviewRow label="Vendor" value={form.vendor || "-"} />
                  <ReviewRow label="Technician" value={form.technician || "-"} />
                  <ReviewRow label="Created" value={formatDate(form.createdDate)} mono />
                  <ReviewRow label="Est. Completion" value={form.estimatedCompletion ? formatDate(form.estimatedCompletion) : "-"} mono />
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Parts & Labor</span>
                  <span className="text-[11px] text-muted-foreground tabular">{form.parts.filter((p) => p.part).length} parts · {form.laborHours || 0}h labor</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ReviewStat label="Parts Cost" value={formatINR(partsTotal)} />
                  <ReviewStat label="Labor Cost" value={formatINR(laborCost)} />
                  <ReviewStat label="Total Estimate" value={formatINR(totalCost)} />
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
              {submitting ? "Saving…" : record ? "Save Changes" : "Create Work Order"}
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

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <span className="text-[16px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}
