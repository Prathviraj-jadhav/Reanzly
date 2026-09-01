"use client";

import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { FieldLabel, isValidGstin, formatINR } from "./_helpers";
import {
  INDUSTRIES,
  TIMEZONES,
  CURRENCIES,
  CITIES,
  PAYMENT_METHODS,
  BILLING_CYCLES,
  PLANS,
  MODULES,
  planById,
  type PlanId,
  type BillingCycle,
} from "./_data";
import { useSuperadminStore } from "./_store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building2,
  UserCircle2,
  CreditCard,
  LayoutGrid,
  CheckCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ONBOARDING_MODULES,
  RECOMMENDED_PACKS,
  recommendedPackFor,
  SUBSCRIPTION_MODELS,
  subscriptionModelById,
  moduleById,
  type OnboardingModule,
} from "@/lib/onboarding/module-catalog";
import type {
  BusinessType,
  SubscriptionModel,
  BrokerProfile,
} from "@/lib/store/app-store";

// ============================================================
// Step layout - 5 smart steps.
//   1. Org Basics (incl. businessType → recommended-pack rationale)
//   2. Modules (smart) - grouped catalog, recommended pre-checked,
//      live footer with count + est. monthly
//   3. Admin User
//   4. Subscription & Billing - subscriptionModel cards + plan +
//      payment + directoryOptIn + broker fields (broker variants only)
//   5. Review
// ============================================================
const STEPS = [
  { id: 1, label: "Org Basics", icon: Building2 },
  { id: 2, label: "Modules", icon: LayoutGrid },
  { id: 3, label: "Admin User", icon: UserCircle2 },
  { id: 4, label: "Subscription", icon: CreditCard },
  { id: 5, label: "Review", icon: CheckCheck },
];

const BUSINESS_TYPES: BusinessType[] = [
  "Transport",
  "Fleet Owner",
  "Freight Broker",
  "Warehouse",
  "3PL",
  "Reanzly Broker",
];

const SETTLEMENT_CYCLES: BrokerProfile["settlementCycle"][] = [
  "Weekly",
  "Fortnightly",
  "Monthly",
];
const GST_TREATMENTS: BrokerProfile["gstTreatment"][] = [
  "Forward Charge",
  "Reverse Charge",
];

interface OnboardingForm {
  legalName: string;
  brandName: string;
  gstin: string;
  industry: string;
  hqCity: string;
  timezone: string;
  currency: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  paymentMethod: string;
  enabledModules: string[];
  vehicleCap: number;
  userCap: number;
  // === Smart onboarding fields ===
  businessType: BusinessType;
  selectedModules: string[];
  subscriptionModel: SubscriptionModel;
  directoryOptIn: boolean;
  brokerProfile?: BrokerProfile;
}

function emptyForm(): OnboardingForm {
  const defaultBusinessType: BusinessType = "Transport";
  const pack = recommendedPackFor(defaultBusinessType);
  return {
    legalName: "",
    brandName: "",
    gstin: "",
    industry: INDUSTRIES[0],
    hqCity: CITIES[0],
    timezone: TIMEZONES[0],
    currency: "INR",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: PAYMENT_METHODS[0],
    enabledModules: MODULES.filter((m) => m.defaultOn).map((m) => m.id),
    vehicleCap: 50,
    userCap: 25,
    // Smart-onboarding defaults - mirrors what self-serve signup captures.
    businessType: defaultBusinessType,
    selectedModules: pack.moduleIds,
    subscriptionModel: "saas",
    directoryOptIn: true,
    brokerProfile: undefined,
  };
}

export interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (orgId: string) => void;
  /** Optional pre-fill (used when approving a self-serve SignupRequest). */
  initialForm?: Partial<OnboardingForm>;
}

