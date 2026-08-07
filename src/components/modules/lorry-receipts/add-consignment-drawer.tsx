"use client";
import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput } from "@/components/shared/savage-input";
import { Autocomplete, type AutocompleteOption } from "@/components/shared/autocomplete";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LorryReceipt, FreightTerm, Customer, Vendor, Trip } from "@/lib/types";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Building2,
  Coins,
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
  CONSIGNMENT_STEPS,
  EMPTY_CONSIGNMENT,
  CONSIGNMENT_DOC_TYPES,
  CONSIGNMENT_PAY_TYPES,
  generateConsignmentNumber,
  formatINR,
  type ConsignmentForm,
} from "../trips/_helpers";
import { LR_STATUSES, FREIGHT_TERMS } from "./_helpers";

/**
 * Extended form carrying the LR-specific editable fields that aren't part
 * of the shared ConsignmentForm wizard. When `record` is provided these are
 * pre-filled from the LorryReceipt; on submit they're merged back into the
 * update payload.
 */
interface ExtendedForm extends ConsignmentForm {
  date: string;
  status: LorryReceipt["status"];
  eWayBill: string;
  freightAmount: string;
  freightTerm: FreightTerm;
}

function emptyExtendedForm(): ExtendedForm {
  return {
    ...EMPTY_CONSIGNMENT,
    consignmentNumber: generateConsignmentNumber(Math.floor(Math.random() * 900) + 100),
    date: new Date().toISOString().slice(0, 10),
    status: "Generated",
    eWayBill: "",
    freightAmount: "",
    freightTerm: "Paid",
  };
}

function fromRecord(record: LorryReceipt): ExtendedForm {
  return {
    ...EMPTY_CONSIGNMENT,
    documentType: "LR",
    against: record.tripId,
    payType: "Paid",
    consignmentNumber: record.lrNumber,
    consignee: record.consignee,
    consignor: record.consignor,
    billingParty: "",
    source: record.origin,
    viaPoints: "",
    destination: record.destination,
    containerNumber: "",
    markNumber: "",
    sealNumber: "",
    date: record.date.slice(0, 10),
    status: record.status,
    eWayBill: record.eWayBill ?? "",
    freightAmount: String(record.freightAmount ?? ""),
    freightTerm: record.freightTerm,
  };
}

interface AddConsignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided the drawer operates in edit mode for this LR. */
  record?: LorryReceipt;
  /** Create callback - persists the new LR via the real API. Resolves false
   * (not a throw) on failure - the caller already surfaces its own error
   * toast. */
  onAdd?: (lr: LorryReceipt) => Promise<boolean>;
  /** Called with the updated editable fields when submitting in edit mode. */
  onUpdate?: (id: string, data: Partial<LorryReceipt>) => Promise<boolean>;
}

