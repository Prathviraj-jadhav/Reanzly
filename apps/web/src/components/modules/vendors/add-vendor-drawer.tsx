"use client";
import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/lib/types";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  Building2,
  Wrench,
  Banknote,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ADD_VENDOR_STEPS,
  VENDOR_TYPES,
  PAYMENT_TERMS,
  PAYMENT_MODES,
  isValidGSTIN,
  gstinValidationMeta,
  EMPTY_VENDOR_FORM,
  vendorToForm,
  formToVendorPatch,
  type VendorForm,
  FieldLabel,
} from "./_helpers";

interface AddVendorDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer acts as an Edit form pre-filled from this record. */
  record?: Vendor;
  /** Create callback. Resolves false (not a throw) on failure - the caller
   * already surfaces its own error toast. */
  onAdd?: (v: Vendor) => Promise<boolean>;
  /** Edit callback - receives the record id and a patch of changed fields. */
  onUpdate?: (id: string, data: Partial<Vendor>) => Promise<boolean>;
}

const TIER_DESCRIPTIONS: Record<number, { tagline: string; tier: string }> = {
  1: { tier: "Must Have", tagline: "Required to create a vendor record" },
  2: { tier: "Need to Know", tagline: "Operational and financial context" },
  3: { tier: "Good to Have", tagline: "Context that helps your team evaluate them" },
  4: { tier: "Review", tagline: "Confirm and create the vendor account" },
};

