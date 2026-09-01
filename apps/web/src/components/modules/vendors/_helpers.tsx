"use client";
import type { ReactNode } from "react";
import type { Vendor } from "@/lib/types";

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
export const VENDOR_STATUSES = ["Active", "Inactive"] as const;
export const VENDOR_TYPES = [
  "Fuel Supplier",
  "Maintenance Workshop",
  "Spare Parts Supplier",
  "Third-Party Operator",
  "Tyre Supplier",
] as const;
export const PAYMENT_MODES = [
  "UPI",
  "Bank Transfer",
  "Cash",
  "Card",
  "Cheque",
] as const;
export const PAYMENT_TERMS = [
  "Net 15",
  "Net 30",
  "On Delivery",
  "Net 45",
  "Advance",
] as const;
export const CITIES = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Aurangabad",
  "Delhi", "Gurgaon", "Noida", "Faridabad", "Jaipur",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot",
  "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore",
  "Kolkata", "Bhubaneswar", "Raipur", "Visakhapatnam",
  "Indore", "Bhopal", "Lucknow", "Kanpur", "Patna",
];

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

// ===== Vendor type → icon hint =====
export const VENDOR_TYPE_META: Record<
  string,
  { icon: string; tagline: string }
> = {
  "Fuel Supplier": { icon: "Fuel", tagline: "Diesel · CNG · Petroleum" },
  "Maintenance Workshop": { icon: "Wrench", tagline: "Service · Repair · Body" },
  "Spare Parts Supplier": { icon: "Package", tagline: "OEM · Aftermarket" },
  "Third-Party Operator": { icon: "Truck", tagline: "Attached fleet · Brokers" },
  "Tyre Supplier": { icon: "Circle", tagline: "Tyres · Retreads · Wheels" },
};

// ===== Add-vendor stepper config =====
export const ADD_VENDOR_STEPS = [
  { id: 1, label: "Must Have", tier: "Essentials" },
  { id: 2, label: "Need to Know", tier: "Operational" },
  { id: 3, label: "Good to Have", tier: "Context" },
  { id: 4, label: "Review", tier: "Confirm" },
] as const;

// ===== Vendor create form =====
export interface VendorForm {
  // Must Have
  companyName: string;
  gstin: string;
  contactPerson: string;
  phone: string;
  email: string;
  serviceType: string;
  paymentTerms: string;
  // Need to Know
  serviceScope: string;
  rateAgreement: string;
  paymentMode: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  creditTerms: string;
  // Good to Have
  certifications: string;
  serviceHistory: string;
  relationshipManager: string;
  performanceRating: string;
}

export const EMPTY_VENDOR_FORM: VendorForm = {
  companyName: "",
  gstin: "",
  contactPerson: "",
  phone: "",
  email: "",
  serviceType: "Maintenance Workshop",
  paymentTerms: "Net 30",
  serviceScope: "",
  rateAgreement: "",
  paymentMode: "Bank Transfer",
  bankName: "",
  bankAccount: "",
  ifsc: "",
  creditTerms: "",
  certifications: "",
  serviceHistory: "",
  relationshipManager: "",
  performanceRating: "4.0",
};

// ===== Edit mappers: Vendor <-> VendorForm =====
export function vendorToForm(v: Vendor): VendorForm {
  return {
    ...EMPTY_VENDOR_FORM,
    companyName: v.companyName,
    gstin: v.gstin,
    contactPerson: v.contactPerson,
    phone: v.phone,
    email: v.email,
    serviceType: v.type,
    paymentTerms: v.paymentTerms,
    performanceRating: v.rating ? v.rating.toFixed(1) : "4.0",
  };
}

export function formToVendorPatch(form: VendorForm): Partial<Vendor> {
  return {
    companyName: form.companyName,
    gstin: form.gstin,
    contactPerson: form.contactPerson,
    phone: form.phone,
    email: form.email,
    type: form.serviceType as Vendor["type"],
    paymentTerms: form.paymentTerms,
    rating: Number(form.performanceRating) || 0,
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
