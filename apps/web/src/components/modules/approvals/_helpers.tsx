"use client";

import type { ReactNode } from "react";

/* ============================================================
   Approvals module helpers - shared between list / detail.
   Strict monochrome: no hues, hairline borders, ≤6px radius,
   tabular mono for numerals.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
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
export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ===== Domain constants =====
export const APPROVAL_TYPES = [
  "Expense",
  "Rate Exception",
  "Credit Extension",
  "Vehicle Purchase",
  "Discount",
  "Vendor Onboarding",
  "Leave",
  "Work Order",
] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Delegated",
  "Withdrawn",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_CHAIN_MODES = ["Sequential", "Parallel"] as const;
export type ChainMode = (typeof APPROVAL_CHAIN_MODES)[number];

// ===== Badge variant mappings (strict monochrome) =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function typeBadge(t: ApprovalType): { variant: BadgeVariant } {
  const map: Record<ApprovalType, BadgeVariant> = {
    Expense: "outline",
    "Rate Exception": "outline",
    "Credit Extension": "solid",
    "Vehicle Purchase": "solid",
    Discount: "outline",
    "Vendor Onboarding": "muted",
    Leave: "muted",
    "Work Order": "outline",
  };
  return { variant: map[t] };
}

export function statusBadge(s: ApprovalStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<ApprovalStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    Pending: { variant: "solid", pulse: true },
    Approved: { variant: "outline" },
    Rejected: { variant: "muted" },
    Delegated: { variant: "outline" },
    Withdrawn: { variant: "muted" },
  };
  return map[s] ?? { variant: "outline" };
}

export function approverStateBadge(state: ApproverState): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<ApproverState, { variant: BadgeVariant; pulse?: boolean }> = {
    Pending: { variant: "outline" },
    Approved: { variant: "solid" },
    Rejected: { variant: "muted" },
    Delegated: { variant: "outline" },
    Skipped: { variant: "muted" },
  };
  return map[state] ?? { variant: "outline" };
}

// ===== FieldLabel =====
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

// ===== Domain type =====
export type ApproverState = "Pending" | "Approved" | "Rejected" | "Delegated" | "Skipped";

export interface ApproverStep {
  id: string;
  name: string;
  role: string;
  order: number;
  state: ApproverState;
  decisionAt?: string;
  comment?: string;
  delegatedTo?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  ts: string;
}

export interface ApprovalRequest {
  id: string;
  requestId: string;
  type: ApprovalType;
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  department: string;
  amount: number;
  currency: string;
  currentApprover: string;
  status: ApprovalStatus;
  submittedAt: string;
  decidedAt?: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  chainMode: ChainMode;
  approvers: ApproverStep[];
  history: ApprovalHistoryEntry[];
  relatedRef?: string;
  // Type-specific structured payload
  payload: Record<string, string | number>;
}

