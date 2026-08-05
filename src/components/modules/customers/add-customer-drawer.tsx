"use client";
import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/types";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Building2,
  MapPin,
  User,
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
  ADD_CUSTOMER_STEPS,
  PAYMENT_TERMS,
  CURRENCIES,
  CITIES,
  isValidGSTIN,
  gstinValidationMeta,
  EMPTY_CUSTOMER_FORM,
  customerToForm,
  formToCustomerPatch,
  type CustomerForm,
  FieldLabel,
} from "./_helpers";

interface AddCustomerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer acts as an Edit form pre-filled from this record. */
  record?: Customer;
  /** Create callback. */
  onAdd?: (c: Customer) => void;
  /** Edit callback - receives the record id and a patch of changed fields. */
  onUpdate?: (id: string, data: Partial<Customer>) => void;
}

const TIER_DESCRIPTIONS: Record<number, { tagline: string; tier: string }> = {
  1: { tier: "Must Have", tagline: "Required to create a customer record" },
  2: { tier: "Need to Know", tagline: "Operational context for deliveries and billing" },
  3: { tier: "Good to Have", tagline: "Context that helps your team serve them better" },
  4: { tier: "Review", tagline: "Confirm and create the customer account" },
};

export function AddCustomerDrawer({ open, onClose, record, onAdd, onUpdate }: AddCustomerDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CustomerForm>(EMPTY_CUSTOMER_FORM);

  const isEdit = !!record;

  // Pre-fill the form when opening for edit, or reset to defaults when opening for create.
  // Effect fires on open transitions; the inner `if (open)` gate ensures we only seed/clear
  // when the drawer actually opens. This is the legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(1);
    setForm(record ? customerToForm(record) : EMPTY_CUSTOMER_FORM);
  }, [open, record]);

  const update = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Per-step validation =====
  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    const s1: string[] = [];
    if (!form.companyName.trim()) s1.push("Company name is required");
    if (!form.gstin.trim()) s1.push("GSTIN is required");
    else if (!isValidGSTIN(form.gstin)) s1.push("GSTIN format is invalid");
    if (!form.billingAddress.trim()) s1.push("Billing address is required");
    if (!form.contactPerson.trim()) s1.push("Contact person is required");
    if (!form.phone.trim()) s1.push("Phone is required");
    if (!form.email.trim()) s1.push("Email is required");
    if (s1.length) errors[1] = s1;
    // Steps 2 & 3 are optional tiers - no required fields
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

  const handleSubmit = () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    if (isEdit && record && onUpdate) {
      onUpdate(record.id, formToCustomerPatch(form));
      toast.success("Customer updated", {
        description: `${form.companyName} · ${form.gstin}`,
      });
    } else if (!isEdit && onAdd) {
      const patch = formToCustomerPatch(form);
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        companyName: patch.companyName ?? "",
        contactPerson: patch.contactPerson ?? "",
        phone: patch.phone ?? "",
        gstin: patch.gstin ?? "",
        city: patch.city ?? "",
        email: patch.email ?? "",
        paymentTerms: patch.paymentTerms ?? "Net 30",
        creditLimit: patch.creditLimit ?? 0,
        accountManager: patch.accountManager ?? "Unassigned",
        activeTrips: 0,
        outstandingBalance: 0,
        totalRevenue: 0,
        status: "Active",
      };
      onAdd(newCustomer);
      toast.success("Customer created", {
        description: `${form.companyName} · ${form.gstin}`,
      });
    } else {
      toast.success(isEdit ? "Customer updated" : "Customer created", {
        description: `${form.companyName} · ${form.gstin}`,
      });
    }
    setStep(1);
    setForm(EMPTY_CUSTOMER_FORM);
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
              {isEdit ? "Edit Customer" : "Add Customer"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isEdit
                ? "Update customer record · auto-saved as draft"
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
            {ADD_CUSTOMER_STEPS.map((s, i) => {
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
                    {errored && (
                      <AlertCircle className="h-3 w-3 text-foreground" />
                    )}
                  </button>
                  {i < ADD_CUSTOMER_STEPS.length - 1 && (
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

        {/* Content - scrollable */}
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
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of 4
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
            >
              {isEdit ? "Save Changes" : "Create Customer"}
            </Btn>
          ) : (
            <Btn
              variant="primary"
              onClick={goNext}
              disabled={!canAdvance}
            >
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
  form: CustomerForm;
  update: <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => void;
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
              placeholder="e.g. Bharat Logistics"
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
            <FieldLabel required>Billing Address</FieldLabel>
            <Textarea
              value={form.billingAddress}
              onChange={(e) => update("billingAddress", e.target.value)}
              placeholder="Plot / Street / City / PIN"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Primary contact
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Contact Person</FieldLabel>
            <Input
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
              placeholder="Full name"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel required>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="accounts@company.in"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Financial setup
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div>
            <FieldLabel required>Preferred Currency</FieldLabel>
            <Select value={form.preferredCurrency} onValueChange={(v) => update("preferredCurrency", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
  form: CustomerForm;
  update: <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Operations
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Delivery Preferences</FieldLabel>
            <Input
              value={form.deliveryPreferences}
              onChange={(e) => update("deliveryPreferences", e.target.value)}
              placeholder="Tail-lift, side-loading, time-bound…"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Preferred Routes</FieldLabel>
            <Input
              value={form.preferredRoutes}
              onChange={(e) => update("preferredRoutes", e.target.value)}
              placeholder="Mumbai–Pune, Delhi-NCR…"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Rate Card Assignment</FieldLabel>
            <Select value={form.rateCardAssignment} onValueChange={(v) => update("rateCardAssignment", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Select rate card" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard FTL">Standard FTL</SelectItem>
                <SelectItem value="LTL Per Ton">LTL Per Ton</SelectItem>
                <SelectItem value="Container 20ft">Container 20ft</SelectItem>
                <SelectItem value="Container 40ft">Container 40ft</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="optional">Branch Association</FieldLabel>
            <Select value={form.branchAssociation} onValueChange={(v) => update("branchAssociation", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {["Mumbai HQ", "Pune Branch", "Delhi Branch", "Bengaluru Branch"].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="INR">Credit Limit</FieldLabel>
            <Input
              type="number"
              value={form.creditLimit}
              onChange={(e) => update("creditLimit", e.target.value)}
              placeholder="500000"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Document Requirements</FieldLabel>
            <Textarea
              value={form.documentRequirements}
              onChange={(e) => update("documentRequirements", e.target.value)}
              placeholder="e.g. eWay Bill mandatory, POD scan within 48h, delivery signature stamp…"
              className="min-h-[64px] rounded-[5px] text-[13px]"
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
  form: CustomerForm;
  update: <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Context
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Social Media</FieldLabel>
            <Input
              value={form.socialMedia}
              onChange={(e) => update("socialMedia", e.target.value)}
              placeholder="LinkedIn / Twitter handle"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Referral Source</FieldLabel>
            <Select value={form.referralSource} onValueChange={(v) => update("referralSource", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="How did they find us?" />
              </SelectTrigger>
              <SelectContent>
                {["Existing customer", "Trade show", "Online search", "Cold outreach", "Partner referral", "Walk-in"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="optional">Account Manager</FieldLabel>
            <Select value={form.accountManager} onValueChange={(v) => update("accountManager", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Assign account manager" />
              </SelectTrigger>
              <SelectContent>
                {["Vikram Deshmukh", "Rohit Sharma", "Sukhbir Gill", "Reena Mehta", "Anil Reddy"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="optional">Communication Preferences</FieldLabel>
            <Select value={form.communicationPrefs} onValueChange={(v) => update("communicationPrefs", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Email + SMS", "Email only", "SMS only", "WhatsApp", "Phone calls"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Secondary contact
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Secondary Contact Name</FieldLabel>
            <Input
              value={form.secondaryContactName}
              onChange={(e) => update("secondaryContactName", e.target.value)}
              placeholder="Backup point of contact"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Secondary Contact Phone</FieldLabel>
            <Input
              value={form.secondaryContactPhone}
              onChange={(e) => update("secondaryContactPhone", e.target.value)}
              placeholder="+91 98765 43210"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 4: Review =====
function Step4Review({ form }: { form: CustomerForm }) {
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
          <ChecklistRow ok={!!form.paymentTerms} label="Payment terms selected" />
        </div>
      </div>

      <ReviewSection title="Must Have" icon={Building2}>
        <ReviewRow label="Company Name" value={form.companyName || "-"} />
        <ReviewRow label="GSTIN" value={form.gstin || "-"} mono />
        <ReviewRow label="Phone" value={form.phone || "-"} mono />
        <ReviewRow label="Billing Address" value={form.billingAddress || "-"} />
        <ReviewRow label="Contact Person" value={form.contactPerson || "-"} />
        <ReviewRow label="Email" value={form.email || "-"} />
        <ReviewRow label="Payment Terms" value={form.paymentTerms} />
        <ReviewRow label="Preferred Currency" value={form.preferredCurrency} />
      </ReviewSection>

      <ReviewSection title="Need to Know" icon={MapPin}>
        <ReviewRow label="Delivery Preferences" value={form.deliveryPreferences || "-"} />
        <ReviewRow label="Preferred Routes" value={form.preferredRoutes || "-"} />
        <ReviewRow label="Rate Card" value={form.rateCardAssignment || "-"} />
        <ReviewRow label="Branch" value={form.branchAssociation || "-"} />
        <ReviewRow label="Credit Limit" value={form.creditLimit ? `₹${Number(form.creditLimit).toLocaleString("en-IN")}` : "-"} mono />
        <ReviewRow label="Document Requirements" value={form.documentRequirements || "-"} />
      </ReviewSection>

      <ReviewSection title="Good to Have" icon={Star}>
        <ReviewRow label="Social Media" value={form.socialMedia || "-"} />
        <ReviewRow label="Referral Source" value={form.referralSource || "-"} />
        <ReviewRow label="Account Manager" value={form.accountManager || "-"} />
        <ReviewRow label="Communication Prefs" value={form.communicationPrefs || "-"} />
        <ReviewRow label="Secondary Contact" value={form.secondaryContactName || "-"} />
        <ReviewRow label="Secondary Phone" value={form.secondaryContactPhone || "-"} mono />
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
