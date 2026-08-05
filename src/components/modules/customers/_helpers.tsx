"use client";
import type { ReactNode } from "react";
import type { Customer } from "@/lib/types";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

// ===== Constants =====
export const CUSTOMER_STATUSES = ["Active", "Inactive"] as const;
export const PAYMENT_TERMS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Advance",
  "COD",
] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "AED"] as const;
export const CITIES = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Aurangabad",
  "Delhi", "Gurgaon", "Noida", "Faridabad", "Jaipur",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot",
  "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore",
  "Kolkata", "Bhubaneswar", "Raipur", "Visakhapatnam",
  "Indore", "Bhopal", "Lucknow", "Kanpur", "Patna",
];
export const OUTSTANDING_RANGES = [
  "All",
  "₹0 - ₹50K",
  "₹50K - ₹2L",
  "₹2L - ₹5L",
  "₹5L+",
] as const;

// ===== GSTIN validation =====
export function isValidGSTIN(g: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g);
}
export function gstinValidationMeta(g: string): {
  state: "empty" | "invalid" | "valid";
  hint: string;
} {
  if (!g.trim()) return { state: "empty", hint: "15-character GSTIN" };
  if (g.length < 15) return { state: "invalid", hint: `${g.length}/15 chars` };
  if (isValidGSTIN(g))
    return { state: "valid", hint: "Format valid · state code " + g.slice(0, 2) };
  return { state: "invalid", hint: "Format mismatch" };
}

// ===== Add-customer stepper config =====
export const ADD_CUSTOMER_STEPS = [
  { id: 1, label: "Must Have", tier: "Essentials" },
  { id: 2, label: "Need to Know", tier: "Operational" },
  { id: 3, label: "Good to Have", tier: "Context" },
  { id: 4, label: "Review", tier: "Confirm" },
] as const;

// ===== Customer create form =====
export interface CustomerForm {
  // Must Have
  companyName: string;
  gstin: string;
  billingAddress: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms: string;
  preferredCurrency: string;
  // Need to Know
  deliveryPreferences: string;
  preferredRoutes: string;
  rateCardAssignment: string;
  branchAssociation: string;
  creditLimit: string;
  documentRequirements: string;
  // Good to Have
  socialMedia: string;
  referralSource: string;
  accountManager: string;
  communicationPrefs: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
}

export const EMPTY_CUSTOMER_FORM: CustomerForm = {
  companyName: "",
  gstin: "",
  billingAddress: "",
  contactPerson: "",
  phone: "",
  email: "",
  paymentTerms: "Net 30",
  preferredCurrency: "INR",
  deliveryPreferences: "",
  preferredRoutes: "",
  rateCardAssignment: "",
  branchAssociation: "",
  creditLimit: "",
  documentRequirements: "",
  socialMedia: "",
  referralSource: "",
  accountManager: "",
  communicationPrefs: "Email + SMS",
  secondaryContactName: "",
  secondaryContactPhone: "",
};

// ===== Edit mappers: Customer <-> CustomerForm =====
export function customerToForm(c: Customer): CustomerForm {
  return {
    ...EMPTY_CUSTOMER_FORM,
    companyName: c.companyName,
    gstin: c.gstin,
    contactPerson: c.contactPerson,
    phone: c.phone,
    email: c.email,
    paymentTerms: c.paymentTerms,
    preferredCurrency: "INR",
    creditLimit: c.creditLimit ? String(c.creditLimit) : "",
    accountManager: c.accountManager,
    branchAssociation: "",
    billingAddress: "",
  };
}

export function formToCustomerPatch(form: CustomerForm): Partial<Customer> {
  return {
    companyName: form.companyName,
    gstin: form.gstin,
    contactPerson: form.contactPerson,
    phone: form.phone,
    email: form.email,
    paymentTerms: form.paymentTerms,
    creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
    accountManager: form.accountManager || "Unassigned",
    city: form.branchAssociation
      ? form.branchAssociation.replace(" Branch", "").replace(" HQ", "")
      : undefined,
  };
}

// ===== Reusable bits =====
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}
