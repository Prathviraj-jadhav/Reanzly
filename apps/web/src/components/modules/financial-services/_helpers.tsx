"use client";

import type { ReactNode } from "react";

/* ============================================================
   Financial Services module helpers - formatters + status badge
   mapping. Eligibility math (credit line, working capital sizing,
   fuel card limit, eligible invoice list) now comes from the real
   GET /api/financial-services/eligibility endpoint
   (src/lib/financial-services-engine.ts) instead of being computed
   here from mock-data.ts.
   ============================================================ */

export type FinancingProductType =
  | "Invoice Discounting"
  | "Working Capital Loan"
  | "Fuel Card Credit Line";

export type FinancingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "disbursed"
  | "rejected";

export const FINANCING_PRODUCT_TYPES: FinancingProductType[] = [
  "Invoice Discounting",
  "Working Capital Loan",
  "Fuel Card Credit Line",
];

// Illustrative advance rate against eligible invoice value - mirrored from
// the real server-side computation (src/lib/financial-services-engine.ts)
// purely for display (e.g. "80%" in the drawer's suggested-amount button).
export const ADVANCE_RATE = 0.8;

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export function financingStatusBadge(status: string) {
  return FINANCING_STATUS_META[status as FinancingStatus] ?? { label: status, variant: "outline" as BadgeVariant };
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
