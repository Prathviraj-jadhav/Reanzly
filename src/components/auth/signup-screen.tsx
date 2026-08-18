"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAppStore,
  type LegalEntityType,
  type BusinessType,
  type SubscriptionModel,
  type SignupRoleChoice,
  type SignupPayload,
  type BrokerProfile,
} from "@/lib/store/app-store";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import {
  ONBOARDING_MODULES,
  recommendedPackFor,
  SUBSCRIPTION_MODELS,
  moduleById,
  formatINR,
  type OnboardingModule,
} from "@/lib/onboarding/module-catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Btn } from "@/components/shared/btn";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Truck,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Lock,
  Mail,
  Check,
  Building2,
  User,
  Phone,
  CheckCircle2,
  PartyPopper,
  PackageCheck,
  Handshake,
  Warehouse,
  Boxes,
  Network,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Globe,
} from "lucide-react";

/* ============================================================
   SignupScreen - Smart Onboarding Wizard (AUTH-2 redesign)

   Five steps, one decision per step (Hick's Law):
     1. Business Type   - the smart selector that drives everything.
                          Picking a business type auto-populates the
                          recommended module pack in Step 3.
     2. Organisation    - company, legal entity, GSTIN, state,
                          fleet + headcount.
     3. Modules         - recommended modules pre-checked; user can
                          add/remove. Drives provisioned features.
     4. Subscription    - SaaS / Commission / Master + directory opt-in.
                          Broker variants default to Master.
     5. You + Review    - contact, password (with strength), role,
                          T&C consent, full review, submit.

   UX laws applied:
   - Hick's Law        - one decision per step.
   - Law of Proximity  - fields chunked with section labels.
   - Doherty Threshold - inline validation on blur, instant step nav.
   - Tesler's Law      - the wizard absorbs complexity (auto-selects
                         modules, auto-builds broker profile, sets
                         trial dates); the user just types and clicks.
   - Aesthetic-Usability - 6px radius, hairline borders, tabular mono,
                          no shadows, no hues, no emdashes.
   - Fitts's Law       - 44px primary CTA, 40px inputs, 44px touch targets.

   Monochrome Swiss design system. No hues, no shadows, no emdashes.
   ============================================================ */

const LEGAL_ENTITIES: LegalEntityType[] = [
  "Proprietorship",
  "Partnership",
  "Pvt Ltd",
  "LLP",
  "Public Ltd",
];

const BUSINESS_TYPES: {
  id: BusinessType;
  label: string;
  blurb: string;
  icon: typeof Truck;
}[] = [
  {
    id: "Transport",
    label: "Transport Operator",
    blurb: "Run full-truckload trips, dispatch, billing and drivers.",
    icon: Truck,
  },
  {
    id: "Fleet Owner",
    label: "Fleet Owner",
    blurb: "Own trucks - optimise utilisation, fuel, maintenance, drivers.",
    icon: Truck,
  },
  {
    id: "Freight Broker",
    label: "Freight Broker",
    blurb: "Resell capacity. Broker console, CRM, billing, lean ops.",
    icon: Handshake,
  },
  {
    id: "Warehouse",
    label: "Warehouse Operator",
    blurb: "Inbound, storage, outbound - the WMS-led operator.",
    icon: Warehouse,
  },
  {
    id: "3PL",
    label: "3PL Provider",
    blurb: "Transport + warehouse + brokerage - broadest stack.",
    icon: Boxes,
  },
  {
    id: "Reanzly Broker",
    label: "Reanzly Broker Partner",
    blurb: "Resell the full Reanzly stack under your own brand.",
    icon: Network,
  },
];