export function AddVendorDrawer({ open, onClose, record, onAdd, onUpdate }: AddVendorDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<VendorForm>(EMPTY_VENDOR_FORM);

  const isEdit = !!record;

  // Pre-fill the form when opening for edit, or reset to defaults when opening for create.
  // Legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(1);
    setForm(record ? vendorToForm(record) : EMPTY_VENDOR_FORM);
  }, [open, record]);

  const update = <K extends keyof VendorForm>(k: K, v: VendorForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    const s1: string[] = [];
    if (!form.companyName.trim()) s1.push("Company name is required");
    if (!form.gstin.trim()) s1.push("GSTIN is required");
    else if (!isValidGSTIN(form.gstin)) s1.push("GSTIN format is invalid");
    if (!form.contactPerson.trim()) s1.push("Primary contact is required");
    if (!form.phone.trim()) s1.push("Phone is required");
    if (!form.email.trim()) s1.push("Email is required");
    if (!form.serviceType) s1.push("Service type is required");
    if (s1.length) errors[1] = s1;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === 4;
  const canAdvance = currentErrors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: currentErrors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < 4) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const goTo = (s: number) => {
    if (s <= step) {
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

  const [submitting, setSubmitting] = useState(false);

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
    if (isEdit && record && onUpdate) {
      ok = await onUpdate(record.id, formToVendorPatch(form));
    } else if (!isEdit && onAdd) {
      const patch = formToVendorPatch(form);
      const newVendor: Vendor = {
        id: `vend-${Date.now()}`,
        companyName: patch.companyName ?? "",
        contactPerson: patch.contactPerson ?? "",
        phone: patch.phone ?? "",
        gstin: patch.gstin ?? "",
        city: "",
        email: patch.email ?? "",
        type: (patch.type ?? "Maintenance Workshop") as Vendor["type"],
        status: "Active",
        paymentTerms: patch.paymentTerms ?? "Net 30",
        rating: patch.rating ?? 0,
      };
      ok = await onAdd(newVendor);
    }
    setSubmitting(false);
    if (!ok) return; // onAdd/onUpdate already surfaced their own error toast
    toast.success(isEdit ? "Vendor updated" : "Vendor created", {
      description: `${form.companyName} · ${form.serviceType}`,
    });
    setStep(1);
    setForm(EMPTY_VENDOR_FORM);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isEdit ? "Edit Vendor" : "Add Vendor"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isEdit
                ? "Update vendor record · auto-saved as draft"
                : "Three tiers · auto-saved as draft"}
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
            {ADD_VENDOR_STEPS.map((s, i) => {
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
                        active && "border-foreground bg-foreground text-background",
                        done && "border-foreground bg-foreground text-background",
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
                  {i < ADD_VENDOR_STEPS.length - 1 && (
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
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Tier {step}
            </span>
            <span className="text-[13px] font-medium text-foreground">
              {TIER_DESCRIPTIONS[step].tier}
            </span>
            <span className="text-[12px] text-muted-foreground">
              · {TIER_DESCRIPTIONS[step].tagline}
            </span>
          </div>

          {step === 1 && <Step1MustHave form={form} update={update} />}
          {step === 2 && <Step2NeedToKnow form={form} update={update} />}
          {step === 3 && <Step3GoodToHave form={form} update={update} />}
          {step === 4 && <Step4Review form={form} />}
        </div>

        {/* Validation strip */}
        {currentErrors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{currentErrors[0]}</span>
              {currentErrors.length > 1 && (
                <span className="text-muted-foreground">
                  · {currentErrors.length - 1} more
                </span>
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
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 4</div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Vendor"}
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

// ===== Step 1: Must Have =====
function Step1MustHave({
  form,
  update,
}: {
  form: VendorForm;
  update: <K extends keyof VendorForm>(k: K, v: VendorForm[K]) => void;
}) {
  const gstinMeta = gstinValidationMeta(form.gstin);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Company essentials
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel required>Company Name</FieldLabel>
            <Input
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. Apex Workshop"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel required hint={gstinMeta.hint}>
              GSTIN
            </FieldLabel>
            <div className="relative">
              <Input
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
                className={cn(
                  "h-8 rounded-[5px] font-mono text-[12px] tabular pr-8",
                  gstinMeta.state === "invalid" && "border-foreground/60",
                  gstinMeta.state === "valid" && "border-foreground/30",
                )}
              />
              {gstinMeta.state === "valid" && (
                <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground" />
              )}
              {gstinMeta.state === "invalid" && form.gstin.length > 0 && (
                <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground" />
              )}
            </div>
          </div>
          <div>
            <FieldLabel required>Phone</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required>Primary Contact</FieldLabel>
            <Input
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
              placeholder="Full name"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@vendor.in"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Service setup
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Service Type</FieldLabel>
            <Select value={form.serviceType} onValueChange={(v) => update("serviceType", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Payment Terms</FieldLabel>
            <Select value={form.paymentTerms} onValueChange={(v) => update("paymentTerms", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 2: Need to Know =====
function Step2NeedToKnow({
  form,
  update,
}: {
  form: VendorForm;
  update: <K extends keyof VendorForm>(k: K, v: VendorForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Service scope & rates
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Service Scope</FieldLabel>
            <Textarea
              value={form.serviceScope}
              onChange={(e) => update("serviceScope", e.target.value)}
              placeholder="Describe services offered, coverage area, capabilities…"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Rate Agreement</FieldLabel>
            <Textarea
              value={form.rateAgreement}
              onChange={(e) => update("rateAgreement", e.target.value)}
              placeholder="e.g. Labour ₹450/hr, parts at MRP-15%, fuel at IOC rate + ₹1.50/L…"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Credit Terms</FieldLabel>
            <Input
              value={form.creditTerms}
              onChange={(e) => update("creditTerms", e.target.value)}
              placeholder="e.g. 30 days from invoice"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Payment Mode</FieldLabel>
            <Select value={form.paymentMode} onValueChange={(v) => update("paymentMode", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Bank details
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Bank Name</FieldLabel>
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              placeholder="e.g. HDFC Bank"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Account Number</FieldLabel>
            <Input
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value)}
              placeholder="0000 0000 0000"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">IFSC</FieldLabel>
            <Input
              value={form.ifsc}
              onChange={(e) => update("ifsc", e.target.value.toUpperCase())}
              placeholder="HDFC0000123"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 3: Good to Have =====
function Step3GoodToHave({
  form,
  update,
}: {
  form: VendorForm;
  update: <K extends keyof VendorForm>(k: K, v: VendorForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Context
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Certifications</FieldLabel>
            <Textarea
              value={form.certifications}
              onChange={(e) => update("certifications", e.target.value)}
              placeholder="ISO 9001, OEM authorised service centre, IATF 16949…"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Service History</FieldLabel>
            <Textarea
              value={form.serviceHistory}
              onChange={(e) => update("serviceHistory", e.target.value)}
              placeholder="Prior relationship, existing contracts, references…"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Relationship Manager</FieldLabel>
            <Select value={form.relationshipManager} onValueChange={(v) => update("relationshipManager", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Assign internal RM" />
              </SelectTrigger>
              <SelectContent>
                {["Vikram Deshmukh", "Rohit Sharma", "Sukhbir Gill", "Reena Mehta", "Anil Reddy"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="1.0–5.0">Initial Performance Rating</FieldLabel>
            <Select value={form.performanceRating} onValueChange={(v) => update("performanceRating", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5.0", "4.5", "4.0", "3.5", "3.0", "2.5"].map((r) => (
                  <SelectItem key={r} value={r}>{r} / 5.0</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 4: Review =====
function Step4Review({ form }: { form: VendorForm }) {
  const gstinMeta = gstinValidationMeta(form.gstin);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Compliance check
            </span>
          </div>
          <StatusBadge variant={gstinMeta.state === "valid" ? "outline" : "muted"}>
            {gstinMeta.state === "valid" ? "All checks passed" : "Pending"}
          </StatusBadge>
        </div>
        <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
          <ChecklistRow ok label="Company name provided" />
          <ChecklistRow ok={gstinMeta.state === "valid"} label="GSTIN format valid" />
          <ChecklistRow ok={!!form.contactPerson} label="Primary contact set" />
          <ChecklistRow ok={!!form.phone} label="Phone captured" />
          <ChecklistRow ok={!!form.email} label="Email captured" />
          <ChecklistRow ok={!!form.serviceType} label="Service type selected" />
        </div>
      </div>

      <ReviewSection title="Must Have" icon={Building2}>
        <ReviewRow label="Company Name" value={form.companyName || "-"} />
        <ReviewRow label="GSTIN" value={form.gstin || "-"} mono />
        <ReviewRow label="Phone" value={form.phone || "-"} mono />
        <ReviewRow label="Primary Contact" value={form.contactPerson || "-"} />
        <ReviewRow label="Email" value={form.email || "-"} />
        <ReviewRow label="Service Type" value={form.serviceType} />
        <ReviewRow label="Payment Terms" value={form.paymentTerms} />
      </ReviewSection>

      <ReviewSection title="Need to Know" icon={Wrench}>
        <ReviewRow label="Service Scope" value={form.serviceScope || "-"} />
        <ReviewRow label="Rate Agreement" value={form.rateAgreement || "-"} />
        <ReviewRow label="Credit Terms" value={form.creditTerms || "-"} />
        <ReviewRow label="Payment Mode" value={form.paymentMode} />
        <ReviewRow label="Bank Name" value={form.bankName || "-"} />
        <ReviewRow label="Account Number" value={form.bankAccount || "-"} mono />
        <ReviewRow label="IFSC" value={form.ifsc || "-"} mono />
      </ReviewSection>

      <ReviewSection title="Good to Have" icon={Star}>
        <ReviewRow label="Certifications" value={form.certifications || "-"} />
        <ReviewRow label="Service History" value={form.serviceHistory || "-"} />
        <ReviewRow label="Relationship Manager" value={form.relationshipManager || "-"} />
        <ReviewRow label="Initial Rating" value={`${form.performanceRating} / 5.0`} mono />
      </ReviewSection>
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          ok ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
        )}
      >
        {ok && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className={cn("text-[12px]", ok ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-x-6 px-4 py-2 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] text-foreground text-right", mono && "tabular")}>
        {value}
      </span>
    </div>
  );
}