export function AddConsignmentDrawer({ open, onClose, record, onAdd, onUpdate }: AddConsignmentDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ExtendedForm>(emptyExtendedForm);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => (r.ok ? r.json() : { customers: [] })),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : { vendors: [] })),
      fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
    ]).then(([c, v, t]) => {
      setCustomers(c.customers ?? []);
      setVendors(v.vendors ?? []);
      setTrips(t.trips ?? []);
    }).catch(() => toast.error("Couldn't load customer/vendor/trip data"));
  }, []);

  // Pre-fill from record whenever the drawer opens with a record.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && record) {
      setForm(fromRecord(record));
      setStep(1);
    } else if (open && !record) {
      setForm(emptyExtendedForm());
      setStep(1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, record?.id]);

  const update = <K extends keyof ExtendedForm>(k: K, v: ExtendedForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const jobOrderOptions: AutocompleteOption[] = useMemo(
    () => trips.map((t) => ({ value: t.tripId, label: t.tripId, hint: `${t.origin} → ${t.destination}` })),
    [trips],
  );

  const partyOptions: AutocompleteOption[] = useMemo(() => {
    const set: AutocompleteOption[] = [];
    const seen = new Set<string>();
    const push = (label: string, hint: string, kind: string) => {
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      set.push({ value: label, label, hint: `${hint} · ${kind}` });
    };
    customers.forEach((c) => push(c.companyName, c.city, "Customer"));
    vendors.forEach((v) => push(v.companyName, v.city, "Vendor"));
    return set;
  }, [customers, vendors]);

  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    // Step 1 - Document
    const s1: string[] = [];
    if (!form.against.trim()) s1.push("Against (Job Order #) is required");
    if (!form.consignmentNumber.trim()) s1.push("Consignment number is required");
    if (!form.consignor.trim()) s1.push("Consignor is required");
    if (!form.consignee.trim()) s1.push("Consignee is required");
    if (s1.length) errors[1] = s1;
    // Step 2 - Route
    const s2: string[] = [];
    if (!form.source.trim()) s2.push("Source is required");
    if (!form.destination.trim()) s2.push("Destination is required");
    if (s2.length) errors[2] = s2;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === CONSIGNMENT_STEPS.length;
  const canAdvance = currentErrors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", { description: currentErrors[0] || "Resolve errors on this step" });
      return;
    }
    if (step < CONSIGNMENT_STEPS.length) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const goTo = (s: number) => {
    if (s < step) {
      setStep(s);
      return;
    }
    for (let i = step; i < s; i++) {
      if (stepErrors[i]?.length) {
        toast("Complete step " + i + " first", { description: stepErrors[i][0] });
        setStep(i);
        return;
      }
    }
    setStep(s);
  };

  const handleSubmit = async () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    setSubmitting(true);
    let ok = true;
    if (record && onUpdate) {
      ok = await onUpdate(record.id, {
        lrNumber: form.consignmentNumber,
        tripId: form.against,
        consignor: form.consignor,
        consignee: form.consignee,
        origin: form.source,
        destination: form.destination,
        date: new Date(form.date).toISOString(),
        status: form.status,
        eWayBill: form.eWayBill.trim() || undefined,
        freightAmount: Number(form.freightAmount) || 0,
        freightTerm: form.freightTerm,
      });
      if (ok) {
        toast.success("Lorry Receipt updated", {
          description: `${form.consignmentNumber} · ${form.source} → ${form.destination}`,
        });
      }
      setSubmitting(false);
      if (!ok) return;
      onClose();
      return;
    }
    if (onAdd) {
      const newLr: LorryReceipt = {
        id: `lr-${Date.now()}`,
        lrNumber: form.consignmentNumber,
        tripId: form.against,
        consignor: form.consignor,
        consignee: form.consignee,
        origin: form.source,
        destination: form.destination,
        date: new Date(form.date).toISOString(),
        status: form.status as LorryReceipt["status"],
        eWayBill: form.eWayBill.trim() || undefined,
        freightAmount: Number(form.freightAmount) || 0,
        freightTerm: form.freightTerm as FreightTerm,
      };
      ok = await onAdd(newLr);
      setSubmitting(false);
      if (!ok) return; // onAdd already surfaced its own error toast
      toast.success("Consignment created", {
        description: `${form.consignmentNumber} · ${form.documentType} · ${form.source} → ${form.destination}`,
      });
      setStep(1);
      setForm(emptyExtendedForm());
      onClose();
      return;
    }
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit Lorry Receipt" : "Add Consignment"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? `Editing ${record.lrNumber} · ${record.origin} → ${record.destination}`
                : `Three steps · auto-saved as draft · ${form.consignmentNumber || "-"}`}
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
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {CONSIGNMENT_STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const errored = stepErrors[s.id]?.length && step <= s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => goTo(s.id)}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors",
                        (active || done) && "border-foreground bg-foreground text-background",
                        !active && !done && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[12px] font-medium md:inline",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    {errored && <AlertCircle className="h-3 w-3 text-foreground" />}
                  </button>
                  {i < CONSIGNMENT_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-4",
                        step > s.id ? "bg-foreground" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {step === 1 && (
            <>
              <Step1Document form={form} update={update} jobOrderOptions={jobOrderOptions} partyOptions={partyOptions} customerCount={customers.length} vendorCount={vendors.length} />
              {record && (
                <div className="mt-4 rounded-[6px] border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">LR & Freight</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldGroup label="LR Date" required>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => update("date", e.target.value)}
                        className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                      />
                    </FieldGroup>
                    <FieldGroup label="Status">
                      <Select value={form.status} onValueChange={(v) => update("status", v as ExtendedForm["status"])}>
                        <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LR_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-[13px]">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup label="Freight Term">
                      <Select value={form.freightTerm} onValueChange={(v) => update("freightTerm", v as FreightTerm)}>
                        <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREIGHT_TERMS.map((t) => (
                            <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup label="Freight Amount" hint="₹">
                      <SavageInput
                        category="amount"
                        type="number"
                        value={form.freightAmount}
                        onChange={(e) => update("freightAmount", e.target.value)}
                        className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
                        placeholder=""
                      />
                    </FieldGroup>
                    <div className="sm:col-span-2">
                      <FieldGroup label="eWay Bill Number">
                        <SavageInput
                          category="consignmentNumber"
                          value={form.eWayBill}
                          onChange={(e) => update("eWayBill", e.target.value)}
                          className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
                          placeholder=""
                        />
                      </FieldGroup>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {step === 2 && <Step2Route form={form} update={update} />}
          {step === 3 && <Step3Review form={form} stepErrors={stepErrors} />}
        </div>

        {/* Validation strip */}
        {currentErrors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{currentErrors[0]}</span>
              {currentErrors.length > 1 && (
                <span className="text-muted-foreground">· {currentErrors.length - 1} more</span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn
            variant="ghost"
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            onClick={goBack}
            disabled={step === 1}
          >
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of {CONSIGNMENT_STEPS.length}
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : record ? "Save Changes" : "Create Consignment"}
            </Btn>
          ) : (
            <Btn
              variant="primary"
              onClick={goNext}
              disabled={!canAdvance}
              iconRight={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Continue
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Shared field components =====
function FieldGroup({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </Label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ===== Step 1: Document =====
function Step1Document({
  form,
  update,
  jobOrderOptions,
  partyOptions,
  customerCount,
  vendorCount,
}: {
  form: ExtendedForm;
  update: <K extends keyof ExtendedForm>(k: K, v: ExtendedForm[K]) => void;
  jobOrderOptions: AutocompleteOption[];
  partyOptions: AutocompleteOption[];
  customerCount: number;
  vendorCount: number;
}) {
  return (
    <StepShell
      icon={<FileText className="h-4 w-4" />}
      title="Document"
      subtitle="Document type, linked job order, payment terms and parties."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Document Type">
          <Select value={form.documentType} onValueChange={(v) => update("documentType", v as ConsignmentForm["documentType"])}>
            <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSIGNMENT_DOC_TYPES.map((d) => (
                <SelectItem key={d} value={d} className="text-[13px]">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup label="Against (Job Order #)" required>
          <Autocomplete
            value={form.against}
            onChange={(v) => update("against", v)}
            options={jobOrderOptions}
            placeholder="Search job order…"
            emptyText="No job order found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Payment Type">
          <Select value={form.payType} onValueChange={(v) => update("payType", v as ConsignmentForm["payType"])}>
            <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSIGNMENT_PAY_TYPES.map((p) => (
                <SelectItem key={p} value={p} className="text-[13px]">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup label="Consignment Number" required hint="Auto-generated · editable">
          <SavageInput
            category="consignmentNumber"
            value={form.consignmentNumber}
            onChange={(e) => update("consignmentNumber", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            placeholder=""
          />
        </FieldGroup>
        <FieldGroup label="Consignor" required>
          <Autocomplete
            value={form.consignor}
            onChange={(v) => update("consignor", v)}
            options={partyOptions}
            placeholder="Search party…"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
        <FieldGroup label="Consignee" required>
          <Autocomplete
            value={form.consignee}
            onChange={(v) => update("consignee", v)}
            options={partyOptions}
            placeholder="Search party…"
            emptyText="No party found"
            className="h-8"
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="Billing Party">
            <Autocomplete
              value={form.billingParty}
              onChange={(v) => update("billingParty", v)}
              options={partyOptions}
              placeholder="Defaults to customer"
              emptyText="No party found"
              className="h-8"
            />
          </FieldGroup>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/20 px-3 py-2">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          Autocomplete pulls from <span className="font-medium text-foreground">{customerCount} customers</span> and{" "}
          <span className="font-medium text-foreground">{vendorCount} vendors</span> in your master.
        </span>
      </div>
    </StepShell>
  );
}

// ===== Step 2: Route =====
function Step2Route({
  form,
  update,
}: {
  form: ExtendedForm;
  update: <K extends keyof ExtendedForm>(k: K, v: ExtendedForm[K]) => void;
}) {
  return (
    <StepShell
      icon={<MapPin className="h-4 w-4" />}
      title="Route"
      subtitle="Source, via points, destination and container/seal/mark numbers."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Source" required>
          <SavageInput
            category="city"
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px]"
          />
        </FieldGroup>
        <FieldGroup label="Destination" required>
          <SavageInput
            category="city"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px]"
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="Via Points" hint="Comma-separated intermediate cities">
            <SavageInput
              category="remarks"
              value={form.viaPoints}
              onChange={(e) => update("viaPoints", e.target.value)}
              className="h-8 rounded-[5px] border-border bg-background text-[13px]"
            />
          </FieldGroup>
        </div>
        <FieldGroup label="Container Number">
          <SavageInput
            category="vehicleNumber"
            value={form.containerNumber}
            onChange={(e) => update("containerNumber", e.target.value.toUpperCase())}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
          />
        </FieldGroup>
        <FieldGroup label="Mark Number">
          <SavageInput
            category="consignmentNumber"
            value={form.markNumber}
            onChange={(e) => update("markNumber", e.target.value)}
            className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="Seal Number">
            <SavageInput
              category="vehicleNumber"
              value={form.sealNumber}
              onChange={(e) => update("sealNumber", e.target.value.toUpperCase())}
              className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
            />
          </FieldGroup>
        </div>
      </div>
    </StepShell>
  );
}

// ===== Step 3: Review =====
function Step3Review({
  form,
  stepErrors,
}: {
  form: ExtendedForm;
  stepErrors: Record<number, string[]>;
}) {
  const totalErrors = Object.values(stepErrors).flat().length;
  const passed = totalErrors === 0;

  const sections = [
    {
      title: "Document",
      icon: <FileText className="h-3.5 w-3.5" />,
      rows: [
        ["Document Type", form.documentType],
        ["Against", form.against || "-"],
        ["Payment Type", form.payType],
        ["Consignment #", form.consignmentNumber || "-"],
        ["Consignor", form.consignor || "-"],
        ["Consignee", form.consignee || "-"],
        ["Billing Party", form.billingParty || "-"],
      ],
    },
    {
      title: "Route",
      icon: <MapPin className="h-3.5 w-3.5" />,
      rows: [
        ["Source", form.source || "-"],
        ["Destination", form.destination || "-"],
        ["Via", form.viaPoints || "-"],
        ["Container #", form.containerNumber || "-"],
        ["Mark #", form.markNumber || "-"],
        ["Seal #", form.sealNumber || "-"],
      ],
    },
  ];

  return (
    <StepShell
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Review & Create"
      subtitle="Verify all details and create the consignment note."
    >
      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-[6px] border p-4",
          passed ? "border-border bg-card" : "border-foreground bg-accent/40",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border",
            passed ? "border-border" : "border-foreground",
          )}
        >
          {passed ? (
            <Check className="h-4 w-4 text-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium">
              {passed ? "Compliance passed" : `${totalErrors} compliance issue${totalErrors === 1 ? "" : "s"}`}
            </span>
            <StatusBadge variant={passed ? "outline" : "solid"} pulse={!passed}>
              {passed ? "Ready" : "Blocked"}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {passed
              ? "All required fields validated · parties linked · route confirmed."
              : "Resolve the outstanding issues on prior steps before creating this consignment."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title} className="rounded-[6px] border border-border bg-card px-4 py-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {sec.icon}
              {sec.title}
            </h4>
            <div className="space-y-1">
              {sec.rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="truncate text-right text-foreground tabular">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

// ===== Step Shell =====
function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-medium tracking-tight">{title}</h2>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// Re-export formatters for callers
export { formatINR };