export function OnboardingWizard({
  open,
  onClose,
  onCreated,
  initialForm,
}: OnboardingWizardProps) {
  const createOrg = useSuperadminStore((s) => s.createOrg);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the wizard is reopened. This is a legitimate
  // form-reset-on-open pattern (same as add-pod-drawer.tsx); the rule's
  // concern does not apply here because this only fires when `open` flips.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setForm({ ...emptyForm(), ...initialForm });
      setSubmitting(false);
    }
  }, [open, initialForm]);

  const update = <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // When the business type changes we re-apply the recommended smart pack
  // so the user always sees the curated baseline for their segment. They
  // can still adjust on step 2.
  const changeBusinessType = (bt: BusinessType) => {
    const pack = recommendedPackFor(bt);
    setForm((s) => ({
      ...s,
      businessType: bt,
      selectedModules: pack.moduleIds,
      // Broker variants get a default broker profile if they don't have one.
      brokerProfile:
        bt === "Freight Broker" || bt === "Reanzly Broker"
          ? s.brokerProfile ?? {
              brokerCode: `RZB-${bt === "Reanzly Broker" ? "MST" : "FRT"}-${Math.random()
                .toString(36)
                .slice(2, 6)
                .toUpperCase()}`,
              markupPct: 8,
              settlementCycle: "Weekly",
              gstTreatment: "Forward Charge",
              coverageLanes: [],
            }
          : undefined,
    }));
  };

  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    // Step 1 - Org basics
    const s1: string[] = [];
    if (!form.legalName.trim()) s1.push("Legal name is required");
    else if (form.legalName.trim().length < 3) s1.push("Legal name must be at least 3 characters");
    if (!form.gstin.trim()) s1.push("GSTIN is required");
    else if (!isValidGstin(form.gstin)) s1.push("GSTIN format is invalid (15 chars)");
    if (!form.industry) s1.push("Industry is required");
    if (!form.hqCity) s1.push("HQ city is required");
    if (!form.businessType) s1.push("Business type is required");
    if (s1.length) errors[1] = s1;
    // Step 2 - Modules (smart)
    const s2: string[] = [];
    if (form.selectedModules.length === 0) s2.push("Select at least one module");
    if (s2.length) errors[2] = s2;
    // Step 3 - Admin user
    const s3: string[] = [];
    if (!form.adminName.trim()) s3.push("Admin name is required");
    if (!form.adminEmail.trim()) s3.push("Admin email is required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) s3.push("Admin email is invalid");
    if (!form.adminPhone.trim()) s3.push("Admin phone is required");
    else if (!/^[+\d][\d\s-]{8,}$/.test(form.adminPhone)) s3.push("Admin phone is invalid");
    if (s3.length) errors[3] = s3;
    // Step 4 - Subscription & billing
    const s4: string[] = [];
    if (!form.plan) s4.push("Plan is required");
    if (!form.paymentMethod) s4.push("Payment method is required");
    if (!form.subscriptionModel) s4.push("Subscription model is required");
    // Broker variants must carry a broker profile.
    const isBroker =
      form.businessType === "Freight Broker" || form.businessType === "Reanzly Broker";
    if (isBroker) {
      const bp = form.brokerProfile;
      if (!bp) s4.push("Broker profile is required for broker business types");
      else {
        if (bp.markupPct < 0 || bp.markupPct > 100)
          s4.push("Broker markup must be between 0 and 100");
        if (bp.coverageLanes.length === 0)
          s4.push("Add at least one coverage lane for the broker");
      }
    }
    if (s4.length) errors[4] = s4;
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const canAdvance = currentErrors.length === 0;
  const isLastStep = step === STEPS.length;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: currentErrors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < STEPS.length) setStep(step + 1);
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
        toast(`Complete step ${i} first`, { description: stepErrors[i][0] });
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
    setSubmitting(true);
    // Simulate brief network/processing delay for the Doherty threshold.
    setTimeout(() => {
      const id = createOrg(form);
      setSubmitting(false);
      toast.success("Organization onboarded", {
        description: `${form.legalName} · 15-day trial · Invite sent to ${form.adminEmail}`,
      });
      onCreated?.(id);
      onClose();
    }, 600);
  };

  const plan = planById(form.plan);
  const sm = subscriptionModelById(form.subscriptionModel);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[760px] p-0 gap-0 max-h-[92vh] flex flex-col rounded-[6px]"
      >
        <DialogTitle className="sr-only">Onboard Organization</DialogTitle>
        <DialogDescription className="sr-only">
          Five-step smart wizard to create a new tenant, recommend a module
          pack based on business type, and start a 15-day trial.
        </DialogDescription>

        {/* Header */}
        <header className="flex items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-[17px] font-medium tracking-tight text-foreground">
              Onboard Organization
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Five steps · Reanzly smart assisted onboarding · 15-day trial
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close wizard"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const errored = stepErrors[s.id]?.length && step <= s.id;
              const Icon = s.icon;
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
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 hidden md:block",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
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
                  {i < STEPS.length - 1 && (
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

        {/* Body - scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5">
            {step === 1 && (
              <Step1Basics
                form={form}
                update={update}
                onChangeBusinessType={changeBusinessType}
              />
            )}
            {step === 2 && <Step2Modules form={form} update={update} />}
            {step === 3 && <Step3Admin form={form} update={update} />}
            {step === 4 && (
              <Step4Subscription form={form} update={update} plan={plan} />
            )}
            {step === 5 && (
              <Step5Review form={form} plan={plan} sm={sm} />
            )}
          </div>
        </ScrollArea>

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
        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn
            variant="ghost"
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            onClick={goBack}
            disabled={step === 1 || submitting}
          >
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of {STEPS.length}
          </div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={submitting ? undefined : <Check className="h-3.5 w-3.5" />}
              loading={submitting}
              onClick={handleSubmit}
            >
              Create & start trial
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
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Step 1 - Org Basics (incl. businessType → rationale one-liner)
   ============================================================ */
function Step1Basics({
  form,
  update,
  onChangeBusinessType,
}: {
  form: OnboardingForm;
  update: <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) => void;
  onChangeBusinessType: (bt: BusinessType) => void;
}) {
  const pack = recommendedPackFor(form.businessType);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <FieldLabel required>Legal name</FieldLabel>
        <Input
          value={form.legalName}
          onChange={(e) => update("legalName", e.target.value)}
          placeholder="Shree Balaji Carriers Pvt Ltd"
          className="h-9 rounded-[5px]"
        />
      </div>
      <div>
        <FieldLabel hint="Optional">Brand name</FieldLabel>
        <Input
          value={form.brandName}
          onChange={(e) => update("brandName", e.target.value)}
          placeholder="Shree Balaji Carriers"
          className="h-9 rounded-[5px]"
        />
      </div>
      <div>
        <FieldLabel required>GSTIN</FieldLabel>
        <Input
          value={form.gstin}
          onChange={(e) => update("gstin", e.target.value.toUpperCase())}
          placeholder="27AABCS1234F1Z5"
          maxLength={15}
          className="h-9 rounded-[5px] tabular uppercase"
        />
      </div>

      {/* Smart-onboarding: business type drives the recommended pack */}
      <div className="md:col-span-2">
        <FieldLabel required hint={`${pack.moduleIds.length} modules recommended`}>
          Business type
        </FieldLabel>
        <Select
          value={form.businessType}
          onValueChange={(v) => onChangeBusinessType(v as BusinessType)}
        >
          <SelectTrigger className="h-9 w-full rounded-[5px]">
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((bt) => (
              <SelectItem key={bt} value={bt}>
                {RECOMMENDED_PACKS[bt]?.label ?? bt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Recommended pack: </span>
          {pack.rationale}
        </div>
      </div>

      <div>
        <FieldLabel required>Industry</FieldLabel>
        <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
          <SelectTrigger className="h-9 w-full rounded-[5px]">
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel required>HQ city</FieldLabel>
        <Select value={form.hqCity} onValueChange={(v) => update("hqCity", v)}>
          <SelectTrigger className="h-9 w-full rounded-[5px]">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Timezone</FieldLabel>
        <Select value={form.timezone} onValueChange={(v) => update("timezone", v)}>
          <SelectTrigger className="h-9 w-full rounded-[5px]">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Currency</FieldLabel>
        <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
          <SelectTrigger className="h-9 w-full rounded-[5px]">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ============================================================
   Step 2 - Modules (smart) - grouped catalog, recommended
   pre-checked, live footer with count + est. monthly.
   ============================================================ */
const MODULE_CATEGORIES: OnboardingModule["category"][] = [
  "Operations",
  "Fleet",
  "Finance",
  "Compliance",
  "People",
  "Intelligence",
  "Broker",
];

function Step2Modules({
  form,
  update,
}: {
  form: OnboardingForm;
  update: <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) => void;
}) {
  const pack = recommendedPackFor(form.businessType);
  const recommendedSet = useMemo(() => new Set(pack.moduleIds), [pack]);

  const toggle = (mId: string) => {
    const has = form.selectedModules.includes(mId);
    update(
      "selectedModules",
      has
        ? form.selectedModules.filter((x) => x !== mId)
        : [...form.selectedModules, mId],
    );
  };

  const estMonthly = useMemo(
    () =>
      form.selectedModules.reduce((sum, id) => {
        const m = moduleById(id);
        return sum + (m?.pricePerMonth ?? 0);
      }, 0),
    [form.selectedModules],
  );

  const selectAllRecommended = () => update("selectedModules", pack.moduleIds);
  const clearAll = () => update("selectedModules", []);

  return (
    <div className="space-y-3">
      <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">
          {RECOMMENDED_PACKS[form.businessType]?.label ?? form.businessType}{" "}
          recommended pack:
        </span>{" "}
        {pack.rationale} We have pre-checked the recommended modules - toggle
        them on/off to tailor the stack to this customer.
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground tabular">
            {form.selectedModules.length}
          </span>{" "}
          of {ONBOARDING_MODULES.length} modules selected
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllRecommended}
            className="text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            Reset to recommended
          </button>
          <span className="text-[11px] text-muted-foreground">·</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Catalog grouped by category */}
      <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
        {MODULE_CATEGORIES.map((cat) => {
          const catModules = ONBOARDING_MODULES.filter((m) => m.category === cat);
          if (catModules.length === 0) return null;
          return (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {cat}
                </span>
                <span className="text-[10px] text-muted-foreground tabular">
                  {catModules.filter((m) => form.selectedModules.includes(m.id)).length}/
                  {catModules.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {catModules.map((m) => {
                  const on = form.selectedModules.includes(m.id);
                  const isRecommended = recommendedSet.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2.5 rounded-[5px] border p-2.5 cursor-pointer transition-colors",
                        on
                          ? "border-foreground/40 bg-accent/30"
                          : "border-border hover:bg-accent/20",
                      )}
                    >
                      <Switch
                        checked={on}
                        onCheckedChange={() => toggle(m.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[12px] font-medium text-foreground">
                            {m.name}
                          </span>
                          {isRecommended && (
                            <span className="rounded-[3px] border border-border bg-background px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                              rec
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {m.description}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground tabular">
                          {m.pricePerMonth === 0
                            ? "Included"
                            : `${formatINR(m.pricePerMonth)}/mo`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live footer - selected count + estimated monthly */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-3 border-t border-border bg-background px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground tabular">
              {form.selectedModules.length}
            </span>{" "}
            modules selected
            {form.selectedModules.length > 0 && (
              <span className="ml-1 text-muted-foreground">
                · {formatINR(estMonthly)}/mo list price
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground text-right max-w-[260px]">
            Actual billed amount is driven by the subscription model on the
            next step.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step 3 - Admin User
   ============================================================ */
function Step3Admin({
  form,
  update,
}: {
  form: OnboardingForm;
  update: <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
        The org admin receives the invite email and is provisioned as the first user with full
        access. They can later invite more users from within their workspace.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Admin name</FieldLabel>
          <Input
            value={form.adminName}
            onChange={(e) => update("adminName", e.target.value)}
            placeholder="Rajesh Bhalerao"
            className="h-9 rounded-[5px]"
          />
        </div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <Input
            value="Org Admin"
            disabled
            className="h-9 rounded-[5px] text-muted-foreground"
          />
        </div>
        <div>
          <FieldLabel required>Admin email</FieldLabel>
          <Input
            type="email"
            value={form.adminEmail}
            onChange={(e) => update("adminEmail", e.target.value)}
            placeholder="rajesh.b@shreebalaji.in"
            className="h-9 rounded-[5px]"
          />
        </div>
        <div>
          <FieldLabel required>Admin phone</FieldLabel>
          <Input
            value={form.adminPhone}
            onChange={(e) => update("adminPhone", e.target.value)}
            placeholder="+91 98220 14582"
            className="h-9 rounded-[5px] tabular"
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step 4 - Subscription & Billing
   ============================================================ */
function Step4Subscription({
  form,
  update,
  plan,
}: {
  form: OnboardingForm;
  update: <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) => void;
  plan?: ReturnType<typeof planById>;
}) {
  const isBroker =
    form.businessType === "Freight Broker" || form.businessType === "Reanzly Broker";
  const bp = form.brokerProfile;

  const updateBroker = <K extends keyof BrokerProfile>(k: K, v: BrokerProfile[K]) => {
    if (!form.brokerProfile) return;
    update("brokerProfile", { ...form.brokerProfile, [k]: v });
  };

  return (
    <div className="space-y-4">
      {/* Subscription model cards (SaaS / Commission / Master) */}
      <div>
        <FieldLabel required hint="drives billing surface + MRR">
          Subscription model
        </FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {SUBSCRIPTION_MODELS.map((m) => {
            const active = form.subscriptionModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => update("subscriptionModel", m.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-[6px] border p-3 text-left transition-colors tap",
                  active
                    ? "border-foreground bg-accent/40"
                    : "border-border bg-card hover:bg-accent/30",
                )}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[12px] font-medium text-foreground">{m.label}</span>
                  {m.recommended && (
                    <span className="rounded-[3px] border border-border bg-background px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      popular
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {m.tagline}
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  {m.flatMonthly > 0 ? (
                    <>
                      <span className="text-[16px] font-medium tabular text-foreground">
                        {formatINR(m.flatMonthly)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">/ mo</span>
                    </>
                  ) : (
                    <span className="text-[14px] font-medium text-foreground">No flat fee</span>
                  )}
                  {m.commissionPct > 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground tabular">
                      · {m.commissionPct}% / trip
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan + billing cycle + payment method (existing) */}
      <div>
        <FieldLabel required hint="tier cap on vehicles / users / storage">
          Plan
        </FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PLANS.map((p) => {
            const active = form.plan === p.id;
            return (
              <button
                key={p.id}
                onClick={() => update("plan", p.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-[6px] border p-3 text-left transition-colors tap",
                  active
                    ? "border-foreground bg-accent/40"
                    : "border-border bg-card hover:bg-accent/30",
                )}
              >
                <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                <span className="text-[11px] text-muted-foreground">{p.summary}</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[18px] font-medium tabular text-foreground">
                    {formatINR(p.monthly)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">/ mo</span>
                </div>
                <div className="text-[10px] text-muted-foreground tabular">
                  {p.vehicleCap} vehicles · {p.userCap} users · {p.storageGB} GB
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Billing cycle</FieldLabel>
          <div className="grid grid-cols-2 gap-1 rounded-[5px] border border-border p-0.5">
            {BILLING_CYCLES.map((c) => (
              <button
                key={c}
                onClick={() => update("billingCycle", c)}
                className={cn(
                  "rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
                  form.billingCycle === c
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
                {c === "Annual" && (
                  <span className="ml-1 text-[10px] opacity-70">−17%</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel required>Payment method</FieldLabel>
          <Select value={form.paymentMethod} onValueChange={(v) => update("paymentMethod", v)}>
            <SelectTrigger className="h-9 w-full rounded-[5px]">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory opt-in */}
      <label
        className={cn(
          "flex items-start gap-3 rounded-[6px] border p-3 cursor-pointer transition-colors",
          form.directoryOptIn
            ? "border-foreground/40 bg-accent/30"
            : "border-border hover:bg-accent/20",
        )}
      >
        <Switch
          checked={form.directoryOptIn}
          onCheckedChange={(v) => update("directoryOptIn", v)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">
            List on Reanzly public directory
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Generates an SEO-ranked public profile on the Reanzly marketplace
            (IndiaMART-style). Buyers searching &ldquo;logistics company in{" "}
            {form.hqCity || "your city"}&rdquo; will find this org.
          </div>
        </div>
      </label>

      {/* Broker fields (only for broker business types) */}
      {isBroker && bp && (
        <div className="rounded-[6px] border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium text-foreground">Broker profile</div>
              <div className="text-[11px] text-muted-foreground">
                Required for {form.businessType} business type.
              </div>
            </div>
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
              {bp.brokerCode}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel required hint="% over Reanzly rate card">
                Markup %
              </FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={bp.markupPct}
                onChange={(e) => updateBroker("markupPct", Number(e.target.value) || 0)}
                className="h-9 rounded-[5px] tabular"
              />
            </div>
            <div>
              <FieldLabel required>Settlement cycle</FieldLabel>
              <Select
                value={bp.settlementCycle}
                onValueChange={(v) =>
                  updateBroker("settlementCycle", v as BrokerProfile["settlementCycle"])
                }
              >
                <SelectTrigger className="h-9 w-full rounded-[5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTLEMENT_CYCLES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>GST treatment</FieldLabel>
              <Select
                value={bp.gstTreatment}
                onValueChange={(v) =>
                  updateBroker("gstTreatment", v as BrokerProfile["gstTreatment"])
                }
              >
                <SelectTrigger className="h-9 w-full rounded-[5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GST_TREATMENTS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="comma-separated">Coverage lanes</FieldLabel>
              <Input
                value={bp.coverageLanes.join(", ")}
                onChange={(e) =>
                  updateBroker(
                    "coverageLanes",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Mumbai-Delhi, Pune-Bengaluru"
                className="h-9 rounded-[5px]"
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">Billing summary:</span>{" "}
        {form.subscriptionModel === "commission"
          ? "Zero flat fee · 7% commission on marketplace trips"
          : form.billingCycle === "Annual"
            ? `${formatINR(planById(form.plan)?.annual ?? 0)} billed annually · ${subscriptionModelById(form.subscriptionModel).label}`
            : `${formatINR(subscriptionModelById(form.subscriptionModel).flatMonthly)} flat / mo · ${subscriptionModelById(form.subscriptionModel).label}`}{" "}
        · First invoice issues when the 15-day trial converts to paid.
      </div>
    </div>
  );
}

/* ============================================================
   Step 5 - Review & Confirm
   ============================================================ */
function Step5Review({
  form,
  plan,
  sm,
}: {
  form: OnboardingForm;
  plan?: ReturnType<typeof planById>;
  sm: ReturnType<typeof subscriptionModelById>;
}) {
  const estMonthly = form.selectedModules.reduce((sum, id) => {
    const m = moduleById(id);
    return sum + (m?.pricePerMonth ?? 0);
  }, 0);
  return (
    <div className="space-y-4">
      <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
        Review the onboarding details below. The org gets a{" "}
        <span className="text-foreground font-medium">15-day free trial</span>{" "}
        starting from creation. An invite email will be sent to{" "}
        <span className="text-foreground font-medium">{form.adminEmail}</span>.
      </div>
      <ReviewSection title="Organization">
        <ReviewRow label="Legal name" value={form.legalName} />
        <ReviewRow label="Brand name" value={form.brandName || form.legalName} />
        <ReviewRow label="GSTIN" value={form.gstin} mono />
        <ReviewRow label="Business type" value={RECOMMENDED_PACKS[form.businessType]?.label ?? form.businessType} />
        <ReviewRow label="Industry" value={form.industry} />
        <ReviewRow label="HQ city" value={form.hqCity} />
        <ReviewRow label="Timezone" value={form.timezone} />
        <ReviewRow label="Currency" value={form.currency} mono />
      </ReviewSection>
      <ReviewSection title={`Modules (${form.selectedModules.length})`}>
        <ReviewRow
          label="Selected modules"
          value={`${form.selectedModules.length} modules · ${formatINR(estMonthly)}/mo list price`}
          mono
        />
        <div className="flex flex-col gap-1 rounded-[5px] border border-border bg-card px-3 py-2">
          <span className="text-[12px] text-muted-foreground">
            Modules ({form.selectedModules.length})
          </span>
          <div className="flex flex-wrap gap-1">
            {form.selectedModules.map((id) => {
              const m = moduleById(id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  {m?.name ?? id}
                </span>
              );
            })}
          </div>
        </div>
      </ReviewSection>
      <ReviewSection title="Admin user">
        <ReviewRow label="Name" value={form.adminName} />
        <ReviewRow label="Email" value={form.adminEmail} mono />
        <ReviewRow label="Phone" value={form.adminPhone} mono />
        <ReviewRow label="Role" value="Org Admin" />
      </ReviewSection>
      <ReviewSection title="Subscription & billing">
        <ReviewRow label="Subscription model" value={sm.label} />
        <ReviewRow
          label="Flat fee"
          value={sm.flatMonthly > 0 ? `${formatINR(sm.flatMonthly)} / mo` : "No flat fee"}
          mono
        />
        {sm.commissionPct > 0 && (
          <ReviewRow label="Commission / trip" value={`${sm.commissionPct}%`} mono />
        )}
        <ReviewRow label="Plan tier" value={`${form.plan} · ${form.billingCycle}`} />
        <ReviewRow label="Payment method" value={form.paymentMethod} />
        <ReviewRow
          label="Public directory listing"
          value={form.directoryOptIn ? "Opted in" : "Not listed"}
        />
      </ReviewSection>
      {form.brokerProfile && (
        <ReviewSection title="Broker profile">
          <ReviewRow label="Broker code" value={form.brokerProfile.brokerCode} mono />
          <ReviewRow label="Markup" value={`${form.brokerProfile.markupPct}%`} mono />
          <ReviewRow label="Settlement cycle" value={form.brokerProfile.settlementCycle} />
          <ReviewRow label="GST treatment" value={form.brokerProfile.gstTreatment} />
          <ReviewRow
            label="Coverage lanes"
            value={
              form.brokerProfile.coverageLanes.length > 0
                ? form.brokerProfile.coverageLanes.join(", ")
                : "-"
            }
          />
        </ReviewSection>
      )}
      <ReviewSection title="Trial">
        <ReviewRow label="Trial length" value="7 days" mono />
        <ReviewRow
          label="Trial starts"
          value="On creation (now)"
        />
        <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Trial note: </span>
          Org gets a 15-day free trial starting from creation. MRR stays at{" "}
          <span className="font-medium text-foreground">₹0</span> until the
          trial converts to paid (use the “Convert to paid” action in the
          Organizations view).
        </div>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground text-right", mono && "tabular")}>
        {value}
      </span>
    </div>
  );
}
