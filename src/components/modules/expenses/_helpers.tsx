"use client";
import type { ReactNode } from "react";

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
export function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { month: "short" });
}

// ===== Expense categories (logistics) =====
export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Toll",
  "Maintenance",
  "Driver Allowance",
  "Loading/Unloading",
  "Permit Fee",
  "Repair",
  "PUC",
  "Tyre",
  "Misc",
] as const;

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Card",
  "Fuel Card",
  "Bank Transfer",
  "Cheque",
] as const;

export const EXPENSE_STATUSES = ["Approved", "Pending", "Rejected"] as const;

// ===== Receipt status badge mapping =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";
export function receiptStatusBadge(status: string): { variant: BadgeVariant } {
  if (status === "Attached") return { variant: "outline" };
  return { variant: "muted" };
}

// ===== Add-expense stepper (single-form, simpler) =====
export interface ExpenseForm {
  date: string;
  category: string;
  description: string;
  amount: string;
  paymentMode: string;
  reference: string;
  vehicle: string;
  trip: string;
  notes: string;
  receiptName: string;
  receiptSize: string;
  submittedBy: string;
}

export const EMPTY_EXPENSE_FORM: ExpenseForm = {
  date: new Date().toISOString(),
  category: "Fuel",
  description: "",
  amount: "",
  paymentMode: "Cash",
  reference: "",
  vehicle: "",
  trip: "",
  notes: "",
  receiptName: "",
  receiptSize: "",
  submittedBy: "Reena Mehta",
};

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

// Compute km per litre / per rupee helper
export function costPerKm(cost: number, km: number): number {
  if (!km) return 0;
  return Math.round((cost / km) * 100) / 100;
}