const INDIAN_STATES: string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const ROLE_CHOICES: { id: SignupRoleChoice; label: string; blurb: string }[] = [
  { id: "owner", label: "Owner / Director", blurb: "Full access across every module." },
  { id: "ops-manager", label: "Operations", blurb: "Trips, dispatch, fleet map, exceptions." },
  { id: "fleet-manager", label: "Fleet", blurb: "Vehicles, maintenance, compliance." },
  { id: "finance-manager", label: "Finance", blurb: "Invoices, payments, GST, ledger." },
  { id: "dispatcher", label: "Dispatcher", blurb: "Assign vehicles, track trips, POD." },
  { id: "broker", label: "Broker Desk", blurb: "Marketplace, loads, commissions, settlements." },
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const STEPS = [
  { id: 1, label: "Business", icon: Sparkles },
  { id: 2, label: "Organisation", icon: Building2 },
  { id: 3, label: "Modules", icon: PackageCheck },
  { id: 4, label: "Subscription", icon: ShieldCheck },
  { id: 5, label: "You & Review", icon: CheckCircle2 },
] as const;

type StepId = 1 | 2 | 3 | 4 | 5;

const ONBOARDING_SEGMENTS = [
  {
    id: "tms",
    name: "Transport Management Software (TMS)",
    description: "Trip Management, Operations Hub, Lorry Receipts (LR), Proof of Delivery (POD), and Planning.",
    moduleIds: ["trips", "operations-hub", "lorry-receipts", "pod", "planning", "dashboard", "chat"],
  },
  {
    id: "fleet",
    name: "Fleet Management Software",
    description: "Vehicle records, GPS Tracking & Live Map, Fuel Management, Maintenance, Inspections, and Compliance.",
    moduleIds: ["vehicles", "fleet-map", "fuel-energy", "maintenance", "inspection", "compliance", "workshop", "documents", "issues", "reminders"],
  },
  {
    id: "billing",
    name: "Billing & Invoicing",
    description: "GST-compliant invoicing, payments, receivables, expenses, rate cards, and double-entry accounting ledger.",
    moduleIds: ["invoice", "payments", "expenses", "ledger", "financial-ops", "rate-cards"],
  },
  {
    id: "wms",
    name: "Warehouse Management Software (WMS)",
    description: "Inbound stock, storage management, outbound, picking, packing, stock alerts, and multi-warehouse synchronization.",
    moduleIds: ["warehouse"],
  },
  {
    id: "crm",
    name: "Customer Relationship Management (CRM)",
    description: "Lead capture, client quotes, rate negotiation tracking, contract management, and sales pipelines.",
    moduleIds: ["crm"],
  },
  {
    id: "hrms",
    name: "HRMS & Payroll",
    description: "Driver profiles, attendance, wages, recruitment, interview scheduling, offer letters, and statutory payroll filings.",
    moduleIds: ["hr", "payroll", "drivers-staff"],
  },
];

const MODULE_CATEGORIES: OnboardingModule["category"][] = [
  "Operations",
  "Fleet",
  "Finance",
  "Compliance",
  "People",
  "Intelligence",
  "Broker",
];

interface FormState {
  // Step 1
  businessType: BusinessType | "";
  // Step 2
  companyName: string;
  legalEntity: LegalEntityType;
  gstin: string;
  registeredState: string;
  vehicleCount: string;
  employeeCount: string;
  // Step 3
  selectedModules: string[];
  // Step 4
  subscriptionModel: SubscriptionModel;
  directoryOptIn: boolean;
  // Step 5
  contactName: string;
  workEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  roleChoice: SignupRoleChoice;
  agreedToTerms: boolean;
}

const INITIAL: FormState = {
  businessType: "",
  companyName: "",
  legalEntity: "Pvt Ltd",
  gstin: "",
  registeredState: "Maharashtra",
  vehicleCount: "",
  employeeCount: "",
  selectedModules: [],
  subscriptionModel: "commission",
  directoryOptIn: true,
  contactName: "",
  workEmail: "",
  phone: "",
  password: "",
  confirmPassword: "",
  roleChoice: "owner",
  agreedToTerms: false,
};

function passwordStrength(pw: string): { label: string; score: 0 | 1 | 2 | 3 } {
  if (!pw) return { label: "Empty", score: 0 };
  let types = 0;
  if (/[a-z]/.test(pw)) types++;
  if (/[A-Z]/.test(pw)) types++;
  if (/[0-9]/.test(pw)) types++;
  if (/[^a-zA-Z0-9]/.test(pw)) types++;
  if (pw.length < 8) return { label: "Too short (need 8+)", score: 1 };
  if (types >= 3 && pw.length >= 10) return { label: "Strong", score: 3 };
  if (types >= 2) return { label: "Fair", score: 2 };
  return { label: "Weak", score: 1 };
}

function isBrokerVariant(bt: BusinessType | ""): bt is "Freight Broker" | "Reanzly Broker" {
  return bt === "Freight Broker" || bt === "Reanzly Broker";
}

function buildBrokerProfile(): BrokerProfile {
  // Auto-generate brokerCode + default markup 8%, settlementCycle Monthly.
  const code = `RZB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  return {
    brokerCode: code,
    markupPct: 8,
    settlementCycle: "Monthly",
    gstTreatment: "Forward Charge",
    coverageLanes: [],
  };
}

export function SignupScreen() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const selectedModuleForPurchase = useAppStore(
    (s) => s.selectedModuleForPurchase,
  );
  const setSelectedModuleForPurchase = useAppStore(
    (s) => s.setSelectedModuleForPurchase,
  );
  const signup = useAppStore((s) => s.signup);

  const [step, setStep] = useState<StepId>(1);
  const [maxStep, setMaxStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subdomain & Signuptype states
  const [signupSubdomain, setSignupSubdomain] = useState<"app" | "freight">("app");
  const [signupType, setSignupType] = useState<"business" | "driver" | "shipper" | "broker">("business");
  const [isSubdomainLocked, setIsSubdomainLocked] = useState(false);

  // Subdomain detection on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host.includes("reanzly.com")) {
        setIsSubdomainLocked(true);
        if (host.startsWith("freight.")) {
          setSignupSubdomain("freight");
          setSignupType("shipper");
        } else {
          setSignupSubdomain("app");
          setSignupType("business");
        }
      } else {
        setIsSubdomainLocked(false);
      }
    }
  }, []);

  // Driver/Individual tab state
  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "FTL Truck",
    vehiclePlate: "",
    password: "",
  });
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  // Shipper form state
  const [shipperForm, setShipperForm] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [shipperSubmitting, setShipperSubmitting] = useState(false);
  const [shipperError, setShipperError] = useState<string | null>(null);

  // Broker form state
  const [brokerForm, setBrokerForm] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    gstin: "",
    password: "",
  });
  const [brokerSubmitting, setBrokerSubmitting] = useState(false);
  const [brokerError, setBrokerError] = useState<string | null>(null);

  const isSegmentSelected = (seg: typeof ONBOARDING_SEGMENTS[0]) => {
    const count = seg.moduleIds.filter((id) => form.selectedModules.includes(id)).length;
    return count >= Math.max(1, seg.moduleIds.length / 2);
  };

  const toggleSegment = (seg: typeof ONBOARDING_SEGMENTS[0]) => {
    const isCurrentlySelected = isSegmentSelected(seg);
    setForm((f) => {
      let nextModules = new Set(f.selectedModules);
      if (isCurrentlySelected) {
        seg.moduleIds.forEach((id) => nextModules.delete(id));
      } else {
        seg.moduleIds.forEach((id) => nextModules.add(id));
      }
      nextModules.add("dashboard");
      nextModules.add("chat");
      nextModules.add("settings");
      return { ...f, selectedModules: Array.from(nextModules) };
    });
    setErrors((e) => {
      if (!e.selectedModules) return e;
      const next = { ...e };
      delete next.selectedModules;
      return next;
    });
  };

  async function handleDriverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (driverSubmitting) return;
    setDriverError(null);

    if (!driverForm.name.trim()) {
      setDriverError("Full name is required.");
      return;
    }
    if (!driverForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverForm.email.trim())) {
      setDriverError("Valid email is required.");
      return;
    }
    const cleanPhone = driverForm.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setDriverError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!driverForm.vehiclePlate.trim()) {
      setDriverError("Vehicle plate number is required.");
      return;
    }
    if (driverForm.password.length < 4) {
      setDriverError("Password needs at least 4 characters.");
      return;
    }

    setDriverSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...driverForm,
          phone: cleanPhone.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDriverError(data.error || "Driver signup failed.");
      } else {
        toast.success("Driver account and vehicle listed successfully!");
        useAppStore.getState().login(driverForm.email.trim(), "driver", "app", `Driver: ${driverForm.name.trim()}`);
      }
    } catch (err) {
      setDriverError("Could not reach the server. Try again.");
    } finally {
      setDriverSubmitting(false);
    }
  }

  async function handleShipperSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shipperSubmitting) return;
    setShipperError(null);

    if (!shipperForm.companyName.trim()) {
      setShipperError("Company name is required.");
      return;
    }
    if (!shipperForm.name.trim()) {
      setShipperError("Full name is required.");
      return;
    }
    if (!shipperForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipperForm.email.trim())) {
      setShipperError("Valid work email is required.");
      return;
    }
    const cleanPhone = shipperForm.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setShipperError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (shipperForm.password.length < 4) {
      setShipperError("Password needs at least 4 characters.");
      return;
    }

    setShipperSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup-shipper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shipperForm,
          phone: cleanPhone.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShipperError(data.error || "Shipper signup failed.");
      } else {
        toast.success("Shipper account created successfully!");
        useAppStore.getState().login(shipperForm.email.trim(), "customer", "vendor", shipperForm.companyName.trim());
      }
    } catch (err) {
      setShipperError("Could not reach the server. Try again.");
    } finally {
      setShipperSubmitting(false);
    }
  }

  async function handleBrokerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (brokerSubmitting) return;
    setBrokerError(null);

    if (!brokerForm.companyName.trim()) {
      setBrokerError("Brokerage company name is required.");
      return;
    }
    if (!brokerForm.name.trim()) {
      setBrokerError("Full name is required.");
      return;
    }
    if (!brokerForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brokerForm.email.trim())) {
      setBrokerError("Valid work email is required.");
      return;
    }
    const cleanPhone = brokerForm.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setBrokerError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!brokerForm.gstin.trim()) {
      setBrokerError("GSTIN / License number is required.");
      return;
    }
    if (brokerForm.password.length < 4) {
      setBrokerError("Password needs at least 4 characters.");
      return;
    }

    setBrokerSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup-broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...brokerForm,
          phone: cleanPhone.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBrokerError(data.error || "Broker signup failed.");
      } else {
        toast.success("Broker account created successfully!");
        useAppStore.getState().login(brokerForm.email.trim(), "broker", "broker", brokerForm.companyName.trim());
      }
    } catch (err) {
      setBrokerError("Could not reach the server. Try again.");
    } finally {
      setBrokerSubmitting(false);
    }
  }
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The recommended pack for the chosen business type - drives Step 3.
  const recommendedPack = useMemo(
    () => (form.businessType ? recommendedPackFor(form.businessType) : null),
    [form.businessType],
  );

  // Preselect from marketing site: if a product was clicked ("Buy this
  // product & sign up"), find the matching onboarding module and mark it
  // as a bonus preselect on top of the recommended pack. We don't auto-pick
  // a business type - the user must make that choice themselves (Hick's Law).
  const preselectedBonusModule = useMemo(() => {
    if (!selectedModuleForPurchase) return null;
    return (
      ONBOARDING_MODULES.find((m) => m.productId === selectedModuleForPurchase) ??
      null
    );
  }, [selectedModuleForPurchase]);

  // Clear the marketing preselect once we're done with it (so a fresh
  // signup attempt doesn't carry the old preselect).
  useEffect(() => {
    return () => setSelectedModuleForPurchase(undefined);
  }, [setSelectedModuleForPurchase]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const pwStrength = useMemo(
    () => passwordStrength(form.password),
    [form.password],
  );

  // ===== Smart auto-select: picking a business type pre-checks the
  // recommended module pack (and the bonus preselect if any). Broker
  // variants also default-select Master Subscription and the broker role. =====
  function applyBusinessType(bt: BusinessType) {
    const pack = recommendedPackFor(bt);
    const base = new Set<string>(pack.moduleIds);
    if (preselectedBonusModule) base.add(preselectedBonusModule.id);
    const broker = isBrokerVariant(bt);
    setForm((f) => ({
      ...f,
      businessType: bt,
      selectedModules: Array.from(base),
      subscriptionModel: broker ? "master" : f.subscriptionModel,
      roleChoice:
        broker
          ? "broker"
          : f.roleChoice === "broker"
            ? "owner"
            : f.roleChoice,
    }));
    setErrors((e) => {
      if (!e.businessType) return e;
      const next = { ...e };
      delete next.businessType;
      return next;
    });
  }

  // ===== Step validation =====
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.businessType) e.businessType = "Pick a business type to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "Company name is required.";
    if (!form.gstin.trim()) e.gstin = "GSTIN is required.";
    else if (!GSTIN_REGEX.test(form.gstin.trim().toUpperCase()))
      e.gstin = "GSTIN format looks off. It is 15 chars, e.g. 27ABCDE1234F1Z5.";
    if (!form.registeredState) e.registeredState = "Pick a state.";
    if (!form.vehicleCount || Number(form.vehicleCount) < 0)
      e.vehicleCount = "Enter the number of vehicles (0 or more).";
    if (!form.employeeCount || Number(form.employeeCount) < 1)
      e.employeeCount = "Enter your headcount (1 or more).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {};
    if (form.selectedModules.length === 0)
      e.selectedModules = "Select at least one module. Reset to recommended to start fresh.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep4(): boolean {
    // Subscription model is always set (default "commission"); nothing to validate.
    setErrors({});
    return true;
  }

  function validateStep5(): boolean {
    const e: Record<string, string> = {};
    if (!form.contactName.trim()) e.contactName = "Your name is required.";
    if (!form.workEmail.trim()) e.workEmail = "Work email is required.";
    else if (!EMAIL_REGEX.test(form.workEmail.trim()))
      e.workEmail = "That email does not look right.";
    const digits = form.phone.replace(/\D/g, "").slice(-10);
    if (!digits) e.phone = "Phone is required.";
    else if (!PHONE_REGEX.test(digits))
      e.phone = "Enter a valid 10-digit Indian mobile.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "At least 8 characters.";
    if (form.confirmPassword !== form.password)
      e.confirmPassword = "Passwords do not match.";
    if (!form.agreedToTerms) e.agreedToTerms = "Please accept the terms to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function gotoStep(target: StepId) {
    if (target <= maxStep) setStep(target);
  }

  function next() {
    let ok = true;
    if (step === 1) ok = validateStep1();
    else if (step === 2) ok = validateStep2();
    else if (step === 3) ok = validateStep3();
    else if (step === 4) ok = validateStep4();
    if (!ok) return;
    if (step < 5) {
      const target = (step + 1) as StepId;
      setStep(target);
      if (target > maxStep) setMaxStep(target);
    }
  }

  function back() {
    if (step > 1) setStep((step - 1) as StepId);
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!validateStep5()) return;
    if (!form.businessType) return;

    setSubmitting(true);
    const payload: SignupPayload = {
      companyName: form.companyName.trim(),
      legalEntity: form.legalEntity,
      gstin: form.gstin.trim().toUpperCase(),
      registeredState: form.registeredState,
      businessType: form.businessType,
      vehicleCount: Number(form.vehicleCount),
      employeeCount: Number(form.employeeCount),
      selectedModules: form.selectedModules,
      subscriptionModel: form.subscriptionModel,
      brokerProfile: isBrokerVariant(form.businessType) ? buildBrokerProfile() : undefined,
      directoryOptIn: form.directoryOptIn,
      contactName: form.contactName.trim(),
      workEmail: form.workEmail.trim(),
      phone: form.phone.replace(/\D/g, "").slice(-10),
      password: form.password,
      roleChoice: form.roleChoice,
      agreedToTerms: form.agreedToTerms,
    };

    const res = await signup(payload);
    if (res.ok) {
      toast.success("Account created. Your 15-day free trial is live.", {
        description: "Reanzly staff will review your request in the SuperAdmin panel.",
      });
    } else {
      setSubmitting(false);
      setErrors((e) => ({ ...e, api: res.error || "Failed to create account." }));
    }
  }

  // First error on the current step (for the bottom validation strip).
  const firstError: string | undefined = useMemo(() => {
    if (step === 1) return errors.businessType;
    if (step === 2)
      return (
        errors.companyName ||
        errors.gstin ||
        errors.registeredState ||
        errors.vehicleCount ||
        errors.employeeCount
      );
    if (step === 3) return errors.selectedModules;
    if (step === 5)
      return (
        errors.contactName ||
        errors.workEmail ||
        errors.phone ||
        errors.password ||
        errors.confirmPassword ||
        errors.agreedToTerms
      );
    return undefined;
  }, [step, errors]);

  const chosenRole = ROLE_ARCHETYPES.find((r) => r.id === form.roleChoice);
  const chosenBusinessType = BUSINESS_TYPES.find((b) => b.id === form.businessType);
  const monthlyEstimate = useMemo(
    () =>
      form.selectedModules.reduce((sum, id) => {
        const m = moduleById(id);
        return sum + (m?.pricePerMonth ?? 0);
      }, 0),
    [form.selectedModules],
  );
  const chosenSubscription = SUBSCRIPTION_MODELS.find(
    (s) => s.id === form.subscriptionModel,
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {!isSubdomainLocked && (
        <div className="z-50 flex items-center justify-center gap-2 border-b border-yellow-500/20 bg-yellow-500/5 py-1 text-[11px] text-yellow-600 dark:text-yellow-400">
          <span className="font-semibold uppercase tracking-wider">Preview Subdomain:</span>
          <button
            type="button"
            onClick={() => {
              setSignupSubdomain("app");
              setSignupType("business");
            }}
            className={cn(
              "px-2 py-0.5 rounded transition-colors font-mono",
              signupSubdomain === "app" ? "bg-yellow-500 text-background font-semibold" : "hover:bg-yellow-500/20"
            )}
          >
            app.reanzly.com (Fleet App)
          </button>
          <button
            type="button"
            onClick={() => {
              setSignupSubdomain("freight");
              setSignupType("shipper");
            }}
            className={cn(
              "px-2 py-0.5 rounded transition-colors font-mono",
              signupSubdomain === "freight" ? "bg-yellow-500 text-background font-semibold" : "hover:bg-yellow-500/20"
            )}
          >
            freight.reanzly.com (Marketplace)
          </button>
        </div>
      )}
      {/* Top hairline brand bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
            RZ
          </span>
          <span className="text-[13px] font-semibold tracking-tight">Reanzly</span>
          <span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            Logistics OS
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setMarketingView("landing")}
            className="tap flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to website</span>
            <span className="sm:hidden">Website</span>
          </button>
          <span className="h-3 w-px bg-border" />
          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            className="tap flex items-center gap-1 transition-colors hover:text-foreground"
          >
            Sign in
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Brand panel - desktop only */}
        <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-foreground p-10 text-background lg:flex">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <span className="text-[13px] font-medium uppercase tracking-[0.16em]">
              Start your 15-day free trial
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="max-w-md text-[40px] font-semibold leading-[1.05] tracking-tight">
              Smart onboarding. Pick a business type, we tailor the rest.
            </h1>
            <p className="max-w-md text-[14px] leading-relaxed text-background/70">
              We auto-recommend the modules, subscription model and broker tools
              that fit how you move freight. Edit anything you like. Trial
              includes every module you pick for 15 days, free.
            </p>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-background/20 bg-background/20">
              <div className="bg-foreground p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-background/60">
                  Setup time
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums">4 min</p>
              </div>
              <div className="bg-foreground p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-background/60">
                  Free trial
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums">15 days</p>
              </div>
              <div className="bg-foreground p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-background/60">
                  Modules
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums">30</p>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                "Pick a business type - we auto-select your modules",
                "SaaS, commission or master subscription - your call",
                "Listed on the Reanzly directory (free, SEO-ranked)",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[13px] text-background/80">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-background/60" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-background/50">
            <span className="font-mono">app.reanzly.com</span>
            <span>.</span>
            <span>Mumbai . Pune . Delhi . Bengaluru</span>
          </div>

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
        </section>

        {/* Form panel */}
        <section className="relative flex flex-1 flex-col overflow-hidden">
          {/* Signup Type Selection Tabs */}
          <div className="z-20 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:px-8 flex justify-center shrink-0">
            <div className="grid grid-cols-2 gap-1 rounded-[6px] border border-border bg-muted/30 p-1 w-full max-w-[400px]">
              {signupSubdomain === "freight" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSignupType("shipper")}
                    className={cn(
                      "rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors text-center",
                      signupType === "shipper"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Shipper / Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupType("broker")}
                    className={cn(
                      "rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors text-center",
                      signupType === "broker"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Freight Broker
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSignupType("business")}
                    className={cn(
                      "rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors text-center",
                      signupType === "business"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Logistics Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupType("driver")}
                    className={cn(
                      "rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors text-center",
                      signupType === "driver"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Individual Driver
                  </button>
                </>
              )}
            </div>
          </div>

          {signupType === "business" && (
          <>
          {/* Stepper - sits at top of the right panel (sticky-feeling via flex column) */}
          <div className="z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
            <div className="mx-auto flex max-w-[640px] items-center gap-1 overflow-x-auto no-scrollbar sm:gap-0">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = step > s.id;
                const active = step === s.id;
                const reachable = s.id <= maxStep;
                return (
                  <div key={s.id} className="flex flex-1 items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => gotoStep(s.id as StepId)}
                      className={cn(
                        "flex items-center gap-2 rounded-[5px] px-1.5 py-1 text-left transition-colors",
                        reachable ? "tap cursor-pointer hover:bg-accent" : "cursor-not-allowed opacity-50",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-semibold tabular-nums transition-colors",
                          (done || active) && "border-foreground bg-foreground text-background",
                          !done && !active && "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <span
                        className={cn(
                          "hidden whitespace-nowrap text-[12px] font-medium md:block",
                          active || done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-px flex-1 transition-colors",
                          done ? "bg-foreground" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mx-auto mt-1.5 max-w-[640px] text-[11px] text-muted-foreground tabular-nums">
              Step {step} of 5
            </p>
          </div>

          {/* Scrollable wizard body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-8 sm:py-8">
              {/* Mobile brand line */}
              <div className="mb-4 flex items-center gap-2 lg:hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[12px] font-bold text-background">
                  RZ
                </span>
                <span className="text-[15px] font-semibold tracking-tight">Reanzly</span>
              </div>

              {/* ===== STEP 1: Business Type ===== */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">
                      What best describes your business?
                    </h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      This drives everything - we pre-pick the modules, broker tools
                      and subscription that fit how you operate. You can change it later.
                    </p>
                  </div>

                  {preselectedBonusModule && (
                    <div className="rounded-[6px] border border-dashed border-border bg-accent/30 px-3 py-2 text-[11px] text-muted-foreground">
                      <PackageCheck className="mr-1 inline h-3 w-3" />
                      You came from the <span className="font-medium text-foreground">{preselectedBonusModule.name}</span> product page - it will be pre-checked in your modules.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {BUSINESS_TYPES.map((bt) => {
                      const active = form.businessType === bt.id;
                      const Icon = bt.icon;
                      return (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => applyBusinessType(bt.id)}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-[6px] border p-3 text-left transition-colors tap",
                            active
                              ? "border-foreground bg-foreground/[0.04]"
                              : "border-border bg-background hover:bg-accent hover:border-foreground/30",
                          )}
                          aria-pressed={active}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-[5px] border",
                                  active
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border bg-background text-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="text-[13px] font-semibold tracking-tight">{bt.label}</span>
                            </div>
                            {active && (
                              <Check className="h-4 w-4 shrink-0 text-foreground" />
                            )}
                          </div>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {bt.blurb}
                          </span>
                          {active && recommendedPack && (
                            <span className="mt-1 flex items-start gap-1 rounded-[4px] bg-background/60 px-2 py-1 text-[10px] leading-snug text-foreground">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                              {recommendedPack.rationale}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <StepNav
                    onNext={next}
                    nextLabel="Continue to organisation"
                    showBack={false}
                    disabled={!form.businessType}
                  />
                </div>
              )}

              {/* ===== STEP 2: Organisation ===== */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">Your organisation</h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Tell us about the company. You can edit all of this later in Settings.
                    </p>
                  </div>

                  <Field label="Company name" error={errors.companyName} required>
                    <Input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                      placeholder="e.g. Reanzly Logistics Pvt Ltd"
                      className={inputCls(errors.companyName)}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Legal entity" required>
                      <SelectField
                        value={form.legalEntity}
                        onChange={(v) => set("legalEntity", v as LegalEntityType)}
                        options={LEGAL_ENTITIES}
                      />
                    </Field>
                    <Field label="Registered state" error={errors.registeredState} required>
                      <SelectField
                        value={form.registeredState}
                        onChange={(v) => set("registeredState", v)}
                        options={INDIAN_STATES}
                      />
                    </Field>
                  </div>

                  <Field
                    label="GSTIN"
                    error={errors.gstin}
                    required
                    hint="15-character GST identification number"
                  >
                    <Input
                      type="text"
                      value={form.gstin}
                      onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                      placeholder="27ABCDE1234F1Z5"
                      maxLength={15}
                      className={cn(inputCls(errors.gstin), "font-mono tracking-wider")}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Number of vehicles" error={errors.vehicleCount} required>
                      <Input
                        type="number"
                        min={0}
                        value={form.vehicleCount}
                        onChange={(e) => set("vehicleCount", e.target.value)}
                        placeholder="e.g. 12"
                        className={cn(inputCls(errors.vehicleCount), "tabular-nums")}
                      />
                    </Field>
                    <Field label="Number of employees" error={errors.employeeCount} required>
                      <Input
                        type="number"
                        min={1}
                        value={form.employeeCount}
                        onChange={(e) => set("employeeCount", e.target.value)}
                        placeholder="e.g. 24"
                        className={cn(inputCls(errors.employeeCount), "tabular-nums")}
                      />
                    </Field>
                  </div>

                  <StepNav
                    onBack={back}
                    onNext={next}
                    nextLabel="Continue to modules"
                  />
                </div>
              )}

              {/* ===== STEP 3: Modules & Features ===== */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">
                      Modules &amp; features
                    </h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Recommended modules for{" "}
                      <span className="font-medium text-foreground">
                        {chosenBusinessType?.label ?? "your business"}
                      </span>{" "}
                      are pre-checked. Add or remove - your trial includes every
                      module you pick, free for 7 days.
                    </p>
                  </div>

                  {recommendedPack && (
                    <div className="flex items-start gap-2 rounded-[6px] border border-foreground/20 bg-foreground/[0.03] px-3 py-2 text-[11px] leading-snug text-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{recommendedPack.rationale}</span>
                    </div>
                  )}

                  {/* Onboarding Segments list */}
                  <div className="space-y-3">
                    {ONBOARDING_SEGMENTS.map((seg) => {
                      const isSelected = isSegmentSelected(seg);
                      return (
                        <div
                          key={seg.id}
                          onClick={() => toggleSegment(seg)}
                          className={cn(
                            "flex items-start gap-3 rounded-[8px] border p-4 cursor-pointer transition-colors tap",
                            isSelected
                              ? "border-foreground bg-foreground/[0.03]"
                              : "border-border bg-background hover:bg-accent"
                          )}
                        >
                          <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[3px] border border-foreground/30 bg-background">
                            {isSelected && <Check className="h-3 w-3 text-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-foreground leading-snug">
                              {seg.name}
                            </p>
                            <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
                              {seg.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live summary + reset footer */}
                  <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[6px] sm:border sm:px-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] text-muted-foreground">Pricing Tier:</span>
                      <span className="text-[14px] font-semibold text-foreground">
                        {chosenSubscription?.label || "Freemium"}
                      </span>
                    </div>
                    <Btn
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (!recommendedPack) return;
                        const base = new Set<string>(recommendedPack.moduleIds);
                        if (preselectedBonusModule) base.add(preselectedBonusModule.id);
                        set("selectedModules", Array.from(base));
                        toast.success("Reset to recommended modules.");
                      }}
                    >
                      Reset to recommended
                    </Btn>
                  </div>

                  <StepNav
                    onBack={back}
                    onNext={next}
                    nextLabel="Continue to subscription"
                  />
                </div>
              )}

              {/* ===== STEP 4: Subscription Model + Directory opt-in ===== */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">
                      Subscription model
                    </h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Pick how you pay Reanzly. Switch tiers anytime from Settings → Billing.
                    </p>
                  </div>

                  {isBrokerVariant(form.businessType) && (
                    <div className="flex items-start gap-2 rounded-[6px] border border-foreground/20 bg-foreground/[0.03] px-3 py-2 text-[11px] leading-snug text-foreground">
                      <Network className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Broker partners get the broker console + marketplace + settlements
                        (already in your modules). Master Subscription is pre-selected so
                        you can resell under your own brand from day one.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    {SUBSCRIPTION_MODELS.map((model) => {
                      const active = form.subscriptionModel === model.id;
                      const priceLabel =
                        model.flatMonthly > 0
                          ? `${formatINR(model.flatMonthly)}/mo`
                          : `${model.commissionPct}% per trip`;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => set("subscriptionModel", model.id)}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-[6px] border p-3 text-left transition-colors tap",
                            active
                              ? "border-foreground bg-foreground/[0.04]"
                              : "border-border bg-background hover:bg-accent hover:border-foreground/30",
                          )}
                          aria-pressed={active}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                  active
                                    ? "border-foreground bg-foreground"
                                    : "border-border bg-background",
                                )}
                              >
                                {active && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                              </span>
                              <span className="text-[13px] font-semibold tracking-tight">
                                {model.label}
                              </span>
                              {model.recommended && (
                                <span className="rounded-[3px] border border-foreground px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.1em] text-foreground">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] font-semibold tabular-nums">
                              {priceLabel}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {model.tagline}
                          </span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {model.description}
                          </span>
                          <ul className="mt-1 grid w-full grid-cols-1 gap-1 sm:grid-cols-2">
                            {model.features.map((f) => (
                              <li
                                key={f}
                                className="flex items-start gap-1.5 text-[11px] text-foreground/80"
                              >
                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>

                  {/* Directory opt-in */}
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-[6px] border p-3 transition-colors",
                      form.directoryOptIn ? "border-foreground" : "border-border",
                    )}
                  >
                    <Switch
                      checked={form.directoryOptIn}
                      onCheckedChange={(v) => set("directoryOptIn", v)}
                      className="mt-0.5 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[13px] font-medium">
                          List my company on the Reanzly public directory
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Free, SEO-ranked, gets you inbound load enquiries on
                        <span className="font-medium text-foreground"> directory.reanzly.com</span>.
                        Buyers searching &ldquo;logistics company in {form.registeredState || "your city"}&rdquo;
                        will find you.
                      </p>
                    </div>
                  </div>

                  <StepNav
                    onBack={back}
                    onNext={next}
                    nextLabel="Continue to your details"
                  />
                </div>
              )}

              {/* ===== STEP 5: You + Review ===== */}
              {step === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">You &amp; review</h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      The primary contact for this account. You will be the first admin.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name" error={errors.contactName} required>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          value={form.contactName}
                          onChange={(e) => set("contactName", e.target.value)}
                          placeholder="e.g. Vikram Deshmukh"
                          className={cn(inputCls(errors.contactName), "pl-9")}
                        />
                      </div>
                    </Field>
                    <Field label="Work email" error={errors.workEmail} required>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          value={form.workEmail}
                          onChange={(e) => set("workEmail", e.target.value)}
                          placeholder="you@company.in"
                          className={cn(inputCls(errors.workEmail), "pl-9")}
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Phone" error={errors.phone} required>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">
                          +91
                        </span>
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          placeholder="98765 43210"
                          maxLength={10}
                          className={cn(inputCls(errors.phone), "pl-[60px] tabular-nums")}
                        />
                      </div>
                    </Field>
                    <Field label="Your role in the company" required>
                      <SelectField
                        options={ROLE_CHOICES.map((r) => r.label)}
                        valueIndex={ROLE_CHOICES.findIndex((r) => r.id === form.roleChoice)}
                        onIndexChange={(i) => set("roleChoice", ROLE_CHOICES[i].id)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Password" error={errors.password} required>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPw ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          placeholder="8+ chars, mix it up"
                          className={cn(inputCls(errors.password), "pl-9 pr-10")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={showPw ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {form.password && (
                        <StrengthMeter strength={pwStrength} />
                      )}
                    </Field>
                    <Field label="Confirm password" error={errors.confirmPassword} required>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPw ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => set("confirmPassword", e.target.value)}
                          placeholder="Re-enter the same password"
                          className={cn(inputCls(errors.confirmPassword), "pl-9")}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Review summary grid */}
                  <div className="rounded-[6px] border border-border bg-card overflow-hidden">
                    <ReviewSection title="Organisation" icon={Building2}>
                      <ReviewRow label="Company" value={form.companyName} />
                      <ReviewRow label="Legal entity" value={form.legalEntity} />
                      <ReviewRow label="GSTIN" value={form.gstin} mono />
                      <ReviewRow label="State" value={form.registeredState} />
                      <ReviewRow label="Business type" value={chosenBusinessType?.label ?? form.businessType} />
                      <ReviewRow label="Fleet size" value={`${form.vehicleCount} vehicles`} />
                      <ReviewRow label="Headcount" value={`${form.employeeCount} employees`} />
                    </ReviewSection>
                    <div className="h-px bg-border" />
                    <ReviewSection title="Modules & subscription" icon={PackageCheck}>
                      <ReviewRow
                        label="Modules selected"
                        value={`${form.selectedModules.length} modules`}
                      />
                      <ReviewRow
                        label="Plan Pricing"
                        value={
                          chosenSubscription
                            ? chosenSubscription.flatMonthly > 0
                              ? `${formatINR(chosenSubscription.flatMonthly)}/mo + ${chosenSubscription.commissionPct}% commission`
                              : chosenSubscription.commissionPct > 0
                                ? `₹0 flat + ${chosenSubscription.commissionPct}% commission`
                                : "Free (Co-branded)"
                            : "Billed under chosen plan"
                        }
                        mono
                      />
                      <ReviewRow label="Subscription" value={chosenSubscription?.label ?? form.subscriptionModel} />
                      <ReviewRow
                        label="Directory listing"
                        value={form.directoryOptIn ? "Opted in (free)" : "Off"}
                      />
                      <ReviewRow
                        label="Broker tools"
                        value={
                          isBrokerVariant(form.businessType)
                            ? "Yes · code auto-generated on submit"
                            : "Not applicable"
                        }
                      />
                      <ReviewRow label="Trial" value="15 days free" />
                    </ReviewSection>
                    <div className="h-px bg-border" />
                    <ReviewSection title="Primary contact" icon={User}>
                      <ReviewRow label="Name" value={form.contactName} />
                      <ReviewRow label="Email" value={form.workEmail} mono />
                      <ReviewRow label="Phone" value={form.phone ? `+91 ${form.phone}` : ""} mono />
                      <ReviewRow label="Role" value={chosenRole?.name ?? form.roleChoice} />
                    </ReviewSection>
                  </div>

                  {/* Terms consent */}
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-[6px] border p-3 transition-colors",
                      errors.agreedToTerms ? "border-foreground" : "border-border",
                    )}
                  >
                    <Checkbox
                      checked={form.agreedToTerms}
                      onCheckedChange={(v) => set("agreedToTerms", v === true)}
                      className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground"
                    />
                    <span className="text-[12px] leading-relaxed text-muted-foreground">
                      I agree to the Reanzly{" "}
                      <span className="font-medium text-foreground">Terms of Service</span> and{" "}
                      <span className="font-medium text-foreground">Privacy Policy</span>. I
                      understand my data is stored in India under DPDP compliance and that
                      Reanzly staff may review this signup request.
                    </span>
                  </label>

                  <div className="rounded-[6px] border border-dashed border-border bg-accent/30 px-3 py-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="mr-1 inline h-3 w-3" />
                    Your request will be reviewed by Reanzly staff in the SuperAdmin panel.
                    The trial starts immediately either way.
                  </div>

                  {/* Submit */}
                  {errors.api && (
                    <p className="rounded-[5px] border border-border bg-accent/40 px-3 py-2 text-[12px] text-foreground">
                      {errors.api}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="tap mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Provisioning your workspace
                      </>
                    ) : (
                      <>
                        <PartyPopper className="h-4 w-4" />
                        Create account &amp; start 15-day free trial
                      </>
                    )}
                  </button>

                  <StepNav
                    onBack={back}
                    onNext={() => {}}
                    nextLabel=""
                    hideNext
                  />
                </div>
              )}

              {/* Footer note */}
              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setAuthMode("signin")}
                  className="font-medium text-foreground hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
          </>
          )}

          {signupType === "driver" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="mx-auto w-full max-w-[480px] px-4 py-8 sm:px-8">
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold tracking-tight">Driver Registration</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    Join the Reanzly marketplace as an individual driver. Register your profile, list your vehicle and get loads instantly.
                  </p>
                </div>

                <form onSubmit={handleDriverSubmit} className="space-y-4" noValidate>
                  {/* Name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Full Name
                    </span>
                    <input
                      type="text"
                      value={driverForm.name}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                      placeholder="e.g. Kuldeep Singh"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Work Email
                    </span>
                    <input
                      type="email"
                      value={driverForm.email}
                      onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                      placeholder="e.g. kuldeep.singh@reanzly.in"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Phone */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Contact Phone
                    </span>
                    <input
                      type="tel"
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Vehicle Type */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Vehicle Type
                    </span>
                    <select
                      value={driverForm.vehicleType}
                      onChange={(e) => setDriverForm({ ...driverForm, vehicleType: e.target.value })}
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    >
                      <option value="FTL Truck">Full Truck Load (FTL) Truck</option>
                      <option value="LTL Tempo">Light Commercial (LTL) Tempo</option>
                      <option value="Tanker">Chemical/Liquid Tanker</option>
                      <option value="Flatbed">Flatbed Trailer</option>
                      <option value="Container">Intermodal Container</option>
                    </select>
                  </label>

                  {/* Vehicle Plate */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Vehicle License Plate Number
                    </span>
                    <input
                      type="text"
                      value={driverForm.vehiclePlate}
                      onChange={(e) => setDriverForm({ ...driverForm, vehiclePlate: e.target.value })}
                      placeholder="e.g. MH 12 AB 1234"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Password */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Password
                    </span>
                    <input
                      type="password"
                      value={driverForm.password}
                      onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                      placeholder="Minimum 4 characters"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {driverError && (
                    <p className="rounded-[5px] border border-border bg-accent/40 px-3 py-2 text-[12px] text-foreground">
                      {driverError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={driverSubmitting}
                    className="tap mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  >
                    {driverSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating driver profile...
                      </>
                    ) : (
                      <>
                        Join Reanzly &amp; List Vehicle
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to login footer */}
                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setAuthMode("signin")}
                    className="font-medium text-foreground hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {signupType === "shipper" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin animate-fade-in">
              <div className="mx-auto w-full max-w-[480px] px-4 py-8 sm:px-8">
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold tracking-tight">Shipper Registration</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    Join the Reanzly Marketplace as a Shipper. Post loads, find verified vehicles, request instant bookings, and track your shipments end-to-end.
                  </p>
                </div>

                <form onSubmit={handleShipperSubmit} className="space-y-4" noValidate>
                  {/* Company Name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Company / Shipper Name
                    </span>
                    <input
                      type="text"
                      value={shipperForm.companyName}
                      onChange={(e) => setShipperForm({ ...shipperForm, companyName: e.target.value })}
                      placeholder="e.g. Acme Logistics India"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Contact Person Full Name
                    </span>
                    <input
                      type="text"
                      value={shipperForm.name}
                      onChange={(e) => setShipperForm({ ...shipperForm, name: e.target.value })}
                      placeholder="e.g. Vikram Deshmukh"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Work Email
                    </span>
                    <input
                      type="email"
                      value={shipperForm.email}
                      onChange={(e) => setShipperForm({ ...shipperForm, email: e.target.value })}
                      placeholder="e.g. you@acme.in"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Phone */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Contact Phone
                    </span>
                    <input
                      type="tel"
                      value={shipperForm.phone}
                      onChange={(e) => setShipperForm({ ...shipperForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Password */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Password
                    </span>
                    <input
                      type="password"
                      value={shipperForm.password}
                      onChange={(e) => setShipperForm({ ...shipperForm, password: e.target.value })}
                      placeholder="Minimum 4 characters"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {shipperError && (
                    <p className="rounded-[5px] border border-border bg-accent/40 px-3 py-2 text-[12px] text-foreground">
                      {shipperError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={shipperSubmitting}
                    className="tap mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  >
                    {shipperSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating shipper profile...
                      </>
                    ) : (
                      <>
                        Join Reanzly as Shipper
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to login footer */}
                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setAuthMode("signin")}
                    className="font-medium text-foreground hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {signupType === "broker" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin animate-fade-in">
              <div className="mx-auto w-full max-w-[480px] px-4 py-8 sm:px-8">
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold tracking-tight">Freight Broker Registration</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    Resell Reanzly capacity with your own markup. Build your network, manage enquiries, coordinate transportation, and automate settlements.
                  </p>
                </div>

                {/* Visual Listing of Broker Features */}
                <div className="mb-6 rounded-[6px] border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Features Unlocked with Broker Account
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Broker Console - manage multiple loads & bookings from one dashboard.",
                      "Custom Markup - automatically apply your commission rate (default 8%).",
                      "Sub-Broker Program - onboard & coordinate capacity across sub-agents.",
                      "Marketplace Integration - match shippers with available vehicles in real-time.",
                      "Automated NACH Settlements - get paid and settle trip payouts seamlessly.",
                    ].map((feature) => {
                      const [title, desc] = feature.split(" - ");
                      return (
                        <li key={title} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                          <div>
                            <span className="font-semibold text-foreground">{title}</span>: {desc}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <form onSubmit={handleBrokerSubmit} className="space-y-4" noValidate>
                  {/* Company Name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Brokerage Company Name
                    </span>
                    <input
                      type="text"
                      value={brokerForm.companyName}
                      onChange={(e) => setBrokerForm({ ...brokerForm, companyName: e.target.value })}
                      placeholder="e.g. Eagle Freight Solutions"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Broker Name (Full Name)
                    </span>
                    <input
                      type="text"
                      value={brokerForm.name}
                      onChange={(e) => setBrokerForm({ ...brokerForm, name: e.target.value })}
                      placeholder="e.g. Vikram Deshmukh"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Work Email
                    </span>
                    <input
                      type="email"
                      value={brokerForm.email}
                      onChange={(e) => setBrokerForm({ ...brokerForm, email: e.target.value })}
                      placeholder="e.g. you@eaglefreight.in"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Phone */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Contact Phone
                    </span>
                    <input
                      type="tel"
                      value={brokerForm.phone}
                      onChange={(e) => setBrokerForm({ ...brokerForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* GSTIN */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      GSTIN / Brokerage License
                    </span>
                    <input
                      type="text"
                      value={brokerForm.gstin}
                      onChange={(e) => setBrokerForm({ ...brokerForm, gstin: e.target.value })}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {/* Password */}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Password
                    </span>
                    <input
                      type="password"
                      value={brokerForm.password}
                      onChange={(e) => setBrokerForm({ ...brokerForm, password: e.target.value })}
                      placeholder="Minimum 4 characters"
                      className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground"
                    />
                  </label>

                  {brokerError && (
                    <p className="rounded-[5px] border border-border bg-accent/40 px-3 py-2 text-[12px] text-foreground">
                      {brokerError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={brokerSubmitting}
                    className="tap mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  >
                    {brokerSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating broker profile...
                      </>
                    ) : (
                      <>
                        Join Reanzly as Broker
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to login footer */}
                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setAuthMode("signin")}
                    className="font-medium text-foreground hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Validation strip - bottom of right panel */}
          {firstError && (
            <div
              className="flex items-center gap-2 border-t border-foreground/20 bg-foreground/[0.04] px-4 py-2 text-[11px] text-foreground animate-fade-in sm:px-8"
              role="alert"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>{firstError}</span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ============================================================
   Field primitives - keep the form visually consistent.
   ============================================================ */

function inputCls(error?: string): string {
  return cn(
    "h-11 w-full rounded-[6px] border border-border bg-background px-3 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground",
    error && "border-foreground",
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-foreground">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>
      )}
      {error && <span className="mt-1 block text-[11px] text-foreground">{error}</span>}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  valueIndex,
  onIndexChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
  options: string[];
  // Optional index-based control (used by role choice where label and id differ)
  valueIndex?: number;
  onIndexChange?: (i: number) => void;
}) {
  // Resolve the current value: prefer index-based, fall back to value-based.
  const currentValue = valueIndex !== undefined ? options[valueIndex] : value;
  return (
    <Select
      value={currentValue}
      onValueChange={(v) => {
        if (onIndexChange) {
          const i = options.indexOf(v);
          if (i >= 0) onIndexChange(i);
        } else {
          onChange?.(v);
        }
      }}
    >
      <SelectTrigger className="h-11 w-full rounded-[6px] border border-border bg-background px-3 text-[14px] focus:border-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[280px]">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-[13px]">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StrengthMeter({
  strength,
}: {
  strength: { label: string; score: 0 | 1 | 2 | 3 };
}) {
  const bars = [1, 2, 3];
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {bars.map((b) => (
          <div
            key={b}
            className={cn(
              "h-1 flex-1 rounded-[2px] transition-colors",
              strength.score >= b ? "bg-foreground" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{strength.label}</span>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel,
  showBack = true,
  hideNext = false,
  disabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  showBack?: boolean;
  hideNext?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {showBack && onBack && (
        <Btn
          variant="outline"
          size="lg"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={onBack}
        >
          Back
        </Btn>
      )}
      {!hideNext && (
        <Btn
          variant="primary"
          size="lg"
          block
          iconRight={<ArrowRight className="h-4 w-4" />}
          onClick={onNext}
          disabled={disabled}
        >
          {nextLabel}
        </Btn>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{children}</div>
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
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] font-medium text-foreground",
          mono && "font-mono tabular-nums",
        )}
      >
        {value || "-"}
      </span>
    </div>
  );
}

/* ============================================================
   ModuleCategorySection - collapsible category group on Step 3.
   ============================================================ */

function ModuleCategorySection({
  category,
  modules,
  selectedCount,
  allSelected,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  category: OnboardingModule["category"];
  modules: OnboardingModule[];
  selectedCount: number;
  allSelected: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const ids = modules.map((m) => m.id);
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left tap"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  !open && "-rotate-90",
                )}
              />
              <span className="text-[12px] font-semibold tracking-tight">{category}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {selectedCount}/{modules.length}
              </span>
            </button>
          </CollapsibleTrigger>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll(ids, !allSelected);
            }}
            className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground tap"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
        <CollapsibleContent>
          <div className="divide-y divide-border border-t border-border">
            {modules.map((m) => {
              const checked = selectedIds.includes(m.id);
              const isFree = m.pricePerMonth === 0;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors tap hover:bg-accent/40",
                    checked && "bg-foreground/[0.03]",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(m.id)}
                    className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium leading-tight">{m.name}</span>
                      <span className="text-[11px] font-semibold tabular-nums text-foreground shrink-0">
                        {isFree ? "Included" : `${formatINR(m.pricePerMonth)}/mo`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {m.description}
                    </p>
                    <span className="inline-flex rounded-[3px] border border-border bg-background px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      {m.category}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
