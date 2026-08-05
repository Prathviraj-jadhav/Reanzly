"use client";

import type { ReactNode } from "react";
import type { Invoice } from "@/lib/types";
import { INVOICES, VEHICLES } from "@/lib/mock-data";
import type { FinancingStatus } from "@/lib/store/financial-services-store";

/* ============================================================
   Financial Services module helpers - formatters, eligibility
   math, and status badge mapping. All numbers derived here are
   ILLUSTRATIVE (demo eligibility math against the org's own
   mock invoice book) - nothing here calls a real underwriting
   or payments API.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatINRCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
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

// ===== Invoice financing eligibility (demo math) =====
// Only invoices the customer hasn't fully settled are "financeable" -
// Draft (not yet sent), Paid, Cancelled and Credit Note are excluded.
export const ELIGIBLE_INVOICE_STATUSES: Invoice["status"][] = [
  "Sent",
  "Overdue",
  "Partially Paid",
];

// Illustrative advance rate against eligible invoice value.
export const ADVANCE_RATE = 0.8;

export function isEligibleForFinancing(inv: Invoice): boolean {
  return ELIGIBLE_INVOICE_STATUSES.includes(inv.status);
}

/** Unpaid/overdue/partially-paid invoices, oldest due date first. */
export function eligibleInvoices(): Invoice[] {
  return INVOICES.filter(isEligibleForFinancing).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export function eligibleOutstandingTotal(): number {
  return eligibleInvoices().reduce((s, inv) => s + inv.totalAmount, 0);
}

/** Invoice Discounting eligible amount - ADVANCE_RATE of eligible invoice value. */
export function availableCreditLine(): number {
  return Math.round(eligibleOutstandingTotal() * ADVANCE_RATE);
}

/** Working Capital Loan eligible amount - illustrative multiple of trailing
 *  invoiced revenue (all invoices, paid or not), rounded to a clean figure. */
export function workingCapitalEligible(): number {
  const trailingRevenue = INVOICES.reduce((s, inv) => s + inv.totalAmount, 0);
  return Math.round((trailingRevenue * 0.15) / 5000) * 5000;
}

/** Fuel Card Credit Line eligible amount - illustrative per-vehicle limit
 *  applied across the active fleet. */
const PER_VEHICLE_FUEL_LIMIT = 18000;
export function fuelCardEligible(): number {
  const activeVehicles = VEHICLES.filter((v) => v.status === "Active").length;
  const fleetSize = activeVehicles > 0 ? activeVehicles : VEHICLES.length;
  return Math.round((fleetSize * PER_VEHICLE_FUEL_LIMIT) / 5000) * 5000;
}

export function invoiceById(id: string): Invoice | undefined {
  return INVOICES.find((inv) => inv.id === id);
}

// ===== Status badge mapping =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export const FINANCING_STATUS_META: Record<
  FinancingStatus,
  { label: string; variant: BadgeVariant; pulse?: boolean }
> = {
  draft: { label: "Draft", variant: "muted" },
  submitted: { label: "Submitted", variant: "outline" },
  under_review: { label: "Under Review", variant: "outline", pulse: true },
  approved: { label: "Approved", variant: "outline" },
  disbursed: { label: "Disbursed", variant: "solid" },
  rejected: { label: "Rejected", variant: "muted" },
};

export function financingStatusBadge(status: FinancingStatus) {
  return FINANCING_STATUS_META[status] ?? { label: status, variant: "outline" as BadgeVariant };
}

// ===== Reusable field label (matches the rest of the app's drawers) =====
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
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
